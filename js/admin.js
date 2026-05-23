import { sbFetch, SUPABASE_URL, SUPABASE_KEY } from './api.js';
import { state } from './state.js';
import { toast, closeModal, esc } from './ui.js';

// ===== CAMPOS CUSTOM =====
export function renderCamposCustomAdmin() {
  const list  = document.getElementById('camposCustomList');
  const noMsg = document.getElementById('noCamposMsg');
  if (!list) return;

  if (!state.camposCustom.length) {
    list.innerHTML = '';
    if (noMsg) noMsg.style.display = 'block';
    return;
  }

  if (noMsg) noMsg.style.display = 'none';
  list.innerHTML = state.camposCustom.map((campo, i) => `
    <div class="campo-custom-row" data-id="${campo.id}">
      <input type="text" class="cc-label" placeholder="Nombre del campo" value="${esc(campo.label)}">
      <select class="cc-tipo">
        <option value="text"     ${campo.tipo === 'text'     ? 'selected' : ''}>Texto</option>
        <option value="tel"      ${campo.tipo === 'tel'      ? 'selected' : ''}>Teléfono</option>
        <option value="number"   ${campo.tipo === 'number'   ? 'selected' : ''}>Número</option>
        <option value="email"    ${campo.tipo === 'email'    ? 'selected' : ''}>Email</option>
        <option value="textarea" ${campo.tipo === 'textarea' ? 'selected' : ''}>Texto largo</option>
      </select>
      <button class="btn-remove-contact" onclick="removeCampoCustomRow(${i})" title="Eliminar campo">✕</button>
    </div>`).join('');
}

export function addCampoCustomRow() {
  state.camposCustom.push({ id: `custom_${Date.now()}`, label: '', tipo: 'text' });
  renderCamposCustomAdmin();
  const inputs = document.querySelectorAll('#camposCustomList .cc-label');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

export function removeCampoCustomRow(idx) {
  state.camposCustom.splice(idx, 1);
  renderCamposCustomAdmin();
}

export async function saveCamposCustom() {
  const rows = document.querySelectorAll('#camposCustomList .campo-custom-row');
  const updated = [];
  rows.forEach(row => {
    const label = row.querySelector('.cc-label')?.value.trim();
    const tipo  = row.querySelector('.cc-tipo')?.value || 'text';
    const id    = row.dataset.id;
    if (label) updated.push({ id, label, tipo });
  });

  try {
    await sbFetch('/configuracion?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify({ comisionistas_campos_custom: updated })
    });
    state.camposCustom = updated;
    state.configData.comisionistas_campos_custom = updated;
    renderCamposCustomAdmin();
    toast('Campos guardados', 'success');
  } catch {
    toast('Error al guardar campos', 'error');
  }
}

// ===== USUARIOS =====
export async function loadUsers() {
  try {
    const users = await sbFetch('/usuarios_perfil?select=*&order=nombre.asc');
    const tbody = document.getElementById('usersTableBody');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin usuarios registrados</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${esc(u.nombre || '')} ${esc(u.apellido || '')}</strong></td>
        <td>${esc(u.email || '')}</td>
        <td><span class="badge ${u.rol === 'admin' ? 'badge-rubro' : 'badge-active'}">${u.rol === 'admin' ? 'Admin' : 'Usuario'}</span></td>
        <td><span class="badge ${u.activo !== false ? 'badge-active' : 'badge-inactive'}">${u.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
        <td><div class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="openUserModal('${u.id}')">Editar</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="toggleUserActivo('${u.id}',${u.activo !== false})">${u.activo !== false ? 'Desactivar' : 'Activar'}</button>
        </div></td>
      </tr>`).join('');
  } catch { toast('Error al cargar usuarios', 'error'); }
}

export function openUserModal(id = null) {
  state.editingUserId = id;
  document.getElementById('modalUserTitle').textContent = id ? 'Editar Usuario' : 'Nuevo Usuario';
  document.getElementById('u_passGroup').style.display = id ? 'none' : 'block';
  if (id) {
    ['nombre', 'apellido', 'email'].forEach(f => { document.getElementById('u_' + f).value = ''; });
  } else {
    ['nombre', 'apellido', 'email', 'pass'].forEach(f => { const el = document.getElementById('u_' + f); if (el) el.value = ''; });
    document.getElementById('u_rol').value = 'user';
  }
  document.getElementById('modalUser').classList.add('open');
}

export async function saveUser() {
  const nombre   = document.getElementById('u_nombre').value.trim();
  const apellido = document.getElementById('u_apellido').value.trim();
  const email    = document.getElementById('u_email').value.trim();
  const pass     = document.getElementById('u_pass').value;
  const rol      = document.getElementById('u_rol').value;

  if (!nombre || !email) { toast('Nombre y email son obligatorios', 'error'); return; }

  if (!state.editingUserId) {
    if (!pass || pass.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${localStorage.getItem('sb_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, email_confirm: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Error al crear usuario');
      await sbFetch('/usuarios_perfil', { method: 'POST', body: JSON.stringify({ id: data.id, nombre, apellido, email, rol, activo: true }) });
      toast('Usuario creado', 'success');
    } catch (e) { toast('Error: ' + e.message, 'error'); return; }
  } else {
    try {
      await sbFetch(`/usuarios_perfil?id=eq.${state.editingUserId}`, { method: 'PATCH', body: JSON.stringify({ nombre, apellido, rol }) });
      toast('Usuario actualizado', 'success');
    } catch { toast('Error al actualizar', 'error'); return; }
  }

  closeModal('modalUser');
  loadUsers();
}

export async function toggleUserActivo(id, isActive) {
  try {
    await sbFetch(`/usuarios_perfil?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ activo: !isActive }) });
    toast(isActive ? 'Usuario desactivado' : 'Usuario activado', 'success');
    loadUsers();
  } catch { toast('Error al actualizar usuario', 'error'); }
}

export function initAdminRotuloPanel() {}
