import { sbFetch } from './api.js';
import { state } from './state.js';
import { toast, closeModal, esc, field } from './ui.js';

export async function loadComisionistas() {
  try {
    state.comisionistas = await sbFetch('/comisionistas?select=*&order=nombre.asc');
  } catch { state.comisionistas = []; }
  renderStatsComisionistas();
  renderComisionistas();
}

export function renderStatsComisionistas() {
  const activos = state.comisionistas.filter(c => c.activo).length;
  const zonas   = new Set(state.comisionistas.map(c => c.zona).filter(Boolean)).size;
  document.getElementById('statsRowCom').innerHTML = `
    <div class="stat-card"><div class="stat-icon blue">🤝</div><div><div class="stat-number">${state.comisionistas.length}</div><div class="stat-label">Total</div></div></div>
    <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-number">${activos}</div><div class="stat-label">Activos</div></div></div>
    <div class="stat-card"><div class="stat-icon red">📍</div><div><div class="stat-number">${zonas}</div><div class="stat-label">Zonas</div></div></div>`;
}

export function renderComisionistas() {
  const q      = document.getElementById('searchCom').value.toLowerCase();
  const zona   = document.getElementById('filterZona').value;
  const estado = document.getElementById('filterEstadoCom').value;

  const zonas = [...new Set(state.comisionistas.map(c => c.zona).filter(Boolean))].sort();
  const sel = document.getElementById('filterZona');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas las zonas</option>' + zonas.map(z => `<option value="${esc(z)}" ${z === cur ? 'selected' : ''}>${esc(z)}</option>`).join('');

  const filtered = state.comisionistas.filter(c => {
    const matchQ = !q      || [c.nombre, c.zona, c.localidad, c.provincia, c.empresa, c.email].some(v => v && v.toLowerCase().includes(q));
    const matchZ = !zona   || c.zona === zona;
    const matchE = !estado || (estado === 'activo' ? c.activo : !c.activo);
    return matchQ && matchZ && matchE;
  });

  const emptyMsg = `<div class="empty-state"><div class="empty-icon">🤝</div><h3>${state.comisionistas.length === 0 ? 'Sin comisionistas aún' : 'Sin resultados'}</h3><p>${state.comisionistas.length === 0 ? 'Agregá el primer comisionista.' : 'Probá con otro filtro.'}</p></div>`;
  const tbody = document.getElementById('comTableBody');

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyMsg}</td></tr>`;
    const cards = document.getElementById('comCards');
    if (cards) cards.innerHTML = emptyMsg;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const fecha = c.updated_at ? new Date(c.updated_at).toLocaleDateString('es-AR') : '—';
    return `<tr>
      <td><div class="provider-name">${esc(c.nombre)}</div>${c.empresa ? `<div style="font-size:11px;color:var(--text-muted)">${esc(c.empresa)}</div>` : ''}</td>
      <td>${c.zona ? `<span class="badge badge-rubro">${esc(c.zona)}</span>` : '—'}</td>
      <td>${[c.localidad, c.provincia].filter(Boolean).map(esc).join(', ') || '—'}</td>
      <td>
        ${c.telefono ? `<div style="font-size:12px">📞 ${esc(c.telefono)}</div>` : ''}
        ${c.celular  ? `<div style="font-size:12px">📱 ${esc(c.celular)}</div>`  : ''}
        ${!c.telefono && !c.celular ? '<span style="color:var(--text-muted);font-size:12px">—</span>' : ''}
      </td>
      <td><span class="badge ${c.activo ? 'badge-active' : 'badge-inactive'}">${c.activo ? '● Activo' : '○ Inactivo'}</span></td>
      <td><div style="font-size:12px">${fecha}</div><div class="meta-info">por ${esc(c.modificado_por || '—')}</div></td>
      <td><div class="td-actions">
        <button class="btn btn-ghost btn-sm btn-icon" title="Ver"    onclick="openDetailCom('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="openComModal('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn btn-danger-ghost btn-sm btn-icon" title="Eliminar" onclick="deleteCom('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
      </div></td>
    </tr>`;
  }).join('');

  const cards = document.getElementById('comCards');
  if (cards) {
    cards.innerHTML = filtered.map(c => `
      <div class="prov-card">
        <div class="prov-card-header">
          <div><div class="prov-card-name">${esc(c.nombre)}</div>${c.zona ? `<span class="badge badge-rubro" style="margin-top:4px;display:inline-flex">${esc(c.zona)}</span>` : ''}</div>
          <span class="badge ${c.activo ? 'badge-active' : 'badge-inactive'}">${c.activo ? '● Activo' : '○ Inactivo'}</span>
        </div>
        <div class="prov-card-body">
          ${c.empresa  ? `<div class="prov-card-row">🏢 ${esc(c.empresa)}</div>`  : ''}
          ${[c.localidad, c.provincia].filter(Boolean).length ? `<div class="prov-card-row">📍 ${[c.localidad, c.provincia].filter(Boolean).map(esc).join(', ')}</div>` : ''}
          ${c.telefono ? `<div class="prov-card-row">📞 ${esc(c.telefono)}</div>` : ''}
          ${c.celular  ? `<div class="prov-card-row">📱 ${esc(c.celular)}</div>`  : ''}
        </div>
        <div class="prov-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="openDetailCom('${c.id}')">👁 Ver</button>
          <button class="btn btn-ghost btn-sm" onclick="openComModal('${c.id}')">✏️ Editar</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteCom('${c.id}')">🗑</button>
        </div>
      </div>`).join('');
  }
}

export function openComModal(id = null) {
  state.editingComId = id;
  const fields = ['nombre', 'zona', 'empresa', 'telefono', 'celular', 'email', 'localidad', 'provincia', 'notas', 'activo'];

  if (id) {
    const c = state.comisionistas.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modalComTitle').textContent = 'Editar Comisionista';
    fields.forEach(f => {
      const el = document.getElementById('com_' + f);
      if (!el) return;
      el.value = f === 'activo' ? String(c[f] !== false) : (c[f] || '');
    });
    renderCamposCustomInForm(c.campos_extra || {});
  } else {
    document.getElementById('modalComTitle').textContent = 'Nuevo Comisionista';
    fields.forEach(f => { const el = document.getElementById('com_' + f); if (el) el.value = f === 'activo' ? 'true' : ''; });
    renderCamposCustomInForm({});
  }

  document.getElementById('modalCom').classList.add('open');
}

export function renderCamposCustomInForm(extraData = {}) {
  const grid = document.getElementById('comFormGrid');
  grid.querySelectorAll('.campo-custom-dinamico').forEach(el => el.remove());
  if (!state.camposCustom.length) return;

  state.camposCustom.forEach(campo => {
    const val = extraData[campo.id] || '';
    const div = document.createElement('div');
    div.className = 'form-group full campo-custom-dinamico';
    const inputHtml = campo.tipo === 'textarea'
      ? `<textarea id="cex_${campo.id}" placeholder="${esc(campo.label)}">${esc(val)}</textarea>`
      : `<input type="${campo.tipo}" id="cex_${campo.id}" value="${esc(val)}" placeholder="${esc(campo.label)}">`;
    div.innerHTML = `<label>${esc(campo.label)}</label>${inputHtml}`;
    grid.appendChild(div);
  });
}

export async function saveComisionista() {
  const nombre = document.getElementById('com_nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  const userNombre = state.currentUser?.nombre || state.currentUser?.email || 'Usuario';
  const campos_extra = {};
  state.camposCustom.forEach(campo => {
    const el = document.getElementById(`cex_${campo.id}`);
    if (el) campos_extra[campo.id] = el.value.trim();
  });

  const body = {
    nombre,
    zona:          document.getElementById('com_zona').value.trim(),
    empresa:       document.getElementById('com_empresa').value.trim(),
    telefono:      document.getElementById('com_telefono').value.trim(),
    celular:       document.getElementById('com_celular').value.trim(),
    email:         document.getElementById('com_email').value.trim(),
    localidad:     document.getElementById('com_localidad').value.trim(),
    provincia:     document.getElementById('com_provincia').value.trim(),
    notas:         document.getElementById('com_notas').value.trim(),
    activo:        document.getElementById('com_activo').value === 'true',
    campos_extra,
    modificado_por: userNombre,
    updated_at:    new Date().toISOString()
  };

  try {
    if (state.editingComId) {
      await sbFetch(`/comisionistas?id=eq.${state.editingComId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Comisionista actualizado', 'success');
    } else {
      await sbFetch('/comisionistas', { method: 'POST', body: JSON.stringify(body) });
      toast('Comisionista agregado', 'success');
    }
    closeModal('modalCom');
    await loadComisionistas();
  } catch (e) { toast('Error al guardar: ' + e.message, 'error'); }
}

export async function deleteCom(id) {
  const c = state.comisionistas.find(x => x.id === id);
  if (!confirm(`¿Eliminar a "${c?.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await sbFetch(`/comisionistas?id=eq.${id}`, { method: 'DELETE' });
    toast('Comisionista eliminado', 'error');
    await loadComisionistas();
  } catch { toast('Error al eliminar', 'error'); }
}

export function openDetailCom(id) {
  const c = state.comisionistas.find(x => x.id === id);
  if (!c) return;
  document.getElementById('detailComTitle').textContent = c.nombre;
  document.getElementById('detailComEditBtn').onclick = () => { closeModal('modalDetailCom'); openComModal(id); };

  const fecha = c.updated_at ? new Date(c.updated_at).toLocaleDateString('es-AR') : '—';
  let camposExtraHtml = '';
  if (state.camposCustom.length && c.campos_extra) {
    const conValor = state.camposCustom.filter(campo => c.campos_extra[campo.id]);
    if (conValor.length) {
      camposExtraHtml = `<div class="divider"></div><div style="font-weight:700;color:var(--blue);margin-bottom:12px">📋 Información adicional</div><div class="detail-grid">${conValor.map(campo => field(campo.label, c.campos_extra[campo.id])).join('')}</div>`;
    }
  }

  document.getElementById('detailComBody').innerHTML = `
    <div class="detail-grid">
      ${field('Zona / Región', c.zona)}
      ${field('Empresa', c.empresa)}
      ${field('Localidad', [c.localidad, c.provincia].filter(Boolean).join(', '))}
      ${field('Teléfono', c.telefono)}
      ${field('Celular / WhatsApp', c.celular)}
      ${field('Email', c.email)}
      ${field('Estado', c.activo ? '✅ Activo' : '⬜ Inactivo')}
      ${field('Última modificación', fecha + (c.modificado_por ? ` por ${c.modificado_por}` : ''))}
    </div>
    ${c.notas ? `<div class="detail-section"><label style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted)">Notas</label><p style="margin-top:4px;font-size:14px;color:var(--text-mid)">${esc(c.notas)}</p></div>` : ''}
    ${camposExtraHtml}`;

  document.getElementById('modalDetailCom').classList.add('open');
}

export function exportExcelCom() {
  if (!state.comisionistas.length) { toast('Sin datos para exportar', 'error'); return; }
  const rows = state.comisionistas.map(c => {
    const base = {
      'Nombre': c.nombre, 'Zona': c.zona || '', 'Empresa': c.empresa || '',
      'Teléfono': c.telefono || '', 'Celular': c.celular || '', 'Email': c.email || '',
      'Localidad': c.localidad || '', 'Provincia': c.provincia || '',
      'Estado': c.activo ? 'Activo' : 'Inactivo', 'Notas': c.notas || '',
      'Última modificación': c.updated_at ? new Date(c.updated_at).toLocaleDateString('es-AR') : '',
      'Modificado por': c.modificado_por || ''
    };
    state.camposCustom.forEach(campo => { base[campo.label] = c.campos_extra?.[campo.id] || ''; });
    return base;
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Comisionistas');
  XLSX.writeFile(wb, `comisionistas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast('Excel exportado', 'success');
}
