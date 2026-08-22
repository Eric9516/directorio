// Catálogo de repuestos: carga, búsqueda y alta/edición (familia/subfamilia, foto).
import { sbFetch, sbStorageUpload, sbStorageDelete } from './api.js';
import { state } from './state.js';
import { toast, esc, closeModal, field } from './ui.js';
import { isMantenimientoAdmin } from './mantenimiento.js';
import { renderRetiroCart } from './retiros.js';
import { loadSectores } from './sectores.js';
import { descargarQRItem } from './qrLabels.js';

export function descargarQRDeItem(id) {
  const it = state.items.find(x => x.id === id);
  if (it) descargarQRItem(it);
}

export async function loadItems() {
  try {
    state.items = await sbFetch('/items?select=*,familias(id,codigo,nombre),subfamilias(id,codigo,nombre)&activo=eq.true&order=codigo.asc');
    state.familias = await sbFetch('/familias?select=*&order=nombre.asc');
    state.subfamilias = await sbFetch('/subfamilias?select=*&order=nombre.asc');
    await loadSectores();
    renderFiltroFamilias();
    renderItems();
    renderRetiroCart();
  } catch {
    toast('Error al cargar el catálogo de repuestos', 'error');
  }
}

export function renderFiltroFamilias() {
  const sel = document.getElementById('mantFiltroFamilia');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas las familias</option>' +
    state.familias.map(f => `<option value="${f.id}" ${f.id === cur ? 'selected' : ''}>${esc(f.nombre)} (${esc(f.codigo)})</option>`).join('');
  onFamiliaFiltroChange(true);
}

export function onFamiliaFiltroChange(skipRender = false) {
  const familiaId = document.getElementById('mantFiltroFamilia').value;
  const sel = document.getElementById('mantFiltroSubfamilia');
  const cur = sel.value;
  const subs = state.subfamilias.filter(s => !familiaId || s.familia_id === familiaId);
  const stillValid = subs.some(s => s.id === cur);
  sel.innerHTML = '<option value="">Todas las subfamilias</option>' +
    subs.map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${esc(s.nombre)} (${esc(s.codigo)})</option>`).join('');
  if (!stillValid) sel.value = '';
  if (!skipRender) renderItems();
}

export function renderItems() {
  const q             = document.getElementById('mantSearch').value.trim().toLowerCase();
  const familiaId     = document.getElementById('mantFiltroFamilia').value;
  const subfamiliaId  = document.getElementById('mantFiltroSubfamilia').value;
  const admin         = isMantenimientoAdmin();

  const filtered = state.items.filter(it => {
    const matchQ = !q || [it.codigo, it.numero, it.descripcion].some(v => v && v.toLowerCase().includes(q));
    const matchFamilia = !familiaId || it.familia_id === familiaId;
    const matchSubfamilia = !subfamiliaId || it.subfamilia_id === subfamiliaId;
    return matchQ && matchFamilia && matchSubfamilia;
  });

  document.getElementById('mantItemsHeadRow').innerHTML =
    '<th>Código</th><th>Descripción</th><th></th>';

  const emptyMsg = `<div class="empty-state"><div class="empty-icon">🔧</div><h3>${state.items.length === 0 ? 'Todavía no hay repuestos cargados' : 'Sin resultados'}</h3><p>${state.items.length === 0 ? 'Cargá el primer repuesto del depósito.' : 'Probá con otro código, número o filtro.'}</p></div>`;
  const tbody = document.getElementById('mantItemsTableBody');
  const cards = document.getElementById('mantItemsCards');

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="3">${emptyMsg}</td></tr>`;
    if (cards) cards.innerHTML = emptyMsg;
    return;
  }

  tbody.innerHTML = filtered.map(it => `
    <tr>
      <td onclick="openItemDetalle('${it.id}')" style="cursor:pointer"><strong>${esc(it.codigo)}</strong></td>
      <td onclick="openItemDetalle('${it.id}')" style="cursor:pointer">${esc(it.descripcion)}</td>
      <td><div class="td-actions" style="flex-wrap:nowrap">
        <button class="btn btn-primary btn-sm" title="Retirar" onclick="addToRetiroCart('${it.id}',this)">📤 Retirar</button>
        ${admin ? `<button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="openItemModal('${it.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn btn-danger-ghost btn-sm btn-icon" title="Eliminar" onclick="deleteItem('${it.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>` : ''}
      </div></td>
    </tr>`).join('');

  if (cards) {
    cards.innerHTML = filtered.map(it => `
      <div class="prov-card">
        <div class="prov-card-header" onclick="openItemDetalle('${it.id}')" style="cursor:pointer">
          <div><div class="prov-card-name">${esc(it.codigo)}</div><div style="font-size:12px;color:var(--text-mid);margin-top:2px">${esc(it.descripcion)}</div></div>
        </div>
        <div class="prov-card-actions">
          <button class="btn btn-primary btn-sm" onclick="addToRetiroCart('${it.id}',this)">📤 Retirar</button>
          ${admin ? `<button class="btn btn-ghost btn-sm" onclick="openItemModal('${it.id}')">✏️ Editar</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteItem('${it.id}')">🗑</button>` : ''}
        </div>
      </div>`).join('');
  }
}

// ===== DETALLE (click en un ítem) =====

export function openItemDetalle(id) {
  const it = state.items.find(x => x.id === id);
  if (!it) return;

  document.getElementById('itemDetalleTitle').textContent = it.codigo;
  document.getElementById('itemDetalleBody').innerHTML = renderItemDetalleBody(it);

  const editBtn = document.getElementById('itemDetalleEditBtn');
  if (isMantenimientoAdmin()) {
    editBtn.style.display = 'flex';
    editBtn.onclick = () => { closeModal('modalItemDetalle'); openItemModal(id); };
  } else {
    editBtn.style.display = 'none';
  }

  document.getElementById('modalItemDetalle').classList.add('open');
}

function renderItemDetalleBody(it) {
  const admin = isMantenimientoAdmin();
  const fotoHtml = it.foto_url
    ? `<img src="${it.foto_url}" style="width:100%;max-width:220px;border-radius:var(--radius-sm);border:1.5px solid var(--border);object-fit:cover;aspect-ratio:1" alt="">`
    : `<div style="width:100%;max-width:220px;aspect-ratio:1;border-radius:var(--radius-sm);border:1.5px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px">Sin foto</div>`;

  return `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
      <div style="width:100%;max-width:220px">
        ${fotoHtml}
        ${admin ? `
        <div style="display:flex;gap:6px;margin-top:8px">
          <button type="button" class="btn btn-ghost btn-sm" style="flex:1;justify-content:center" onclick="document.getElementById('itemDetalleFotoInput').click()">📷 ${it.foto_url ? 'Cambiar' : 'Subir'}</button>
          ${it.foto_url ? `<button type="button" class="btn btn-danger-ghost btn-sm btn-icon" title="Eliminar foto" onclick="eliminarFotoDetalle('${it.id}')">🗑</button>` : ''}
        </div>
        <input type="file" id="itemDetalleFotoInput" accept="image/*" onchange="subirFotoDetalle('${it.id}', event)">
        <button type="button" class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:6px" onclick="descargarQRDeItem('${it.id}')">📥 Descargar QR</button>
        ` : ''}
      </div>
      <div style="flex:1;min-width:200px" class="detail-grid">
        ${field('Código', it.codigo)}
        ${field('Familia', it.familias?.nombre)}
        ${field('Subfamilia', it.subfamilias?.nombre)}
        ${field('Ubicación', it.ubicacion)}
        ${field('Stock', it.stock != null ? String(it.stock) : null)}
      </div>
    </div>
    <div class="detail-section">
      <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted)">Descripción</label>
      <p style="margin-top:4px;font-size:14px;color:var(--text-mid)">${esc(it.descripcion)}</p>
    </div>`;
}

export async function subirFotoDetalle(id, event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const blob = await compressImage(file);
    const path = `${id}/${Date.now()}.jpg`;
    const url = await sbStorageUpload(path, blob, 'image/jpeg', 'items');
    await sbFetch(`/items?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ foto_url: url }) });
    toast('Foto actualizada', 'success');
    await loadItems();
    openItemDetalle(id);
  } catch (e) {
    toast('Error al subir la foto: ' + e.message, 'error');
  }
}

export async function eliminarFotoDetalle(id) {
  if (!confirm('¿Eliminar la foto de este repuesto?')) return;
  const it = state.items.find(x => x.id === id);
  try {
    if (it?.foto_url) {
      const marker = '/storage/v1/object/public/items/';
      const idx = it.foto_url.indexOf(marker);
      if (idx !== -1) {
        await sbStorageDelete(it.foto_url.slice(idx + marker.length), 'items').catch(() => {});
      }
    }
    await sbFetch(`/items?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ foto_url: null }) });
    toast('Foto eliminada', 'success');
    await loadItems();
    openItemDetalle(id);
  } catch (e) {
    toast('Error al eliminar la foto: ' + e.message, 'error');
  }
}

// ===== ALTA / EDICIÓN =====

function renderModalFamilias(selectedId = '') {
  const sel = document.getElementById('it_familia');
  sel.innerHTML = '<option value="">Elegir...</option>' +
    state.familias.map(f => `<option value="${f.id}" ${f.id === selectedId ? 'selected' : ''}>${esc(f.nombre)} (${esc(f.codigo)})</option>`).join('');
}

function renderModalSubfamilias(familiaId, selectedId = '') {
  const sel = document.getElementById('it_subfamilia');
  const subs = state.subfamilias.filter(s => s.familia_id === familiaId);
  sel.innerHTML = '<option value="">Elegir...</option>' +
    subs.map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${esc(s.nombre)} (${esc(s.codigo)})</option>`).join('');
}

export function onModalFamiliaChange() {
  renderModalSubfamilias(document.getElementById('it_familia').value);
  updateCodigoPreview();
}

export function updateCodigoPreview() {
  const fam = state.familias.find(f => f.id === document.getElementById('it_familia').value);
  const sub = state.subfamilias.find(s => s.id === document.getElementById('it_subfamilia').value);
  const numero = document.getElementById('it_numero').value.trim();
  const preview = document.getElementById('it_codigo_preview');
  if (fam && sub && numero) {
    preview.value = `M${fam.codigo}${sub.codigo}${numero.padStart(5, '0')}`;
  } else {
    preview.value = '';
  }
}

export function openItemModal(id = null) {
  if (!isMantenimientoAdmin()) return;
  state.editingItemId = id;

  renderModalFamilias();
  document.getElementById('it_subfamilia').innerHTML = '<option value="">Elegir primero una familia</option>';

  if (id) {
    const it = state.items.find(x => x.id === id);
    if (!it) return;
    document.getElementById('modalItemTitle').textContent = 'Editar Repuesto';
    renderModalFamilias(it.familia_id);
    renderModalSubfamilias(it.familia_id, it.subfamilia_id);
    document.getElementById('it_numero').value = it.numero;
    document.getElementById('it_descripcion').value = it.descripcion;
    document.getElementById('it_ubicacion').value = it.ubicacion || '';
    document.getElementById('it_stock').value = it.stock ?? '';
    updateCodigoPreview();
  } else {
    document.getElementById('modalItemTitle').textContent = 'Nuevo Repuesto';
    ['it_numero', 'it_descripcion', 'it_ubicacion', 'it_stock', 'it_codigo_preview'].forEach(id2 => { document.getElementById(id2).value = ''; });
  }

  document.getElementById('modalItem').classList.add('open');
}

export async function promptNuevaFamilia() {
  const codigo = (prompt('Código de la familia (2 letras, ej: CA):') || '').trim().toUpperCase();
  if (!codigo) return;
  if (!/^[A-Z]{2}$/.test(codigo)) { toast('El código debe ser exactamente 2 letras', 'error'); return; }
  if (state.familias.some(f => f.codigo === codigo)) { toast('Ya existe una familia con ese código', 'error'); return; }
  const nombre = (prompt(`Nombre de la familia "${codigo}":`) || '').trim();
  if (!nombre) return;

  try {
    const res = await sbFetch('/familias', { method: 'POST', body: JSON.stringify({ codigo, nombre }) });
    state.familias.push(res[0]);
    state.familias.sort((a, b) => a.nombre.localeCompare(b.nombre));
    renderModalFamilias(res[0].id);
    onModalFamiliaChange();
    toast('Familia creada', 'success');
  } catch (e) { toast('Error al crear la familia: ' + e.message, 'error'); }
}

export async function promptNuevaSubfamilia() {
  const familiaId = document.getElementById('it_familia').value;
  if (!familiaId) { toast('Elegí primero una familia', 'error'); return; }
  const familia = state.familias.find(f => f.id === familiaId);

  const codigo = (prompt('Código de la subfamilia (2 letras, ej: AI):') || '').trim().toUpperCase();
  if (!codigo) return;
  if (!/^[A-Z]{2}$/.test(codigo)) { toast('El código debe ser exactamente 2 letras', 'error'); return; }
  if (state.subfamilias.some(s => s.familia_id === familiaId && s.codigo === codigo)) {
    toast(`Ya existe esa subfamilia dentro de "${familia.nombre}"`, 'error'); return;
  }
  const nombre = (prompt(`Nombre de la subfamilia "${codigo}" dentro de "${familia.nombre}":`) || '').trim();
  if (!nombre) return;

  try {
    const res = await sbFetch('/subfamilias', { method: 'POST', body: JSON.stringify({ familia_id: familiaId, codigo, nombre }) });
    state.subfamilias.push(res[0]);
    renderModalSubfamilias(familiaId, res[0].id);
    updateCodigoPreview();
    toast('Subfamilia creada', 'success');
  } catch (e) { toast('Error al crear la subfamilia: ' + e.message, 'error'); }
}

function compressImage(file, maxDim = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

export async function saveItem() {
  const familiaId = document.getElementById('it_familia').value;
  const subfamiliaId = document.getElementById('it_subfamilia').value;
  const numero = document.getElementById('it_numero').value.trim();
  const descripcion = document.getElementById('it_descripcion').value.trim();
  const ubicacion = document.getElementById('it_ubicacion').value.trim();
  const stockRaw = document.getElementById('it_stock').value;

  if (!familiaId || !subfamiliaId || !numero || !descripcion) {
    toast('Familia, subfamilia, número y descripción son obligatorios', 'error');
    return;
  }

  const fam = state.familias.find(f => f.id === familiaId);
  const sub = state.subfamilias.find(s => s.id === subfamiliaId);
  const numeroPad = numero.padStart(5, '0');
  const codigo = `M${fam.codigo}${sub.codigo}${numeroPad}`;

  const body = {
    codigo,
    numero: numeroPad,
    descripcion,
    familia_id: familiaId,
    subfamilia_id: subfamiliaId,
    ubicacion: ubicacion || null,
    stock: stockRaw === '' ? null : Number(stockRaw),
  };

  try {
    let itemId = state.editingItemId;
    if (itemId) {
      await sbFetch(`/items?id=eq.${itemId}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      const res = await sbFetch('/items', { method: 'POST', body: JSON.stringify(body) });
      itemId = res[0].id;
    }

    toast(state.editingItemId ? 'Repuesto actualizado' : 'Repuesto agregado', 'success');
    closeModal('modalItem');
    await loadItems();
  } catch (e) {
    toast('Error al guardar: ' + e.message, 'error');
  }
}

export async function deleteItem(id) {
  const it = state.items.find(x => x.id === id);
  if (!confirm(`¿Eliminar "${it?.codigo}"? Esta acción no se puede deshacer.`)) return;
  try {
    await sbFetch(`/items?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ activo: false }) });
    toast('Repuesto eliminado', 'error');
    await loadItems();
  } catch { toast('Error al eliminar', 'error'); }
}
