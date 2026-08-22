// Panel de superadmin para nombrar familias y subfamilias (hoy cargadas con nombre = código).
import { sbFetch } from './api.js';
import { state } from './state.js';
import { toast, esc } from './ui.js';
import { renderFiltroFamilias, renderItems } from './items.js';

export function renderFamiliasPanel() {
  const q = document.getElementById('famBuscar').value.trim().toLowerCase();
  const list = document.getElementById('famPanelList');

  const familias = [...state.familias].sort((a, b) => a.codigo.localeCompare(b.codigo));

  const html = familias.map(f => {
    const subs = state.subfamilias
      .filter(s => s.familia_id === f.id)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    const matchFam = !q || f.codigo.toLowerCase().includes(q) || f.nombre.toLowerCase().includes(q);
    const subsFiltered = q ? subs.filter(s => matchFam || s.codigo.toLowerCase().includes(q) || s.nombre.toLowerCase().includes(q)) : subs;
    if (q && !matchFam && !subsFiltered.length) return '';

    return `
      <div class="fam-block" style="border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-rubro" style="min-width:32px;justify-content:center">${esc(f.codigo)}</span>
          <input type="text" value="${esc(f.nombre)}" placeholder="Nombre de la familia"
            onblur="saveFamiliaNombre('${f.id}', this.value, this)" style="flex:1;font-weight:700;transition:border-color .3s">
        </div>
        ${subsFiltered.length ? `
        <div style="padding-left:16px;margin-top:10px;display:flex;flex-direction:column;gap:8px;border-left:2px solid var(--border)">
          ${subsFiltered.map(s => `
            <div style="display:flex;align-items:center;gap:8px;padding-left:8px">
              <span class="badge" style="min-width:32px;justify-content:center;font-size:11px">${esc(s.codigo)}</span>
              <input type="text" value="${esc(s.nombre)}" placeholder="Nombre de la subfamilia"
                onblur="saveSubfamiliaNombre('${s.id}', this.value, this)" style="flex:1;font-size:13px;transition:border-color .3s">
            </div>`).join('')}
        </div>` : ''}
      </div>`;
  }).join('');

  list.innerHTML = html || '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">Sin resultados</p>';
}

function flashSaved(el) {
  if (!el) return;
  el.style.borderColor = 'var(--success)';
  setTimeout(() => { el.style.borderColor = ''; }, 900);
}

export async function saveFamiliaNombre(id, nombre, el) {
  nombre = nombre.trim();
  if (!nombre) return;
  const fam = state.familias.find(f => f.id === id);
  if (fam && fam.nombre === nombre) return;
  try {
    await sbFetch(`/familias?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
    if (fam) fam.nombre = nombre;
    flashSaved(el);
    renderFiltroFamilias();
    renderItems();
  } catch { toast('Error al guardar el nombre', 'error'); }
}

export async function saveSubfamiliaNombre(id, nombre, el) {
  nombre = nombre.trim();
  if (!nombre) return;
  const sub = state.subfamilias.find(s => s.id === id);
  if (sub && sub.nombre === nombre) return;
  try {
    await sbFetch(`/subfamilias?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
    if (sub) sub.nombre = nombre;
    flashSaved(el);
    renderFiltroFamilias();
    renderItems();
  } catch { toast('Error al guardar el nombre', 'error'); }
}
