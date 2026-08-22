// Sectores de destino del retiro (Producción, Envasado, etc.) — carga para el desplegable
// del retiro, y panel de admin para darlos de alta/editarlos/desactivarlos.
import { sbFetch } from './api.js';
import { state } from './state.js';
import { toast, esc } from './ui.js';

export async function loadSectores() {
  try {
    state.sectores = await sbFetch('/sectores?select=*&order=nombre.asc');
  } catch {
    state.sectores = [];
  }
}

export function renderSelectSectores(selectEl) {
  if (!selectEl) return;
  const activos = state.sectores.filter(s => s.activo);
  selectEl.innerHTML = '<option value="">Elegir sector...</option>' +
    activos.map(s => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('');
}

export async function addSector() {
  const input = document.getElementById('nuevoSectorNombre');
  const nombre = input.value.trim();
  if (!nombre) return;
  if (state.sectores.some(s => s.nombre.toLowerCase() === nombre.toLowerCase())) {
    toast('Ya existe un sector con ese nombre', 'error'); return;
  }
  try {
    const res = await sbFetch('/sectores', { method: 'POST', body: JSON.stringify({ nombre }) });
    state.sectores.push(res[0]);
    state.sectores.sort((a, b) => a.nombre.localeCompare(b.nombre));
    input.value = '';
    renderSectoresPanel();
    toast('Sector agregado', 'success');
  } catch (e) { toast('Error al agregar: ' + e.message, 'error'); }
}

export async function saveSectorNombre(id, nombre, el) {
  nombre = nombre.trim();
  if (!nombre) return;
  const s = state.sectores.find(x => x.id === id);
  if (s && s.nombre === nombre) return;
  try {
    await sbFetch(`/sectores?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
    if (s) s.nombre = nombre;
    if (el) { el.style.borderColor = 'var(--success)'; setTimeout(() => { el.style.borderColor = ''; }, 900); }
  } catch { toast('Error al guardar el nombre', 'error'); }
}

export async function toggleSectorActivo(id, activoActual) {
  try {
    await sbFetch(`/sectores?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ activo: !activoActual }) });
    const s = state.sectores.find(x => x.id === id);
    if (s) s.activo = !activoActual;
    renderSectoresPanel();
  } catch { toast('Error al actualizar el sector', 'error'); }
}

export function renderSectoresPanel() {
  const list = document.getElementById('sectoresPanelList');
  if (!list) return;
  if (!state.sectores.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Todavía no hay sectores cargados.</p>';
    return;
  }
  list.innerHTML = state.sectores.map(s => `
    <div style="display:flex;align-items:center;gap:8px">
      <input type="text" value="${esc(s.nombre)}" style="flex:1;transition:border-color .3s" onblur="saveSectorNombre('${s.id}', this.value, this)">
      <button class="btn ${s.activo ? 'btn-danger-ghost' : 'btn-success'} btn-sm" onclick="toggleSectorActivo('${s.id}', ${s.activo})">
        ${s.activo ? 'Desactivar' : 'Activar'}
      </button>
    </div>`).join('');
}
