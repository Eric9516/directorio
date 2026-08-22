// Lista de retiro: se arma en la misma pantalla de búsqueda mientras el usuario encuentra
// repuestos, y se confirma como un solo registro (retiros + retiro_items).
import { sbFetch } from './api.js';
import { state } from './state.js';
import { toast, esc, closeModal, field } from './ui.js';
import { puedeVerTodosLosRetiros } from './mantenimiento.js';
import { renderSelectSectores } from './sectores.js';

// El carrito se guarda en localStorage para que sobreviva a un refresh de página
// (pasa seguido en mobile) — se borra recién cuando el retiro queda confirmado.
// La clave incluye el id del usuario: en una compu/tablet compartida del depósito,
// si no fuera así, el que entra después heredaría el carrito del anterior sin darse cuenta.
function cartStorageKey() {
  return `retiroCartPendiente_${state.currentUser?.id || 'anon'}`;
}

function guardarCartLocal() {
  try { localStorage.setItem(cartStorageKey(), JSON.stringify(state.retiroCart)); } catch {}
}

// Siempre resetea el carrito (al valor guardado de ESTE usuario, o vacío) — nunca deja
// en memoria lo que haya quedado de una sesión anterior de otra persona en el mismo navegador.
export function restaurarCartLocal() {
  try {
    const raw = localStorage.getItem(cartStorageKey());
    state.retiroCart = raw ? JSON.parse(raw) : [];
  } catch {
    state.retiroCart = [];
  }
}

export function addToRetiroCart(itemId, btnEl) {
  const it = state.items.find(x => x.id === itemId);
  if (!it) return;

  const existing = state.retiroCart.find(c => c.item_id === itemId);
  if (existing) {
    existing.cantidad += 1;
  } else {
    state.retiroCart.push({ item_id: itemId, codigo: it.codigo, descripcion: it.descripcion, cantidad: 1, observacion: '' });
  }
  guardarCartLocal();
  flashAgregado(btnEl);
  renderRetiroCart();
}

function flashAgregado(btnEl) {
  if (!btnEl) return;
  const original = btnEl.innerHTML;
  const originalBg = btnEl.style.background;
  btnEl.innerHTML = '✓ Agregado';
  btnEl.style.background = 'var(--success)';
  btnEl.disabled = true;
  setTimeout(() => {
    btnEl.innerHTML = original;
    btnEl.style.background = originalBg;
    btnEl.disabled = false;
  }, 900);
}

export function updateRetiroCantidad(itemId, value) {
  const line = state.retiroCart.find(c => c.item_id === itemId);
  if (!line) return;
  const n = parseInt(value, 10);
  line.cantidad = n > 0 ? n : 1;
  guardarCartLocal();
}

export function updateRetiroObservacion(itemId, value) {
  const line = state.retiroCart.find(c => c.item_id === itemId);
  if (line) line.observacion = value;
  guardarCartLocal();
}

export function removeFromRetiroCart(itemId) {
  state.retiroCart = state.retiroCart.filter(c => c.item_id !== itemId);
  guardarCartLocal();
  renderRetiroCart();
}

function updateCarritoBadge() {
  ['carritoBadge', 'carritoBadgeMobile'].forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (state.retiroCart.length) {
      badge.textContent = state.retiroCart.length;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  });
}

export function renderRetiroCart() {
  const section = document.getElementById('retiroCartSection');
  if (!section) return;
  updateCarritoBadge();

  if (!state.retiroCart.length) {
    section.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><h3>No tenés nada para retirar todavía</h3><p>Buscá un repuesto y tocá "Retirar", o escaneá su QR.</p></div>';
    return;
  }

  const sectorPrevio = document.getElementById('retiroSector')?.value || '';
  const obsPrevia = document.getElementById('retiroObsGeneral')?.value || '';

  section.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">📤 Ítems a retirar</div>
      <div class="admin-card-body">
        <div id="retiroCartList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px"></div>
        <div class="form-group full" style="margin-bottom:12px">
          <label>Sector *</label>
          <select id="retiroSector"><option value="">Elegir sector...</option></select>
        </div>
        <div class="form-group full" style="margin-bottom:12px">
          <label>Observación general (opcional)</label>
          <input type="text" id="retiroObsGeneral" placeholder="Ej: para reparación de la envasadora">
        </div>
        <button class="btn btn-success" onclick="confirmRetiro()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Revisar y confirmar
        </button>
      </div>
    </div>`;

  document.getElementById('retiroCartList').innerHTML = state.retiroCart.map(c => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface2);border-radius:var(--radius-sm);flex-wrap:wrap">
      <div style="flex:1;min-width:140px">
        <div style="font-weight:700;font-size:13px">${esc(c.codigo)}</div>
        <div style="font-size:12px;color:var(--text-mid)">${esc(c.descripcion)}</div>
      </div>
      <input type="number" min="1" value="${c.cantidad}" style="width:64px" onchange="updateRetiroCantidad('${c.item_id}', this.value)">
      <input type="text" placeholder="Observación..." value="${esc(c.observacion)}" style="width:150px" onchange="updateRetiroObservacion('${c.item_id}', this.value)">
      <button class="btn btn-danger-ghost btn-sm btn-icon" title="Quitar" onclick="removeFromRetiroCart('${c.item_id}')">✕</button>
    </div>`).join('');

  renderSelectSectores(document.getElementById('retiroSector'));
  document.getElementById('retiroSector').value = sectorPrevio;
  document.getElementById('retiroObsGeneral').value = obsPrevia;
}

const historialExpandedDays = new Set([new Date().toISOString().slice(0, 10)]);

export async function loadHistorialRetiros() {
  const box = document.getElementById('historialRetirosList');
  box.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Cargando...</p>';
  try {
    const admin = puedeVerTodosLosRetiros();
    document.getElementById('historialExportActions').style.display = admin ? 'flex' : 'none';
    document.getElementById('historialFiltroUsuarioWrap').style.display = admin ? 'block' : 'none';

    let query = '/retiros?select=*,sectores(nombre),retiro_items(id,cantidad,observacion,items(codigo,descripcion))&order=created_at.desc';
    const fechaFiltro = document.getElementById('historialFecha')?.value;
    if (fechaFiltro) {
      query += `&created_at=gte.${fechaFiltro}T00:00:00&created_at=lte.${fechaFiltro}T23:59:59`;
    } else {
      const desde = new Date();
      desde.setDate(desde.getDate() - 30);
      query += `&created_at=gte.${desde.toISOString()}`;
    }

    state.historialRetiros = await sbFetch(query);
    state.historialAdmin = admin;
    state.historialUsuarios = {};
    if (admin) {
      const perfiles = await sbFetch('/usuarios_perfil?select=id,nombre,apellido,email');
      state.historialUsuarios = Object.fromEntries(perfiles.map(u => [u.id, u]));
      renderFiltroUsuario(perfiles);
    }

    renderHistorialRetiros();
  } catch {
    box.innerHTML = '<p style="color:var(--danger);font-size:13px">Error al cargar el historial.</p>';
  }
}

function groupByDay(retiros) {
  const groups = {};
  for (const r of retiros) {
    const day = r.created_at.slice(0, 10);
    (groups[day] ||= []).push(r);
  }
  return groups;
}

export function toggleHistorialDia(day) {
  if (historialExpandedDays.has(day)) historialExpandedDays.delete(day);
  else historialExpandedDays.add(day);
  renderHistorialRetiros();
}

function renderFiltroUsuario(perfiles) {
  const sel = document.getElementById('historialFiltroUsuario');
  const cur = sel.value;
  const ordenados = [...perfiles].sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email));
  sel.innerHTML = '<option value="">Todos los usuarios</option>' +
    ordenados.map(u => `<option value="${u.id}" ${u.id === cur ? 'selected' : ''}>${esc(`${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email)}</option>`).join('');
}

export function renderHistorialRetiros() {
  const box = document.getElementById('historialRetirosList');
  const { historialUsuarios: usuarios, historialAdmin: admin } = state;
  const filtroUsuario = admin ? document.getElementById('historialFiltroUsuario').value : '';
  const retiros = filtroUsuario
    ? state.historialRetiros.filter(r => r.usuario_id === filtroUsuario)
    : state.historialRetiros;

  if (!retiros.length) {
    box.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>Todavía no hay retiros</h3><p>Los que confirmes van a aparecer acá.</p></div>';
    return;
  }

  const groups = groupByDay(retiros);

  box.innerHTML = Object.entries(groups).map(([day, dayRetiros]) => {
    const itemCount = dayRetiros.reduce((s, r) => s + r.retiro_items.length, 0);
    const isOpen = historialExpandedDays.has(day);
    const fechaLabel = new Date(day + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let rows = '';
    let cards = '';
    dayRetiros.forEach(r => {
      const u = admin ? usuarios[r.usuario_id] : null;
      const usuarioNombre = u ? (`${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email) : '';
      const esHoy = day === new Date().toISOString().slice(0, 10);
      const canEdit = admin || (r.usuario_id === state.currentUser?.id && esHoy);
      const hora = new Date(r.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const sector = r.sectores?.nombre || '—';

      r.retiro_items.forEach(ri => {
        rows += `
        <tr>
          <td>${esc(hora)}</td>
          ${admin ? `<td>${esc(usuarioNombre)}</td>` : ''}
          <td>${esc(sector)}</td>
          <td><strong>${esc(ri.items?.codigo || '?')}</strong></td>
          <td>${esc(ri.items?.descripcion || '')}</td>
          <td>${canEdit
            ? `<input type="number" min="1" value="${ri.cantidad}" style="width:60px" onchange="updateHistorialCantidad('${ri.id}', this.value)">`
            : ri.cantidad}</td>
          <td>${esc(ri.observacion || '') || '—'}</td>
          <td>${canEdit ? `<button class="btn btn-danger-ghost btn-sm btn-icon" title="Eliminar" onclick="deleteHistorialItem('${ri.id}','${r.id}')">✕</button>` : ''}</td>
        </tr>`;

        cards += `
        <div class="prov-card">
          <div class="prov-card-header">
            <div><div class="prov-card-name">${esc(ri.items?.codigo || '?')}</div><div style="font-size:12px;color:var(--text-mid);margin-top:2px">${esc(ri.items?.descripcion || '')}</div></div>
            <span class="badge badge-rubro">x${ri.cantidad}</span>
          </div>
          <div class="prov-card-body">
            <div class="prov-card-row">🕐 ${esc(hora)}${admin ? ' — 👤 ' + esc(usuarioNombre) : ''}</div>
            <div class="prov-card-row">🏭 ${esc(sector)}</div>
            ${ri.observacion ? `<div class="prov-card-row">📝 ${esc(ri.observacion)}</div>` : ''}
          </div>
          ${canEdit ? `<div class="prov-card-actions">
            <input type="number" min="1" value="${ri.cantidad}" style="width:64px" onchange="updateHistorialCantidad('${ri.id}', this.value)">
            <button class="btn btn-danger-ghost btn-sm" onclick="deleteHistorialItem('${ri.id}','${r.id}')">🗑 Eliminar</button>
          </div>` : ''}
        </div>`;
      });
    });

    return `
      <div class="admin-card" style="margin-bottom:10px;padding:0;overflow:hidden">
        <button type="button" onclick="toggleHistorialDia('${day}')" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:0">
          <div class="admin-card-header" style="justify-content:space-between">
            <span>📅 ${esc(fechaLabel)} <span style="font-weight:400;color:var(--text-muted)">(${itemCount} ítem${itemCount !== 1 ? 's' : ''})</span></span>
            <span>${isOpen ? '▲' : '▼'}</span>
          </div>
        </button>
        ${isOpen ? `
        <div class="admin-card-body">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Hora</th>${admin ? '<th>Usuario</th>' : ''}<th>Sector</th><th>Código</th><th>Descripción</th><th>Cant.</th><th>Observación</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div class="prov-cards">${cards}</div>
        </div>` : ''}
      </div>`;
  }).join('');
}

export async function updateHistorialCantidad(retiroItemId, value) {
  const n = parseInt(value, 10);
  if (!(n > 0)) return;
  try {
    await sbFetch(`/retiro_items?id=eq.${retiroItemId}`, { method: 'PATCH', body: JSON.stringify({ cantidad: n }) });
    toast('Cantidad actualizada', 'success');
    await loadHistorialRetiros();
  } catch (e) {
    toast('Error al actualizar: ' + e.message, 'error');
  }
}

export async function deleteHistorialItem(retiroItemId, retiroId) {
  if (!confirm('¿Eliminar este ítem del retiro?')) return;
  try {
    await sbFetch(`/retiro_items?id=eq.${retiroItemId}`, { method: 'DELETE' });
    const restantes = await sbFetch(`/retiro_items?retiro_id=eq.${retiroId}&select=id`);
    if (!restantes.length) {
      await sbFetch(`/retiros?id=eq.${retiroId}`, { method: 'DELETE' });
    }
    toast('Ítem eliminado', 'success');
    await loadHistorialRetiros();
  } catch (e) {
    toast('Error al eliminar: ' + e.message, 'error');
  }
}

// ===== EXPORTAR A EXCEL (admin) =====

function retirosAFilas(retiros, usuarios) {
  const filas = [];
  for (const r of retiros) {
    const u = usuarios[r.usuario_id];
    const usuarioNombre = u ? (`${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email) : r.usuario_id;
    for (const ri of r.retiro_items) {
      filas.push({
        'Fecha': new Date(r.created_at).toLocaleString('es-AR'),
        'Usuario': usuarioNombre,
        'Sector': r.sectores?.nombre || '',
        'Código': ri.items?.codigo || '',
        'Descripción': ri.items?.descripcion || '',
        'Cantidad': ri.cantidad,
        'Observación': ri.observacion || '',
        'Observación general': r.observacion_general || '',
      });
    }
  }
  return filas;
}

function descargarExcelRetiros(filas, nombreArchivo) {
  if (!filas.length) { toast('No hay retiros para exportar', 'error'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(filas);
  ws['!cols'] = Object.keys(filas[0]).map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Retiros');
  XLSX.writeFile(wb, nombreArchivo);
}

export async function exportarRetirosPendientes() {
  try {
    const retiros = await sbFetch('/retiros?select=*,sectores(nombre),retiro_items(cantidad,observacion,items(codigo,descripcion))&exportado=eq.false&order=created_at.asc');
    if (!retiros.length) { toast('No hay retiros pendientes de exportar', 'error'); return; }

    const perfiles = await sbFetch('/usuarios_perfil?select=id,nombre,apellido,email');
    const usuarios = Object.fromEntries(perfiles.map(u => [u.id, u]));

    descargarExcelRetiros(retirosAFilas(retiros, usuarios), `retiros_pendientes_${new Date().toISOString().slice(0, 10)}.xlsx`);

    for (const r of retiros) {
      await sbFetch(`/retiros?id=eq.${r.id}`, { method: 'PATCH', body: JSON.stringify({ exportado: true }) });
    }
    toast(`${retiros.length} retiro(s) exportado(s) y marcados`, 'success');
    await loadHistorialRetiros();
  } catch (e) {
    toast('Error al exportar: ' + e.message, 'error');
  }
}

export function abrirExportarPeriodo() {
  document.getElementById('expPeriodoDesde').value = '';
  document.getElementById('expPeriodoHasta').value = '';
  document.getElementById('modalExportarPeriodo').classList.add('open');
}

export async function exportarRetirosPeriodo() {
  const desde = document.getElementById('expPeriodoDesde').value;
  const hasta = document.getElementById('expPeriodoHasta').value;
  if (!desde || !hasta) { toast('Elegí las dos fechas', 'error'); return; }

  try {
    const retiros = await sbFetch(
      `/retiros?select=*,sectores(nombre),retiro_items(cantidad,observacion,items(codigo,descripcion))&created_at=gte.${desde}T00:00:00&created_at=lte.${hasta}T23:59:59&order=created_at.asc`
    );
    const perfiles = await sbFetch('/usuarios_perfil?select=id,nombre,apellido,email');
    const usuarios = Object.fromEntries(perfiles.map(u => [u.id, u]));

    descargarExcelRetiros(retirosAFilas(retiros, usuarios), `retiros_${desde}_a_${hasta}.xlsx`);
    closeModal('modalExportarPeriodo');
  } catch (e) {
    toast('Error al exportar: ' + e.message, 'error');
  }
}

// Paso 1: valida y muestra el resumen — todavía no guarda nada.
export function confirmRetiro() {
  if (!state.retiroCart.length) return;
  const sectorId = document.getElementById('retiroSector').value;
  if (!sectorId) { toast('Elegí el sector antes de confirmar', 'error'); return; }
  const sector = state.sectores.find(s => s.id === sectorId);
  const observacionGeneral = document.getElementById('retiroObsGeneral').value.trim();

  document.getElementById('resumenRetiroBody').innerHTML = `
    <div class="detail-grid" style="margin-bottom:14px">
      ${field('Sector', sector?.nombre)}
      ${field('Observación general', observacionGeneral)}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${state.retiroCart.map(c => `
        <div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span><strong>${esc(c.codigo)}</strong> — ${esc(c.descripcion)}${c.observacion ? ` <span style="color:var(--text-muted)">(${esc(c.observacion)})</span>` : ''}</span>
          <span style="font-weight:700;white-space:nowrap">x${c.cantidad}</span>
        </div>`).join('')}
    </div>`;

  document.getElementById('modalResumenRetiro').classList.add('open');
}

// Paso 2: recién acá se escribe en la base, solo si el usuario aprueba el resumen.
export async function enviarRetiroFinal() {
  const sectorId = document.getElementById('retiroSector').value;
  const observacionGeneral = document.getElementById('retiroObsGeneral').value.trim();

  try {
    const retiro = await sbFetch('/retiros', {
      method: 'POST',
      body: JSON.stringify({ usuario_id: state.currentUser.id, sector_id: sectorId, observacion_general: observacionGeneral || null }),
    });
    const retiroId = retiro[0].id;

    for (const line of state.retiroCart) {
      await sbFetch('/retiro_items', {
        method: 'POST',
        body: JSON.stringify({
          retiro_id: retiroId,
          item_id: line.item_id,
          cantidad: line.cantidad,
          observacion: line.observacion || null,
        }),
      });
    }

    toast('Retiro confirmado', 'success');
    state.retiroCart = [];
    try { localStorage.removeItem(cartStorageKey()); } catch {}
    closeModal('modalResumenRetiro');
    renderRetiroCart();
  } catch (e) {
    toast('Error al confirmar el retiro: ' + e.message, 'error');
  }
}
