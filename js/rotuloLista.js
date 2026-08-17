// Pantalla "Envíos": listado de todos los rótulos generados, su historial de versiones y sus bultos.
import { sbFetch, sbStorageDelete, SUPABASE_URL } from './api.js';
import { state }             from './state.js';
import { toast, esc }        from './ui.js';
import { loadComisionistas } from './comisionistas.js';

let rotulosScreenCache = [];
let usuariosCache = [];

export async function loadRotulosScreen() {
  const sel = document.getElementById('rotFiltroProveedor');
  if (sel && sel.options.length <= 1) {
    const provs = [...state.proveedores].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    sel.innerHTML = '<option value="">Todos los proveedores</option>' +
      provs.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
  }
  if (!state.comisionistas.length) await loadComisionistas();
  const selCom = document.getElementById('rotFiltroComisionista');
  if (selCom && selCom.options.length <= 2) {
    const coms = [...state.comisionistas].sort((a, b) => (a.empresa || a.nombre || '').localeCompare(b.empresa || b.nombre || ''));
    selCom.innerHTML = '<option value="">Todos los comisionistas</option><option value="sin_comisionista">Sin comisionista</option>' +
      coms.map(c => `<option value="${c.id}">${esc(c.empresa || c.nombre)}</option>`).join('');
  }
  if (!usuariosCache.length) {
    try { usuariosCache = await sbFetch('/usuarios_perfil?select=id,nombre,apellido'); } catch { usuariosCache = []; }
  }
  const tbody = document.getElementById('rotulosTableBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Cargando...</td></tr>';
  try {
    rotulosScreenCache = await sbFetch('/rotulos_generados?vigente=eq.true&select=*&order=created_at.desc&limit=300');
    renderRotulosScreen();
  } catch {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger)">Error al cargar los rótulos.</td></tr>';
  }
}

export function renderRotulosScreen() {
  const tbody = document.getElementById('rotulosTableBody');
  const cards = document.getElementById('rotulosCards');
  if (!tbody) return;

  const numDoc  = document.getElementById('rotSearchNumDoc')?.value.trim().toLowerCase() || '';
  const provId  = document.getElementById('rotFiltroProveedor')?.value || '';
  const comId   = document.getElementById('rotFiltroComisionista')?.value || '';
  const tipoDoc = document.getElementById('rotFiltroTipoDoc')?.value || '';
  const desde   = document.getElementById('rotFiltroDesde')?.value || '';
  const hasta   = document.getElementById('rotFiltroHasta')?.value || '';

  const filtered = rotulosScreenCache.filter(r => {
    const matchNum   = !numDoc  || (r.numero_documento || '').toLowerCase().includes(numDoc);
    const matchProv  = !provId  || r.proveedor_id === provId;
    const matchCom   = !comId   || (comId === 'sin_comisionista' ? !r.comisionista_id : r.comisionista_id === comId);
    const matchTipo  = !tipoDoc || r.tipo_documento === tipoDoc;
    const fecha      = r.created_at.slice(0, 10);
    const matchDesde = !desde || fecha >= desde;
    const matchHasta = !hasta || fecha <= hasta;
    return matchNum && matchProv && matchCom && matchTipo && matchDesde && matchHasta;
  });

  if (!filtered.length) {
    const emptyMsg = '<div class="empty-state"><div class="empty-icon">📦</div><h3>Sin envíos</h3><p>No hay envíos que coincidan con el filtro.</p></div>';
    tbody.innerHTML = `<tr><td colspan="8">${emptyMsg}</td></tr>`;
    if (cards) cards.innerHTML = emptyMsg;
    return;
  }

  const rowsData = filtered.map(r => {
    const prov  = state.proveedores.find(p => p.id === r.proveedor_id);
    const com   = state.comisionistas.find(c => c.id === r.comisionista_id);
    const autor = usuariosCache.find(u => u.id === r.creado_por);
    const fecha = new Date(r.created_at).toLocaleDateString('es-AR');
    const doc   = r.tipo_documento ? `${r.tipo_documento === 'remito' ? 'Remito' : 'Nota de despacho'} ${r.numero_documento || ''}`.trim() : '—';
    const bulto = r.bulto_total > 1 ? `${r.bulto_total} bultos` : '1 bulto';
    const verBtn = r.bulto_total > 1
      ? `<button class="btn btn-ghost btn-sm" onclick="abrirBultosRotulo('${r.id}')">👁 Ver (${r.bulto_total})</button>`
      : `<a class="btn btn-ghost btn-sm" href="${SUPABASE_URL}/storage/v1/object/public/rotulos/${r.storage_path}" target="_blank" rel="noopener">👁 Ver</a>`;
    const adminBtns = state.isAdmin ? `
      ${r.version > 1 ? `<button class="btn btn-ghost btn-sm btn-icon" title="Historial de versiones" onclick="verVersionesRotulo('${r.grupo_id}')">🕘</button>` : ''}
      <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="editRotuloGuardado('${r.id}')">✏️</button>
      <button class="btn btn-ghost btn-sm btn-icon" title="Eliminar" onclick="deleteRotuloGuardado('${r.grupo_id}')">🗑️</button>` : '';
    return { r, prov, com, autor, fecha, doc, bulto, verBtn, adminBtns };
  });

  tbody.innerHTML = rowsData.map(({ r, prov, com, autor, fecha, doc, bulto, verBtn, adminBtns }) => `<tr>
      <td>${esc(prov?.nombre || '(proveedor eliminado)')}</td>
      <td>${com ? esc(com.empresa || com.nombre) : '—'}</td>
      <td>${esc(doc)}${r.version > 1 ? ` <span class="badge badge-rubro">v${r.version}</span>` : ''}</td>
      <td>${esc(bulto)}</td>
      <td>${r.version}</td>
      <td>${fecha}</td>
      <td>${autor ? esc(`${autor.nombre || ''} ${autor.apellido || ''}`.trim()) : '—'}</td>
      <td><div class="td-actions">
        ${verBtn}
        <button class="btn btn-ghost btn-sm btn-icon" title="Fotos del envío" onclick="abrirFotosRotulo('${r.grupo_id}','${r.proveedor_id}')">📷</button>
        ${adminBtns}
      </div></td>
    </tr>`).join('');

  if (cards) {
    cards.innerHTML = rowsData.map(({ r, prov, com, autor, fecha, doc, bulto, verBtn, adminBtns }) => `<div class="prov-card">
      <div class="prov-card-header">
        <div><div class="prov-card-name">${esc(prov?.nombre || '(proveedor eliminado)')}</div>${r.version > 1 ? `<span class="badge badge-rubro" style="margin-top:4px;display:inline-flex">v${r.version}</span>` : ''}</div>
        <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${fecha}</span>
      </div>
      <div class="prov-card-body">
        <div class="prov-card-row">📄 ${esc(doc)}</div>
        <div class="prov-card-row">📦 ${esc(bulto)}</div>
        ${com ? `<div class="prov-card-row">🤝 ${esc(com.empresa || com.nombre)}</div>` : ''}
        ${autor ? `<div class="prov-card-row">👤 ${esc(`${autor.nombre || ''} ${autor.apellido || ''}`.trim())}</div>` : ''}
      </div>
      <div class="prov-card-actions">
        ${verBtn}
        <button class="btn btn-ghost btn-sm" onclick="abrirFotosRotulo('${r.grupo_id}','${r.proveedor_id}')">📷 Fotos</button>
        ${state.isAdmin ? `
        ${r.version > 1 ? `<button class="btn btn-ghost btn-sm" onclick="verVersionesRotulo('${r.grupo_id}')">🕘 Historial</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="editRotuloGuardado('${r.id}')">✏️ Editar</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="deleteRotuloGuardado('${r.grupo_id}')">🗑 Borrar</button>` : ''}
      </div>
    </div>`).join('');
  }
}

// ===== HISTORIAL DE VERSIONES =====
export async function verVersionesRotulo(grupoId) {
  const listEl = document.getElementById('rotuloVersionesList');
  listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Cargando...</div>';
  document.getElementById('modalRotuloVersiones').classList.add('open');
  try {
    const rows = await sbFetch(`/rotulos_generados?grupo_id=eq.${grupoId}&select=*&order=version.desc`);
    listEl.innerHTML = rows.map(r => {
      const fecha = new Date(r.created_at).toLocaleString('es-AR');
      return `<div style="border:1.5px solid var(--border);border-radius:8px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong style="font-size:13px;color:var(--blue)">Versión ${r.version}${r.vigente ? ' (actual)' : ''}</strong>
          <button type="button" class="btn btn-ghost btn-sm" onclick="abrirBultosRotulo('${r.id}')">📦 Ver bultos</button>
        </div>
        <div style="font-size:11px;color:var(--text-muted)">${esc(fecha)}</div>
        ${r.motivo_edicion ? `<div style="font-size:12px;color:var(--text);margin-top:4px"><strong>Motivo:</strong> ${esc(r.motivo_edicion)}</div>` : ''}
      </div>`;
    }).join('') || '<div style="font-size:12px;color:var(--text-muted)">Sin versiones.</div>';
  } catch {
    listEl.innerHTML = '<div style="font-size:12px;color:var(--danger)">Error al cargar el historial de versiones.</div>';
  }
}

// ===== VER BULTOS DE UN RÓTULO (una versión puntual) =====
export async function abrirBultosRotulo(rotuloId) {
  const listEl = document.getElementById('rotuloBultosList');
  listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Cargando...</div>';
  document.getElementById('modalRotuloBultos').classList.add('open');
  try {
    const bultos = await sbFetch(`/rotulos_bultos?rotulo_id=eq.${rotuloId}&select=*&order=numero.asc`);
    listEl.innerHTML = bultos.map(b => {
      const url = `${SUPABASE_URL}/storage/v1/object/public/rotulos/${b.storage_path}`;
      return `<div style="border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="min-width:0">
          <strong style="font-size:13px;color:var(--blue)">Bulto ${b.numero}/${bultos.length}</strong>
          ${b.detalle ? `<div style="font-size:12px;color:var(--text-mid);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(b.detalle)}</div>` : ''}
        </div>
        <a class="btn btn-ghost btn-sm" href="${url}" target="_blank" rel="noopener" style="white-space:nowrap">Ver PDF</a>
      </div>`;
    }).join('') || '<div style="font-size:12px;color:var(--text-muted)">Sin bultos.</div>';
  } catch {
    listEl.innerHTML = '<div style="font-size:12px;color:var(--danger)">Error al cargar los bultos.</div>';
  }
}

export async function deleteRotuloGuardado(grupoId) {
  if (!confirm('¿Eliminar este envío y todo su historial de versiones? Esta acción no se puede deshacer.')) return;
  try {
    const versiones   = await sbFetch(`/rotulos_generados?grupo_id=eq.${grupoId}&select=id`);
    const versionIds  = versiones.map(v => v.id);
    const bultos      = versionIds.length
      ? await sbFetch(`/rotulos_bultos?rotulo_id=in.(${versionIds.join(',')})&select=storage_path`)
      : [];
    await sbFetch(`/rotulos_generados?grupo_id=eq.${grupoId}`, { method: 'DELETE' });
    await Promise.all(bultos.map(b => sbStorageDelete(b.storage_path).catch(() => {})));
    toast('Envío eliminado', 'error');
    if (document.getElementById('paneRotulos')?.style.display !== 'none') loadRotulosScreen();
  } catch {
    toast('Error al eliminar', 'error');
  }
}
