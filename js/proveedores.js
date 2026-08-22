import { sbFetch } from './api.js';
import { state } from './state.js';
import { toast, closeModal, esc, field } from './ui.js';

export async function loadProveedores() {
  try {
    state.proveedores = await sbFetch('/proveedores?select=*&eliminado=eq.false&order=nombre.asc');
    state.contactos   = await sbFetch('/contactos?select=*');
    renderStats();
    renderProveedores();
  } catch {
    toast('Error al cargar proveedores', 'error');
  }
}

export function renderStats() {
  const activos = state.proveedores.filter(p => p.activo).length;
  const rubros  = new Set(state.proveedores.map(p => p.rubro).filter(Boolean)).size;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-icon blue">🧀</div><div><div class="stat-number">${state.proveedores.length}</div><div class="stat-label">Total</div></div></div>
    <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-number">${activos}</div><div class="stat-label">Activos</div></div></div>
    <div class="stat-card"><div class="stat-icon red">📦</div><div><div class="stat-number">${rubros}</div><div class="stat-label">Rubros</div></div></div>`;
}

export function renderProveedores() {
  const q      = document.getElementById('searchProv').value.toLowerCase();
  const rubro  = document.getElementById('filterRubro').value;
  const estado = document.getElementById('filterEstado').value;

  const rubros = [...new Set(state.proveedores.map(p => p.rubro).filter(Boolean))].sort();
  const sel = document.getElementById('filterRubro');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos los rubros</option>' + rubros.map(r => `<option value="${esc(r)}" ${r === cur ? 'selected' : ''}>${esc(r)}</option>`).join('');

  const filtered = state.proveedores.filter(p => {
    const matchQ = !q    || [p.nombre, p.rubro, p.localidad, p.provincia, p.email].some(v => v && v.toLowerCase().includes(q));
    const matchR = !rubro  || p.rubro === rubro;
    const matchE = !estado || (estado === 'activo' ? p.activo : !p.activo);
    return matchQ && matchR && matchE;
  });

  const emptyMsg = `<div class="empty-state"><div class="empty-icon">🧀</div><h3>${state.proveedores.length === 0 ? 'Sin proveedores aún' : 'Sin resultados'}</h3><p>${state.proveedores.length === 0 ? 'Agregá el primer proveedor.' : 'Probá con otro filtro.'}</p></div>`;
  const tbody = document.getElementById('provTableBody');

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyMsg}</td></tr>`;
    const cards = document.getElementById('provCards');
    if (cards) cards.innerHTML = emptyMsg;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const pContacts = state.contactos.filter(c => c.proveedor_id === p.id);
    const fecha     = p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-AR') : '—';
    return `<tr>
      <td><div class="provider-name">${esc(p.nombre)}</div>${p.email ? `<div style="font-size:11px;color:var(--text-muted)">${esc(p.email)}</div>` : ''}</td>
      <td>${p.rubro ? `<span class="badge badge-rubro">${esc(p.rubro)}</span>` : '—'}</td>
      <td>${[p.localidad, p.provincia].filter(Boolean).map(esc).join(', ') || '—'}</td>
      <td>${pContacts.length === 0 ? '<span style="color:var(--text-muted);font-size:12px">Sin contactos</span>' : pContacts.map(c => `<span class="contact-chip">👤 ${esc(c.nombre)}${c.cargo ? ` · ${esc(c.cargo)}` : ''}</span>`).join('')}</td>
      <td><span class="badge ${p.activo ? 'badge-active' : 'badge-inactive'}">${p.activo ? '● Activo' : '○ Inactivo'}</span></td>
      <td><div style="font-size:12px">${fecha}</div><div class="meta-info">por ${esc(p.modificado_por || '—')}</div></td>
      <td><div class="td-actions">
        <button class="btn btn-ghost btn-sm btn-icon" title="Ver"    onclick="openDetail('${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="openProvModal('${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Rótulo" onclick="openRotulo('${p.id}')">🏷️</button>
        <button class="btn btn-danger-ghost btn-sm btn-icon" title="Eliminar" onclick="deleteProveedor('${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
      </div></td>
    </tr>`;
  }).join('');

  const cards = document.getElementById('provCards');
  if (cards) {
    cards.innerHTML = filtered.map(p => {
      const pContacts = state.contactos.filter(c => c.proveedor_id === p.id);
      const contact   = pContacts[0];
      return `<div class="prov-card">
        <div class="prov-card-header">
          <div><div class="prov-card-name">${esc(p.nombre)}</div>${p.rubro ? `<span class="badge badge-rubro" style="margin-top:4px;display:inline-flex">${esc(p.rubro)}</span>` : ''}</div>
          <span class="badge ${p.activo ? 'badge-active' : 'badge-inactive'}">${p.activo ? '● Activo' : '○ Inactivo'}</span>
        </div>
        <div class="prov-card-body">
          ${[p.localidad, p.provincia].filter(Boolean).length ? `<div class="prov-card-row">📍 ${[p.localidad, p.provincia].filter(Boolean).map(esc).join(', ')}</div>` : ''}
          ${p.horario ? `<div class="prov-card-row">🕐 ${esc(p.horario)}</div>` : ''}
          ${contact   ? `<div class="prov-card-row">👤 ${esc(contact.nombre)}${contact.telefono ? ' — ' + esc(contact.telefono) : ''}${contact.celular ? ' / ' + esc(contact.celular) : ''}</div>` : ''}
        </div>
        <div class="prov-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="openDetail('${p.id}')">👁 Ver</button>
          <button class="btn btn-ghost btn-sm" onclick="openProvModal('${p.id}')">✏️ Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="openRotulo('${p.id}')">🏷️</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteProveedor('${p.id}')">🗑</button>
        </div>
      </div>`;
    }).join('');
  }
}

export function openProvModal(id = null) {
  state.editingProvId = id;
  const fields = ['nombre', 'rubro', 'email', 'direccion', 'localidad', 'provincia', 'codigo_postal', 'horario', 'notas', 'activo'];
  document.getElementById('contactsContainer').innerHTML = '';
  state.contactRowCounter = 0;

  if (id) {
    const p = state.proveedores.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modalProvTitle').textContent = 'Editar Proveedor';
    fields.forEach(f => {
      const el = document.getElementById('p_' + f);
      if (!el) return;
      el.value = f === 'activo' ? String(p[f] !== false) : (p[f] || '');
    });
    state.contactos.filter(c => c.proveedor_id === id).forEach(c => addContactRow(c));
  } else {
    document.getElementById('modalProvTitle').textContent = 'Nuevo Proveedor';
    fields.forEach(f => { const el = document.getElementById('p_' + f); if (el) el.value = f === 'activo' ? 'true' : ''; });
  }

  updateNoContactsMsg();
  document.getElementById('modalProv').classList.add('open');
}

export function addContactRow(contact = null) {
  state.contactRowCounter++;
  const id  = state.contactRowCounter;
  const row = document.createElement('div');
  row.className = 'contact-row';
  row.id = `crow_${id}`;
  row.innerHTML = `
    <button class="btn-remove-contact" onclick="removeContactRow(${id})">✕</button>
    <div class="contact-row-grid">
      <div class="form-group"><label>Nombre y apellido *</label><input type="text" id="cn_${id}" value="${esc(contact?.nombre || '')}" placeholder="Juan Pérez"></div>
      <div class="form-group"><label>Cargo / Rol</label><input type="text" id="cc_${id}" value="${esc(contact?.cargo || '')}" placeholder="Ventas"></div>
      <div class="form-group"><label>Teléfono</label><input type="tel" id="ct_${id}" value="${esc(contact?.telefono || '')}" placeholder="(0000) 000-0000"></div>
      <div class="form-group"><label>Celular / WhatsApp</label><input type="tel" id="cw_${id}" value="${esc(contact?.celular || '')}" placeholder="11 5523-0000"></div>
      <div class="form-group full" style="grid-column:1/-1"><label>Email</label><input type="email" id="ce_${id}" value="${esc(contact?.email || '')}" placeholder="contacto@proveedor.com"></div>
    </div>`;
  row.dataset.existingId = contact?.id || '';
  document.getElementById('contactsContainer').appendChild(row);
  updateNoContactsMsg();
}

export function removeContactRow(id) {
  document.getElementById(`crow_${id}`)?.remove();
  updateNoContactsMsg();
}

export function updateNoContactsMsg() {
  const container = document.getElementById('contactsContainer');
  document.getElementById('noContactsMsg').style.display = container.children.length === 0 ? 'block' : 'none';
}

export async function saveProveedor() {
  const nombre = document.getElementById('p_nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  const userNombre = state.currentUser?.nombre || state.currentUser?.email || 'Usuario';
  const body = {
    nombre,
    rubro:         document.getElementById('p_rubro').value.trim(),
    email:         document.getElementById('p_email').value.trim(),
    direccion:     document.getElementById('p_direccion').value.trim(),
    localidad:     document.getElementById('p_localidad').value.trim(),
    provincia:     document.getElementById('p_provincia').value.trim(),
    codigo_postal: document.getElementById('p_codigo_postal').value.trim(),
    horario:       document.getElementById('p_horario').value.trim(),
    notas:         document.getElementById('p_notas').value.trim(),
    activo:        document.getElementById('p_activo').value === 'true',
    modificado_por: userNombre,
    updated_at:    new Date().toISOString()
  };

  const rows = document.querySelectorAll('#contactsContainer .contact-row');
  const contactsData = [];
  for (const row of rows) {
    const idx     = row.id.replace('crow_', '');
    const nombre_c = document.getElementById(`cn_${idx}`)?.value.trim();
    if (!nombre_c) continue;
    contactsData.push({
      id:       row.dataset.existingId || null,
      nombre:   nombre_c,
      cargo:    document.getElementById(`cc_${idx}`)?.value.trim() || '',
      telefono: document.getElementById(`ct_${idx}`)?.value.trim() || '',
      celular:  document.getElementById(`cw_${idx}`)?.value.trim() || '',
      email:    document.getElementById(`ce_${idx}`)?.value.trim() || ''
    });
  }

  try {
    let provId;
    if (state.editingProvId) {
      await sbFetch(`/proveedores?id=eq.${state.editingProvId}`, { method: 'PATCH', body: JSON.stringify(body) });
      provId = state.editingProvId;
      toast('Proveedor actualizado', 'success');
    } else {
      const res = await sbFetch('/proveedores', { method: 'POST', body: JSON.stringify(body) });
      provId = res[0].id;
      toast('Proveedor agregado', 'success');
    }

    await sbFetch(`/contactos?proveedor_id=eq.${provId}`, { method: 'DELETE' });
    for (const c of contactsData) {
      const { id: _id, ...cBody } = c;
      await sbFetch('/contactos', { method: 'POST', body: JSON.stringify({ ...cBody, proveedor_id: provId }) });
    }

    closeModal('modalProv');
    await loadProveedores();
  } catch (e) { toast('Error al guardar: ' + e.message, 'error'); }
}

export async function deleteProveedor(id) {
  const p = state.proveedores.find(x => x.id === id);
  if (!confirm(`¿Eliminar a "${p?.nombre}"? Queda en la Papelera hasta que el superadmin lo confirme.`)) return;
  try {
    await sbFetch(`/proveedores?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ eliminado: true, eliminado_por: state.currentUser.id, eliminado_at: new Date().toISOString() }),
    });
    toast('Proveedor eliminado', 'error');
    await loadProveedores();
  } catch { toast('Error al eliminar', 'error'); }
}

export function openDetail(id) {
  const p = state.proveedores.find(x => x.id === id);
  if (!p) return;
  state.currentProvId = id;
  document.getElementById('detailTitle').textContent = p.nombre;
  document.getElementById('detailEditBtn').onclick = () => { closeModal('modalDetail'); openProvModal(id); };

  const pContacts = state.contactos.filter(c => c.proveedor_id === id);
  const fecha     = p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-AR') : '—';

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-grid">
      ${field('Rubro', p.rubro)}
      ${field('Localidad', [p.localidad, p.provincia, p.codigo_postal ? `CP: ${p.codigo_postal}` : ''].filter(Boolean).join(', '))}
      ${field('Dirección', p.direccion)}
      ${field('Horario', p.horario)}
      ${field('Email', p.email)}
      ${field('Estado', p.activo ? '✅ Activo' : '⬜ Inactivo')}
      ${field('Última modificación', fecha + (p.modificado_por ? ` por ${p.modificado_por}` : ''))}
    </div>
    ${p.notas ? `<div class="detail-section"><label style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted)">Notas</label><p style="margin-top:4px;font-size:14px;color:var(--text-mid)">${esc(p.notas)}</p></div>` : ''}
    <div class="divider"></div>
    <div style="font-weight:700;color:var(--blue);margin-bottom:12px">👤 Contactos (${pContacts.length})</div>
    ${pContacts.length === 0
      ? '<p style="color:var(--text-muted);font-size:13px">Sin contactos registrados</p>'
      : `<div class="contacts-list">${pContacts.map(c => `
          <div class="contact-card">
            <div class="contact-card-name">${esc(c.nombre)}</div>
            ${c.cargo ? `<div class="contact-card-cargo">${esc(c.cargo)}</div>` : ''}
            <div class="contact-card-info">
              ${c.telefono ? `<span>📞 ${esc(c.telefono)}</span>` : ''}
              ${c.celular  ? `<span>📱 ${esc(c.celular)}</span>`  : ''}
              ${c.email    ? `<span>✉ ${esc(c.email)}</span>`    : ''}
            </div>
          </div>`).join('')}</div>`}`;

  document.getElementById('modalDetail').classList.add('open');
}

export function openRotuloFromDetail() {
  closeModal('modalDetail');
  // openRotulo se llama desde window (expuesto en main.js)
  window.openRotulo(state.currentProvId);
}

export function exportExcel() {
  if (!state.proveedores.length) { toast('Sin datos para exportar', 'error'); return; }
  const rows = state.proveedores.map(p => {
    const pContacts = state.contactos.filter(c => c.proveedor_id === p.id);
    return {
      'Nombre': p.nombre, 'Rubro': p.rubro || '', 'Email': p.email || '',
      'Dirección': p.direccion || '', 'Localidad': p.localidad || '', 'Provincia': p.provincia || '',
      'Horario': p.horario || '', 'Estado': p.activo ? 'Activo' : 'Inactivo', 'Notas': p.notas || '',
      'Última modificación': p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-AR') : '',
      'Modificado por': p.modificado_por || '',
      'Contactos': pContacts.map(c => `${c.nombre}${c.cargo ? ' (' + c.cargo + ')' : ''}${c.telefono ? ' T:' + c.telefono : ''}${c.celular ? ' C:' + c.celular : ''}`).join(' | ')
    };
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
  XLSX.writeFile(wb, `proveedores_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast('Excel exportado', 'success');
}
