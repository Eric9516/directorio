// ===== CONFIG =====
const SUPABASE_URL = 'https://kpwkxkkbnmdhqqvjmneh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_llAKdu5sRcVMBMjX3Txr6A_4pH9zZ--';
const API = `${SUPABASE_URL}/rest/v1`;
const AUTH_API = `${SUPABASE_URL}/auth/v1`;

// ===== STATE =====
let currentUser = null;
let isAdmin = false;
let proveedores = [];
let contactos = [];
let comisionistas = [];
let camposCustom = [];
let configData = {};
let logoBase64 = '';
let currentProvId = null;
let rotuloProvId = null;
let editingUserId = null;
let selectedSize = 'a4';
let editingProvId = null;
let editingComId = null;

// ===== FLOATING CHEESE DECO =====
const cheeses = ['🧀','🥛','🫙'];
const deco = document.getElementById('authDeco');
for(let i=0;i<8;i++){
  const el = document.createElement('div');
  el.className = 'cheese-float';
  el.textContent = cheeses[i%cheeses.length];
  el.style.left = (Math.random()*100)+'%';
  el.style.animationDuration = (8+Math.random()*12)+'s';
  el.style.animationDelay = (-Math.random()*15)+'s';
  el.style.fontSize = (24+Math.random()*30)+'px';
  deco.appendChild(el);
}

// ===== SUPABASE HELPERS =====
async function sbFetch(path, opts={}) {
  const token = localStorage.getItem('sb_token');
  const headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function sbAuth(path, body) {
  const res = await fetch(`${AUTH_API}${path}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Error de autenticación');
  return data;
}

// ===== AUTH =====
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('authError');
  errEl.style.display = 'none';

  if (!email || !pass) { showAuthError('Completá email y contraseña'); return; }

  try {
    const data = await sbAuth('/token?grant_type=password', { email, password: pass });
    localStorage.setItem('sb_token', data.access_token);
    localStorage.setItem('sb_refresh', data.refresh_token);
    localStorage.setItem('sb_user_id', data.user.id);
    localStorage.setItem('sb_user_email', data.user.email);
    await loadUserProfile(data.user.id, data.user.email);
    await initApp();
  } catch(e) {
    showAuthError('Email o contraseña incorrectos');
  }
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}

async function loadUserProfile(uid, email) {
  try {
    const rows = await sbFetch(`/usuarios_perfil?id=eq.${uid}&select=*`);
    if (rows.length) {
      currentUser = rows[0];
      isAdmin = rows[0].rol === 'admin';
    } else {
      currentUser = { id: uid, email, nombre: email.split('@')[0], apellido: '', rol: 'user' };
      isAdmin = false;
    }
  } catch {
    currentUser = { id: uid, email, nombre: email.split('@')[0], apellido: '', rol: 'user' };
    isAdmin = false;
  }
}

function doLogout() {
  if (!confirm('¿Cerrar sesión?')) return;
  closeMobileMenu();
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_refresh');
  localStorage.removeItem('sb_user_id');
  localStorage.removeItem('sb_user_email');
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').classList.remove('visible');
}

// ===== MOBILE MENU =====
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu.classList.contains('open')) {
    closeMobileMenu();
  } else {
    menu.classList.add('open');
    document.getElementById('mobileMenuOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  document.getElementById('mobileMenu')?.classList.remove('open');
  document.getElementById('mobileMenuOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ===== INIT =====
async function initApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').classList.add('visible');

  const nombre = currentUser?.nombre || currentUser?.email?.split('@')[0] || 'Usuario';
  const apellido = currentUser?.apellido || '';
  const fullName = `${nombre} ${apellido}`.trim();
  const initial = nombre[0].toUpperCase();

  document.getElementById('userName').textContent = fullName;
  document.getElementById('userAvatar').textContent = initial;
  document.getElementById('mobileUsername').textContent = fullName;
  document.getElementById('mobileEmail').textContent = currentUser?.email || '';
  document.getElementById('mobileAvatar').textContent = initial;

  if (isAdmin) {
    document.getElementById('tab-admin').style.display = 'flex';
    document.getElementById('mm-admin').style.display = 'flex';
  }

  await loadConfig();
  await loadProveedores();
}

window.addEventListener('load', async () => {
  const token = localStorage.getItem('sb_token');
  const uid = localStorage.getItem('sb_user_id');
  const email = localStorage.getItem('sb_user_email');
  if (token && uid) {
    try {
      await loadUserProfile(uid, email);
      await initApp();
    } catch {}
  }
});

document.getElementById('loginPass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
document.getElementById('loginEmail').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

// ===== CONFIG =====
async function loadConfig() {
  try {
    const rows = await sbFetch('/configuracion?id=eq.1&select=*');
    if (rows.length) {
      configData = rows[0];
      applyConfig();
    }
  } catch {}
}

function applyConfig() {
  const nombre = configData.empresa_nombre || 'Cremac';
  document.getElementById('headerName').textContent = nombre;
  document.title = `Directorio — ${nombre}`;

  if (configData.logo_base64) {
    logoBase64 = configData.logo_base64;
    setLogoSrc(logoBase64);
  }

  ['nombre','direccion','telefono','email'].forEach(k => {
    const el = document.getElementById(`cfg_${k}`);
    if (el) el.value = configData[`empresa_${k}`] || '';
  });
  const pieEl = document.getElementById('cfg_pie');
  if (pieEl) pieEl.value = configData.rotulo_pie || '';

  camposCustom = configData.comisionistas_campos_custom || [];
  renderCamposCustomAdmin();
  renderRotuloToggles();
}

function setLogoSrc(src) {
  document.getElementById('authLogo').src = src;
  document.getElementById('headerLogo').src = src;
  const preview = document.getElementById('logoPreview');
  if (preview) { preview.src = src; preview.style.display = 'block'; document.getElementById('logoUploadText').style.display = 'none'; }
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    logoBase64 = ev.target.result;
    setLogoSrc(logoBase64);
  };
  reader.readAsDataURL(file);
}

async function saveConfig() {
  const body = {
    empresa_nombre: document.getElementById('cfg_nombre').value.trim() || 'Cremac',
    empresa_direccion: document.getElementById('cfg_direccion').value.trim(),
    empresa_telefono: document.getElementById('cfg_telefono').value.trim(),
    empresa_email: document.getElementById('cfg_email').value.trim(),
    rotulo_pie: document.getElementById('cfg_pie').value.trim(),
    logo_base64: logoBase64 || configData.logo_base64 || '',
    rotulo_campos: getRotuloToggleValues()
  };

  try {
    await sbFetch('/configuracion?id=eq.1', { method: 'PATCH', body: JSON.stringify(body) });
    configData = { ...configData, ...body };
    applyConfig();
    toast('Configuración guardada', 'success');
  } catch(e) {
    toast('Error al guardar configuración', 'error');
  }
}

function renderRotuloToggles() {
  const campos = configData.rotulo_campos || { horario: true, direccion: true, telefono: true, email: true };
  const labels = { horario: 'Horario de atención', direccion: 'Dirección', telefono: 'Teléfono del contacto', email: 'Email' };
  const container = document.getElementById('rotuloToggleList');
  if (!container) return;
  container.innerHTML = Object.keys(labels).map(k => `
    <div class="toggle-wrap" style="margin-bottom:12px" onclick="toggleRotuloCampo('${k}')">
      <div class="toggle ${campos[k] ? 'on' : ''}" id="toggle_${k}"></div>
      <span style="font-size:13px;font-weight:600;color:var(--text-mid)">${labels[k]}</span>
    </div>
  `).join('');
}

function toggleRotuloCampo(k) {
  document.getElementById(`toggle_${k}`)?.classList.toggle('on');
}

function getRotuloToggleValues() {
  const keys = ['horario','direccion','telefono','email'];
  const result = {};
  keys.forEach(k => {
    const el = document.getElementById(`toggle_${k}`);
    result[k] = el ? el.classList.contains('on') : true;
  });
  return result;
}

// ===== PROVEEDORES =====
async function loadProveedores() {
  try {
    proveedores = await sbFetch('/proveedores?select=*&order=nombre.asc');
    contactos = await sbFetch('/contactos?select=*');
    renderStats();
    renderProveedores();
  } catch(e) {
    toast('Error al cargar proveedores', 'error');
  }
}

function renderStats() {
  const activos = proveedores.filter(p => p.activo).length;
  const rubros = new Set(proveedores.map(p=>p.rubro).filter(Boolean)).size;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue">🧀</div>
      <div><div class="stat-number">${proveedores.length}</div><div class="stat-label">Total</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">✅</div>
      <div><div class="stat-number">${activos}</div><div class="stat-label">Activos</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">📦</div>
      <div><div class="stat-number">${rubros}</div><div class="stat-label">Rubros</div></div>
    </div>
  `;
}

function renderProveedores() {
  const q = document.getElementById('searchProv').value.toLowerCase();
  const rubro = document.getElementById('filterRubro').value;
  const estado = document.getElementById('filterEstado').value;

  const rubros = [...new Set(proveedores.map(p=>p.rubro).filter(Boolean))].sort();
  const sel = document.getElementById('filterRubro');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos los rubros</option>' + rubros.map(r => `<option value="${r}" ${r===cur?'selected':''}>${r}</option>`).join('');

  let filtered = proveedores.filter(p => {
    const matchQ = !q || [p.nombre,p.rubro,p.localidad,p.provincia,p.email].some(v=>v&&v.toLowerCase().includes(q));
    const matchR = !rubro || p.rubro === rubro;
    const matchE = !estado || (estado==='activo' ? p.activo : !p.activo);
    return matchQ && matchR && matchE;
  });

  const tbody = document.getElementById('provTableBody');

  if (filtered.length === 0) {
    const msg = `<div class="empty-state"><div class="empty-icon">🧀</div><h3>${proveedores.length===0?'Sin proveedores aún':'Sin resultados'}</h3><p>${proveedores.length===0?'Agregá el primer proveedor.':'Probá con otro filtro.'}</p></div>`;
    tbody.innerHTML = `<tr><td colspan="7">${msg}</td></tr>`;
    const cards = document.getElementById('provCards');
    if (cards) cards.innerHTML = msg;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const pContacts = contactos.filter(c => c.proveedor_id === p.id);
    const fecha = p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-AR') : '—';
    return `
      <tr>
        <td>
          <div class="provider-name">${esc(p.nombre)}</div>
          ${p.email ? `<div style="font-size:11px;color:var(--text-muted)">${esc(p.email)}</div>` : ''}
        </td>
        <td>${p.rubro ? `<span class="badge badge-rubro">${esc(p.rubro)}</span>` : '—'}</td>
        <td>${[p.localidad, p.provincia].filter(Boolean).map(esc).join(', ') || '—'}</td>
        <td>${pContacts.length === 0 ? '<span style="color:var(--text-muted);font-size:12px">Sin contactos</span>' : pContacts.map(c => `<span class="contact-chip">👤 ${esc(c.nombre)}${c.cargo?` · ${esc(c.cargo)}`:''}</span>`).join('')}</td>
        <td><span class="badge ${p.activo ? 'badge-active' : 'badge-inactive'}">${p.activo ? '● Activo' : '○ Inactivo'}</span></td>
        <td><div style="font-size:12px">${fecha}</div><div class="meta-info">por ${esc(p.modificado_por||'—')}</div></td>
        <td>
          <div class="td-actions">
            <button class="btn btn-ghost btn-sm btn-icon" title="Ver" onclick="openDetail('${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="openProvModal('${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Rótulo" onclick="openRotulo('${p.id}')">🏷️</button>
            <button class="btn btn-danger-ghost btn-sm btn-icon" title="Eliminar" onclick="deleteProveedor('${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
          </div>
        </td>
      </tr>`;
  }).join('');

  const cards = document.getElementById('provCards');
  if (cards) {
    cards.innerHTML = filtered.map(p => {
      const pContacts = contactos.filter(c => c.proveedor_id === p.id);
      const contact = pContacts[0];
      return `
        <div class="prov-card">
          <div class="prov-card-header">
            <div>
              <div class="prov-card-name">${esc(p.nombre)}</div>
              ${p.rubro ? `<span class="badge badge-rubro" style="margin-top:4px;display:inline-flex">${esc(p.rubro)}</span>` : ''}
            </div>
            <span class="badge ${p.activo ? 'badge-active' : 'badge-inactive'}">${p.activo ? '● Activo' : '○ Inactivo'}</span>
          </div>
          <div class="prov-card-body">
            ${[p.localidad, p.provincia].filter(Boolean).length ? `<div class="prov-card-row">📍 ${[p.localidad,p.provincia].filter(Boolean).map(esc).join(', ')}</div>` : ''}
            ${p.horario ? `<div class="prov-card-row">🕐 ${esc(p.horario)}</div>` : ''}
            ${contact ? `<div class="prov-card-row">👤 ${esc(contact.nombre)}${contact.telefono?' — '+esc(contact.telefono):''}${contact.celular?' / '+esc(contact.celular):''}</div>` : ''}
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

// ===== MODAL PROVEEDOR =====
let contactRowCounter = 0;

function openProvModal(id = null) {
  editingProvId = id;
  const fields = ['nombre','rubro','email','direccion','localidad','provincia','codigo_postal','horario','notas','activo'];
  document.getElementById('contactsContainer').innerHTML = '';
  contactRowCounter = 0;

  if (id) {
    const p = proveedores.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modalProvTitle').textContent = 'Editar Proveedor';
    fields.forEach(f => {
      const el = document.getElementById('p_' + f);
      if (!el) return;
      el.value = f === 'activo' ? String(p[f] !== false) : (p[f] || '');
    });
    contactos.filter(c => c.proveedor_id === id).forEach(c => addContactRow(c));
  } else {
    document.getElementById('modalProvTitle').textContent = 'Nuevo Proveedor';
    fields.forEach(f => {
      const el = document.getElementById('p_' + f);
      if (el) el.value = f === 'activo' ? 'true' : '';
    });
  }

  updateNoContactsMsg();
  document.getElementById('modalProv').classList.add('open');
}

function addContactRow(contact = null) {
  contactRowCounter++;
  const id = contactRowCounter;
  const row = document.createElement('div');
  row.className = 'contact-row';
  row.id = `crow_${id}`;
  row.innerHTML = `
    <button class="btn-remove-contact" onclick="removeContactRow(${id})">✕</button>
    <div class="contact-row-grid">
      <div class="form-group"><label>Nombre y apellido *</label><input type="text" id="cn_${id}" value="${esc(contact?.nombre||'')}" placeholder="Juan Pérez"></div>
      <div class="form-group"><label>Cargo / Rol</label><input type="text" id="cc_${id}" value="${esc(contact?.cargo||'')}" placeholder="Ventas"></div>
      <div class="form-group"><label>Teléfono</label><input type="tel" id="ct_${id}" value="${esc(contact?.telefono||'')}" placeholder="(0000) 000-0000"></div>
      <div class="form-group"><label>Celular / WhatsApp</label><input type="tel" id="cw_${id}" value="${esc(contact?.celular||'')}" placeholder="11 5523-0000"></div>
      <div class="form-group full" style="grid-column:1/-1"><label>Email</label><input type="email" id="ce_${id}" value="${esc(contact?.email||'')}" placeholder="contacto@proveedor.com"></div>
    </div>`;
  row.dataset.existingId = contact?.id || '';
  document.getElementById('contactsContainer').appendChild(row);
  updateNoContactsMsg();
}

function removeContactRow(id) {
  document.getElementById(`crow_${id}`)?.remove();
  updateNoContactsMsg();
}

function updateNoContactsMsg() {
  const container = document.getElementById('contactsContainer');
  document.getElementById('noContactsMsg').style.display = container.children.length === 0 ? 'block' : 'none';
}

async function saveProveedor() {
  const nombre = document.getElementById('p_nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  const userNombre = currentUser?.nombre || currentUser?.email || 'Usuario';
  const body = {
    nombre,
    rubro: document.getElementById('p_rubro').value.trim(),
    email: document.getElementById('p_email').value.trim(),
    direccion: document.getElementById('p_direccion').value.trim(),
    localidad: document.getElementById('p_localidad').value.trim(),
    provincia: document.getElementById('p_provincia').value.trim(),
    codigo_postal: document.getElementById('p_codigo_postal').value.trim(),
    horario: document.getElementById('p_horario').value.trim(),
    notas: document.getElementById('p_notas').value.trim(),
    activo: document.getElementById('p_activo').value === 'true',
    modificado_por: userNombre,
    updated_at: new Date().toISOString()
  };

  const rows = document.querySelectorAll('#contactsContainer .contact-row');
  const contactsData = [];
  for (const row of rows) {
    const idx = row.id.replace('crow_','');
    const nombre_c = document.getElementById(`cn_${idx}`)?.value.trim();
    if (!nombre_c) continue;
    contactsData.push({
      id: row.dataset.existingId || null,
      nombre: nombre_c,
      cargo: document.getElementById(`cc_${idx}`)?.value.trim() || '',
      telefono: document.getElementById(`ct_${idx}`)?.value.trim() || '',
      celular: document.getElementById(`cw_${idx}`)?.value.trim() || '',
      email: document.getElementById(`ce_${idx}`)?.value.trim() || ''
    });
  }

  try {
    let provId;
    if (editingProvId) {
      await sbFetch(`/proveedores?id=eq.${editingProvId}`, { method: 'PATCH', body: JSON.stringify(body) });
      provId = editingProvId;
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
  } catch(e) {
    toast('Error al guardar: ' + e.message, 'error');
  }
}

async function deleteProveedor(id) {
  const p = proveedores.find(x => x.id === id);
  if (!confirm(`¿Eliminar a "${p?.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await sbFetch(`/proveedores?id=eq.${id}`, { method: 'DELETE' });
    toast('Proveedor eliminado', 'error');
    await loadProveedores();
  } catch(e) {
    toast('Error al eliminar', 'error');
  }
}

// ===== DETAIL VIEW PROVEEDOR =====
function openDetail(id) {
  const p = proveedores.find(x => x.id === id);
  if (!p) return;
  currentProvId = id;
  document.getElementById('detailTitle').textContent = p.nombre;
  document.getElementById('detailEditBtn').onclick = () => { closeModal('modalDetail'); openProvModal(id); };

  const pContacts = contactos.filter(c => c.proveedor_id === id);
  const fecha = p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-AR') : '—';

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
    ${pContacts.length === 0 ? '<p style="color:var(--text-muted);font-size:13px">Sin contactos registrados</p>' :
      `<div class="contacts-list">${pContacts.map(c => `
        <div class="contact-card">
          <div class="contact-card-name">${esc(c.nombre)}</div>
          ${c.cargo ? `<div class="contact-card-cargo">${esc(c.cargo)}</div>` : ''}
          <div class="contact-card-info">
            ${c.telefono ? `<span>📞 ${esc(c.telefono)}</span>` : ''}
            ${c.celular ? `<span>📱 ${esc(c.celular)}</span>` : ''}
            ${c.email ? `<span>✉ ${esc(c.email)}</span>` : ''}
          </div>
        </div>`).join('')}
      </div>`}
  `;

  document.getElementById('modalDetail').classList.add('open');
}

function field(label, val) {
  if (!val) return '';
  return `<div class="detail-item"><label>${label}</label><div class="value">${esc(val)}</div></div>`;
}

function openRotuloFromDetail() {
  closeModal('modalDetail');
  openRotulo(currentProvId);
}

// ===== COMISIONISTAS =====
async function loadComisionistas() {
  try {
    comisionistas = await sbFetch('/comisionistas?select=*&order=nombre.asc');
  } catch {
    comisionistas = [];
  }
  renderStatsComisionistas();
  renderComisionistas();
}

function renderStatsComisionistas() {
  const activos = comisionistas.filter(c => c.activo).length;
  const zonas = new Set(comisionistas.map(c => c.zona).filter(Boolean)).size;
  document.getElementById('statsRowCom').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue">🤝</div>
      <div><div class="stat-number">${comisionistas.length}</div><div class="stat-label">Total</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">✅</div>
      <div><div class="stat-number">${activos}</div><div class="stat-label">Activos</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">📍</div>
      <div><div class="stat-number">${zonas}</div><div class="stat-label">Zonas</div></div>
    </div>
  `;
}

function renderComisionistas() {
  const q = document.getElementById('searchCom').value.toLowerCase();
  const zona = document.getElementById('filterZona').value;
  const estado = document.getElementById('filterEstadoCom').value;

  const zonas = [...new Set(comisionistas.map(c => c.zona).filter(Boolean))].sort();
  const sel = document.getElementById('filterZona');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas las zonas</option>' + zonas.map(z => `<option value="${z}" ${z===cur?'selected':''}>${z}</option>`).join('');

  let filtered = comisionistas.filter(c => {
    const matchQ = !q || [c.nombre, c.zona, c.localidad, c.provincia, c.empresa, c.email].some(v => v && v.toLowerCase().includes(q));
    const matchZ = !zona || c.zona === zona;
    const matchE = !estado || (estado === 'activo' ? c.activo : !c.activo);
    return matchQ && matchZ && matchE;
  });

  const tbody = document.getElementById('comTableBody');
  const emptyMsg = `<div class="empty-state"><div class="empty-icon">🤝</div><h3>${comisionistas.length===0?'Sin comisionistas aún':'Sin resultados'}</h3><p>${comisionistas.length===0?'Agregá el primer comisionista.':'Probá con otro filtro.'}</p></div>`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyMsg}</td></tr>`;
    const cards = document.getElementById('comCards');
    if (cards) cards.innerHTML = emptyMsg;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const fecha = c.updated_at ? new Date(c.updated_at).toLocaleDateString('es-AR') : '—';
    return `
      <tr>
        <td>
          <div class="provider-name">${esc(c.nombre)}</div>
          ${c.empresa ? `<div style="font-size:11px;color:var(--text-muted)">${esc(c.empresa)}</div>` : ''}
        </td>
        <td>${c.zona ? `<span class="badge badge-rubro">${esc(c.zona)}</span>` : '—'}</td>
        <td>${[c.localidad, c.provincia].filter(Boolean).map(esc).join(', ') || '—'}</td>
        <td>
          ${c.telefono ? `<div style="font-size:12px">📞 ${esc(c.telefono)}</div>` : ''}
          ${c.celular ? `<div style="font-size:12px">📱 ${esc(c.celular)}</div>` : ''}
          ${!c.telefono && !c.celular ? '<span style="color:var(--text-muted);font-size:12px">—</span>' : ''}
        </td>
        <td><span class="badge ${c.activo ? 'badge-active' : 'badge-inactive'}">${c.activo ? '● Activo' : '○ Inactivo'}</span></td>
        <td><div style="font-size:12px">${fecha}</div><div class="meta-info">por ${esc(c.modificado_por||'—')}</div></td>
        <td>
          <div class="td-actions">
            <button class="btn btn-ghost btn-sm btn-icon" title="Ver" onclick="openDetailCom('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="openComModal('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-danger-ghost btn-sm btn-icon" title="Eliminar" onclick="deleteCom('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
          </div>
        </td>
      </tr>`;
  }).join('');

  const cards = document.getElementById('comCards');
  if (cards) {
    cards.innerHTML = filtered.map(c => `
      <div class="prov-card">
        <div class="prov-card-header">
          <div>
            <div class="prov-card-name">${esc(c.nombre)}</div>
            ${c.zona ? `<span class="badge badge-rubro" style="margin-top:4px;display:inline-flex">${esc(c.zona)}</span>` : ''}
          </div>
          <span class="badge ${c.activo ? 'badge-active' : 'badge-inactive'}">${c.activo ? '● Activo' : '○ Inactivo'}</span>
        </div>
        <div class="prov-card-body">
          ${c.empresa ? `<div class="prov-card-row">🏢 ${esc(c.empresa)}</div>` : ''}
          ${[c.localidad, c.provincia].filter(Boolean).length ? `<div class="prov-card-row">📍 ${[c.localidad,c.provincia].filter(Boolean).map(esc).join(', ')}</div>` : ''}
          ${c.telefono ? `<div class="prov-card-row">📞 ${esc(c.telefono)}</div>` : ''}
          ${c.celular ? `<div class="prov-card-row">📱 ${esc(c.celular)}</div>` : ''}
        </div>
        <div class="prov-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="openDetailCom('${c.id}')">👁 Ver</button>
          <button class="btn btn-ghost btn-sm" onclick="openComModal('${c.id}')">✏️ Editar</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteCom('${c.id}')">🗑</button>
        </div>
      </div>`).join('');
  }
}

function openComModal(id = null) {
  editingComId = id;
  const fields = ['nombre','zona','empresa','telefono','celular','email','localidad','provincia','notas','activo'];

  if (id) {
    const c = comisionistas.find(x => x.id === id);
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
    fields.forEach(f => {
      const el = document.getElementById('com_' + f);
      if (el) el.value = f === 'activo' ? 'true' : '';
    });
    renderCamposCustomInForm({});
  }

  document.getElementById('modalCom').classList.add('open');
}

function renderCamposCustomInForm(extraData = {}) {
  const grid = document.getElementById('comFormGrid');
  grid.querySelectorAll('.campo-custom-dinamico').forEach(el => el.remove());
  if (!camposCustom.length) return;

  camposCustom.forEach(campo => {
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

async function saveComisionista() {
  const nombre = document.getElementById('com_nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  const userNombre = currentUser?.nombre || currentUser?.email || 'Usuario';
  const campos_extra = {};
  camposCustom.forEach(campo => {
    const el = document.getElementById(`cex_${campo.id}`);
    if (el) campos_extra[campo.id] = el.value.trim();
  });

  const body = {
    nombre,
    zona: document.getElementById('com_zona').value.trim(),
    empresa: document.getElementById('com_empresa').value.trim(),
    telefono: document.getElementById('com_telefono').value.trim(),
    celular: document.getElementById('com_celular').value.trim(),
    email: document.getElementById('com_email').value.trim(),
    localidad: document.getElementById('com_localidad').value.trim(),
    provincia: document.getElementById('com_provincia').value.trim(),
    notas: document.getElementById('com_notas').value.trim(),
    activo: document.getElementById('com_activo').value === 'true',
    campos_extra,
    modificado_por: userNombre,
    updated_at: new Date().toISOString()
  };

  try {
    if (editingComId) {
      await sbFetch(`/comisionistas?id=eq.${editingComId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Comisionista actualizado', 'success');
    } else {
      await sbFetch('/comisionistas', { method: 'POST', body: JSON.stringify(body) });
      toast('Comisionista agregado', 'success');
    }
    closeModal('modalCom');
    await loadComisionistas();
  } catch(e) {
    toast('Error al guardar: ' + e.message, 'error');
  }
}

async function deleteCom(id) {
  const c = comisionistas.find(x => x.id === id);
  if (!confirm(`¿Eliminar a "${c?.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await sbFetch(`/comisionistas?id=eq.${id}`, { method: 'DELETE' });
    toast('Comisionista eliminado', 'error');
    await loadComisionistas();
  } catch {
    toast('Error al eliminar', 'error');
  }
}

function openDetailCom(id) {
  const c = comisionistas.find(x => x.id === id);
  if (!c) return;
  document.getElementById('detailComTitle').textContent = c.nombre;
  document.getElementById('detailComEditBtn').onclick = () => { closeModal('modalDetailCom'); openComModal(id); };

  const fecha = c.updated_at ? new Date(c.updated_at).toLocaleDateString('es-AR') : '—';

  let camposExtraHtml = '';
  if (camposCustom.length && c.campos_extra) {
    const conValor = camposCustom.filter(campo => c.campos_extra[campo.id]);
    if (conValor.length) {
      camposExtraHtml = `
        <div class="divider"></div>
        <div style="font-weight:700;color:var(--blue);margin-bottom:12px">📋 Información adicional</div>
        <div class="detail-grid">${conValor.map(campo => field(campo.label, c.campos_extra[campo.id])).join('')}</div>`;
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
    ${camposExtraHtml}
  `;

  document.getElementById('modalDetailCom').classList.add('open');
}

function exportExcelCom() {
  if (comisionistas.length === 0) { toast('Sin datos para exportar', 'error'); return; }

  const rows = comisionistas.map(c => {
    const base = {
      'Nombre': c.nombre,
      'Zona': c.zona || '',
      'Empresa': c.empresa || '',
      'Teléfono': c.telefono || '',
      'Celular': c.celular || '',
      'Email': c.email || '',
      'Localidad': c.localidad || '',
      'Provincia': c.provincia || '',
      'Estado': c.activo ? 'Activo' : 'Inactivo',
      'Notas': c.notas || '',
      'Última modificación': c.updated_at ? new Date(c.updated_at).toLocaleDateString('es-AR') : '',
      'Modificado por': c.modificado_por || ''
    };
    camposCustom.forEach(campo => {
      base[campo.label] = c.campos_extra?.[campo.id] || '';
    });
    return base;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Comisionistas');
  XLSX.writeFile(wb, `comisionistas_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Excel exportado', 'success');
}

// ===== CAMPOS CUSTOM ADMIN =====
function renderCamposCustomAdmin() {
  const list = document.getElementById('camposCustomList');
  const noMsg = document.getElementById('noCamposMsg');
  if (!list) return;

  if (!camposCustom.length) {
    list.innerHTML = '';
    if (noMsg) noMsg.style.display = 'block';
    return;
  }

  if (noMsg) noMsg.style.display = 'none';
  list.innerHTML = camposCustom.map((campo, i) => `
    <div class="campo-custom-row" data-id="${campo.id}">
      <input type="text" class="cc-label" placeholder="Nombre del campo" value="${esc(campo.label)}">
      <select class="cc-tipo">
        <option value="text" ${campo.tipo==='text'?'selected':''}>Texto</option>
        <option value="tel" ${campo.tipo==='tel'?'selected':''}>Teléfono</option>
        <option value="number" ${campo.tipo==='number'?'selected':''}>Número</option>
        <option value="email" ${campo.tipo==='email'?'selected':''}>Email</option>
        <option value="textarea" ${campo.tipo==='textarea'?'selected':''}>Texto largo</option>
      </select>
      <button class="btn-remove-contact" onclick="removeCampoCustomRow(${i})" title="Eliminar campo">✕</button>
    </div>`).join('');
}

function addCampoCustomRow() {
  camposCustom.push({ id: `custom_${Date.now()}`, label: '', tipo: 'text' });
  renderCamposCustomAdmin();
  const inputs = document.querySelectorAll('#camposCustomList .cc-label');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeCampoCustomRow(idx) {
  camposCustom.splice(idx, 1);
  renderCamposCustomAdmin();
}

async function saveCamposCustom() {
  const rows = document.querySelectorAll('#camposCustomList .campo-custom-row');
  const updated = [];
  rows.forEach(row => {
    const label = row.querySelector('.cc-label')?.value.trim();
    const tipo = row.querySelector('.cc-tipo')?.value || 'text';
    const id = row.dataset.id;
    if (label) updated.push({ id, label, tipo });
  });

  try {
    await sbFetch('/configuracion?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify({ comisionistas_campos_custom: updated })
    });
    camposCustom = updated;
    configData.comisionistas_campos_custom = updated;
    renderCamposCustomAdmin();
    toast('Campos guardados', 'success');
  } catch {
    toast('Error al guardar campos', 'error');
  }
}

// ===== RÓTULO =====
const DEFAULT_DESIGN = {
  headerBg: '#1a3a6b', barColor: '#c8222a', barHeight: 4, titleColor: '#1a3a6b',
  textColor: '#333333', bodyBg: '#ffffff', logoSize: 40, logoPos: 'left',
  empresaFont: 'Arial,sans-serif', empresaSize: 14, empresaPos: 'left',
  provFont: 'Arial,sans-serif', provSize: 18, provAlign: 'left',
  empresaColor: '#ffffff', marcoColor: '#1a3a6b', marcoWidth: 1,
};

function getCurrentDesign() {
  return Object.assign({}, DEFAULT_DESIGN, configData.rotulo_design || {});
}

function getRD() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : null; };
  return {
    headerBg: g('rc_headerBg') || DEFAULT_DESIGN.headerBg,
    barColor: g('rc_barColor') || DEFAULT_DESIGN.barColor,
    barHeight: parseInt(g('rc_barHeight') || DEFAULT_DESIGN.barHeight),
    titleColor: g('rc_titleColor') || DEFAULT_DESIGN.titleColor,
    textColor: g('rc_textColor') || DEFAULT_DESIGN.textColor,
    bodyBg: g('rc_bodyBg') || DEFAULT_DESIGN.bodyBg,
    logoSize: parseInt(g('rc_logoSize') || DEFAULT_DESIGN.logoSize),
    logoPos: g('rc_logoPos') || DEFAULT_DESIGN.logoPos,
    empresaFont: g('rc_empresaFont') || DEFAULT_DESIGN.empresaFont,
    empresaSize: parseInt(g('rc_empresaSize') || DEFAULT_DESIGN.empresaSize),
    empresaPos: g('rc_empresaPos') || DEFAULT_DESIGN.empresaPos,
    provFont: g('rc_provFont') || DEFAULT_DESIGN.provFont,
    provSize: parseInt(g('rc_provSize') || DEFAULT_DESIGN.provSize),
    provAlign: g('rc_provAlign') || DEFAULT_DESIGN.provAlign,
    empresaColor: g('rc_empresaColor') || DEFAULT_DESIGN.empresaColor,
    marcoColor: g('rc_marcoColor') || DEFAULT_DESIGN.marcoColor,
    marcoWidth: parseInt(g('rc_marcoWidth') || DEFAULT_DESIGN.marcoWidth),
  };
}

function loadDesignIntoControls(rd) {
  const map = {
    headerBg:'rc_headerBg', barColor:'rc_barColor', titleColor:'rc_titleColor',
    textColor:'rc_textColor', bodyBg:'rc_bodyBg', logoPos:'rc_logoPos',
    empresaFont:'rc_empresaFont', empresaPos:'rc_empresaPos',
    provFont:'rc_provFont', provAlign:'rc_provAlign',
    logoSize:'rc_logoSize', empresaSize:'rc_empresaSize', provSize:'rc_provSize',
    empresaColor:'rc_empresaColor', marcoWidth:'rc_marcoWidth', marcoColor:'rc_marcoColor',
    barHeight:'rc_barHeight'
  };
  Object.keys(map).forEach(k => {
    const el = document.getElementById(map[k]);
    if (el && rd[k] !== undefined) {
      el.value = rd[k];
      const lbl = document.getElementById(map[k]+'Val');
      if (lbl) lbl.textContent = rd[k]+'px';
    }
  });
}

function initAdminRotuloPanel() {}

function openModalRotuloDesign() {
  loadDesignIntoControls(getCurrentDesign());
  const pieEl = document.getElementById('cfg_pie');
  if (pieEl) pieEl.value = configData.rotulo_pie || '';
  renderRotuloToggles();
  selectedDesignSize = 'a4';
  document.querySelectorAll('#modalRotuloDesign .size-btn').forEach(b => b.classList.remove('active'));
  const firstBtn = document.querySelector('#modalRotuloDesign .size-btn');
  if (firstBtn) firstBtn.classList.add('active');
  const dw = document.getElementById('design_w');
  const dh = document.getElementById('design_h');
  if (dw) dw.value = '21';
  if (dh) dh.value = '29.7';
  updateAdminPreview();
  document.getElementById('modalRotuloDesign').classList.add('open');
}

let selectedDesignSize = 'a4';

function selectDesignSize(btn, name) {
  document.querySelectorAll('#modalRotuloDesign .size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedDesignSize = name;
  const wEl = document.getElementById('design_w');
  const hEl = document.getElementById('design_h');
  if (wEl) wEl.value = btn.dataset.w;
  if (hEl) hEl.value = btn.dataset.h;
  updateAdminPreview();
}

function updateAdminPreview() {
  const rd = getRD();
  const mockProv = { nombre: 'Nombre del Proveedor SA', rubro: 'Ejemplo de rubro', direccion: 'Calle Ejemplo 1234', localidad: 'Córdoba', provincia: 'Córdoba', codigo_postal: '5000', horario: 'Lun-Vie 8 a 17hs' };
  renderRotuloPreviewTo('adminRotuloPreview', rd, mockProv, [], '', '');

  const wrap = document.getElementById('adminPreviewWrap');
  const label = document.getElementById('adminPreviewLabel');
  const [dw, dh] = getDesignWH();
  const ratio = dw / dh;

  if (wrap) {
    wrap.style.aspectRatio = String(ratio);
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'stretch';
    if (ratio < 1) { wrap.style.maxWidth = '320px'; wrap.style.margin = '0 auto'; }
    else { wrap.style.maxWidth = '100%'; wrap.style.margin = '0'; }
    const inner = document.getElementById('adminRotuloPreview');
    if (inner) { inner.style.flex = '1'; inner.style.overflow = 'hidden'; }
  }
  if (label) label.textContent = `${dw/10} × ${dh/10} cm`;
}

async function saveRotuloDesignFromAdmin() {
  const rd = getRD();
  const pie = document.getElementById('cfg_pie')?.value.trim() || '';
  const campos = getRotuloToggleValues();
  try {
    await sbFetch('/configuracion?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify({ rotulo_design: rd, rotulo_pie: pie, rotulo_campos: campos })
    });
    configData.rotulo_design = rd;
    configData.rotulo_pie = pie;
    configData.rotulo_campos = campos;
    toast('Diseño guardado como predeterminado', 'success');
  } catch {
    toast('Error al guardar diseño', 'error');
  }
}

async function resetRotuloDesign() {
  if (!confirm('¿Restablecer el diseño original?')) return;
  try {
    await sbFetch('/configuracion?id=eq.1', { method: 'PATCH', body: JSON.stringify({ rotulo_design: DEFAULT_DESIGN }) });
    configData.rotulo_design = { ...DEFAULT_DESIGN };
    loadDesignIntoControls(DEFAULT_DESIGN);
    updateAdminPreview();
    toast('Diseño restablecido', 'success');
  } catch {
    toast('Error al restablecer', 'error');
  }
}

function getRotuloWH() {
  const w = parseFloat(document.getElementById('rotulo_w')?.value) || 21;
  const h = parseFloat(document.getElementById('rotulo_h')?.value) || 29.7;
  return [w * 10, h * 10];
}

function getDesignWH() {
  const w = parseFloat(document.getElementById('design_w')?.value) || 21;
  const h = parseFloat(document.getElementById('design_h')?.value) || 29.7;
  return [w * 10, h * 10];
}

function onCustomSizeInput(ctx) {
  const modal = ctx === 'design' ? '#modalRotuloDesign' : '#modalRotulo';
  document.querySelectorAll(modal + ' .size-btn').forEach(b => b.classList.remove('active'));
  if (ctx === 'design') updateAdminPreview();
  else renderRotuloPreview();
}

function openRotulo(id) {
  rotuloProvId = id;
  document.getElementById('rotuloDetalle').value = '';
  document.getElementById('rotuloExtra').value = '';
  document.querySelectorAll('#modalRotulo .size-btn').forEach(b => b.classList.remove('active'));
  const a4btn = document.querySelector('#modalRotulo .size-btn');
  if (a4btn) a4btn.classList.add('active');
  const wEl = document.getElementById('rotulo_w');
  const hEl = document.getElementById('rotulo_h');
  if (wEl) wEl.value = '21';
  if (hEl) hEl.value = '29.7';
  renderRotuloPreview();
  document.getElementById('modalRotulo').classList.add('open');
}

function selectSize(btn, name) {
  document.querySelectorAll('#modalRotulo .size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const wEl = document.getElementById('rotulo_w');
  const hEl = document.getElementById('rotulo_h');
  if (wEl) wEl.value = btn.dataset.w;
  if (hEl) hEl.value = btn.dataset.h;
  renderRotuloPreview();
}

function renderRotuloPreviewTo(targetId, rd, pData, pContactsData, detalleText, extraText) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const campos = configData.rotulo_campos || { horario: true, direccion: true, telefono: true };
  const pie = configData.rotulo_pie || '';
  const empresa = configData.empresa_nombre || 'Cremac';
  const logo = logoBase64 || configData.logo_base64 || '';
  const fecha = new Date().toLocaleDateString('es-AR');
  const contact = pContactsData && pContactsData[0];
  const detalle = detalleText || '';
  const extra = extraText || '';

  const logoHtml = logo ? `<img src="${logo}" style="height:${rd.logoSize}px;object-fit:contain;flex-shrink:0" alt="${esc(empresa)}">` : '';
  const nameHtml = rd.empresaPos !== 'hidden' ? `<div style="font-family:${rd.empresaFont};font-size:${rd.empresaSize}px;font-weight:bold;color:${rd.empresaColor||'#ffffff'};${rd.empresaPos==='right'?'margin-left:auto':''}">${esc(empresa)}</div>` : '';

  let headerContent = '';
  if (rd.logoPos === 'center') headerContent = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%">${logoHtml}${nameHtml}</div>`;
  else if (rd.logoPos === 'right') headerContent = `<div style="display:flex;align-items:center;width:100%;justify-content:space-between">${nameHtml}${logoHtml}</div>`;
  else headerContent = `<div style="display:flex;align-items:center;gap:12px;width:100%">${logoHtml}${nameHtml}</div>`;

  el.innerHTML = `
    <div style="border:${rd.marcoWidth>0?rd.marcoWidth+'px solid '+rd.marcoColor:'none'};border-radius:8px;overflow:hidden;background:${rd.bodyBg};font-family:Arial,sans-serif">
      <div style="background:${rd.headerBg};padding:10px 14px;display:flex;align-items:center">${headerContent}</div>
      ${rd.barHeight > 0 ? `<div style="height:${rd.barHeight}px;background:${rd.barColor}"></div>` : ''}
      <div style="padding:14px">
        <div style="font-family:${rd.provFont};font-size:${rd.provSize}px;font-weight:bold;color:${rd.titleColor};text-align:${rd.provAlign};margin-bottom:10px">${esc(pData.nombre||'')}</div>
        ${campos.rubro && pData.rubro ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>Rubro:</strong> ${esc(pData.rubro)}</div>` : ''}
        ${campos.direccion && pData.direccion ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>Dirección:</strong> ${esc([pData.direccion,pData.localidad,pData.provincia,pData.codigo_postal?'CP '+pData.codigo_postal:''].filter(Boolean).join(', '))}</div>` : ''}
        ${campos.horario && pData.horario ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>Horario:</strong> ${esc(pData.horario)}</div>` : ''}
        ${contact && campos.telefono && (contact.telefono||contact.celular) ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>Contacto:</strong> ${esc(contact.nombre)}${contact.cargo?' ('+esc(contact.cargo)+')':''}${contact.telefono?' — '+esc(contact.telefono):''}${contact.celular?' / '+esc(contact.celular):''}</div>` : ''}
        ${extra ? `<div style="font-size:12px;font-weight:bold;color:${rd.barColor};margin-bottom:4px">⚠ ${esc(extra)}</div>` : ''}
        ${detalle ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #ddd"><div style="font-size:10px;text-transform:uppercase;color:#999;font-weight:bold;margin-bottom:3px">Detalle</div><div style="font-size:12px;color:${rd.textColor};white-space:pre-wrap">${esc(detalle)}</div></div>` : ''}
      </div>
      <div style="background:#f7f9fc;border-top:1px solid #ddd;padding:6px 14px;display:flex;justify-content:space-between;font-size:10px;color:#999">
        <span>${pie ? esc(pie) : esc(empresa)}</span>
        <span>📅 ${fecha}</span>
      </div>
    </div>`;
}

function renderRotuloPreview() {
  const p = proveedores.find(x => x.id === rotuloProvId);
  if (!p) return;
  const rd = getCurrentDesign();
  const pContacts = contactos.filter(c => c.proveedor_id === p.id);
  renderRotuloPreviewTo('rotuloPreview', rd, p, pContacts, document.getElementById('rotuloDetalle').value, document.getElementById('rotuloExtra').value);
}

async function generatePDF() {
  const p = proveedores.find(x => x.id === rotuloProvId);
  if (!p) return;
  const { jsPDF } = window.jspdf;
  const rd = getCurrentDesign();
  const [w, h] = getRotuloWH();
  const isSmall = w <= 110 && h <= 80;
  const doc = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'mm', format: [w, h] });
  const pContacts = contactos.filter(c => c.proveedor_id === p.id);
  const campos = configData.rotulo_campos || { horario: true, direccion: true, telefono: true };
  const detalle = document.getElementById('rotuloDetalle').value;
  const extra = document.getElementById('rotuloExtra').value;
  const pie = configData.rotulo_pie || '';
  const empresa = configData.empresa_nombre || 'Cremac';
  const logo = logoBase64 || configData.logo_base64 || '';
  const fecha = new Date().toLocaleDateString('es-AR');
  const contact = pContacts[0];
  const margin = isSmall ? 4 : 12;
  const contentW = w - margin * 2;
  const hexRgb = hex => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  let y = 0;
  const headerH = isSmall ? 12 : 18;
  const [hr,hg,hb] = hexRgb(rd.headerBg);
  doc.setFillColor(hr,hg,hb); doc.rect(0,0,w,headerH,'F');
  if (logo) { try { const imgH=isSmall?8:rd.logoSize/4; const imgW=imgH*2; let logoX=margin; if(rd.logoPos==='center')logoX=(w-imgW)/2; if(rd.logoPos==='right')logoX=w-margin-imgW; doc.addImage(logo,'PNG',logoX,isSmall?2:(headerH-imgH)/2,imgW,imgH); } catch {} }
  if (rd.empresaPos !== 'hidden') { doc.setTextColor(255,255,255); doc.setFontSize(isSmall?7:rd.empresaSize*0.75); doc.setFont('helvetica','bold'); const nameX=rd.empresaPos==='center'?w/2:(rd.empresaPos==='right'?w-margin:(logo?margin+(isSmall?16:rd.logoSize/2+4):margin)); const align=rd.empresaPos==='center'?'center':(rd.empresaPos==='right'?'right':'left'); doc.text(empresa,nameX,headerH/2+2,{align}); }
  if (rd.barHeight>0) { const [br,bg,bb]=hexRgb(rd.barColor); doc.setFillColor(br,bg,bb); doc.rect(0,headerH,w,isSmall?1.5:rd.barHeight*0.4,'F'); y=headerH+(isSmall?1.5:rd.barHeight*0.4); } else { y=headerH; }
  y+=isSmall?4:8;
  const [tr,tg,tb]=hexRgb(rd.titleColor); doc.setTextColor(tr,tg,tb); doc.setFontSize(isSmall?9:rd.provSize*0.7); doc.setFont('helvetica','bold');
  const provX=rd.provAlign==='center'?w/2:(rd.provAlign==='right'?w-margin:margin);
  doc.text(p.nombre,provX,y,{align:rd.provAlign}); y+=isSmall?5:8;
  const lineH=isSmall?4:6; const [txr,txg,txb]=hexRgb(rd.textColor); doc.setFontSize(isSmall?7:10);
  const addLine=(label,value)=>{ if(!value)return; doc.setTextColor(100,100,100); doc.setFont('helvetica','bold'); doc.text(label+':',margin,y); doc.setFont('helvetica','normal'); doc.setTextColor(txr,txg,txb); const lines=doc.splitTextToSize(value,contentW-25); doc.text(lines,margin+22,y); y+=lineH*lines.length; };
  if(campos.rubro&&p.rubro)addLine('Rubro',p.rubro);
  if(campos.direccion&&p.direccion)addLine('Dirección',[p.direccion,p.localidad,p.provincia,p.codigo_postal?'CP '+p.codigo_postal:''].filter(Boolean).join(', '));
  if(campos.horario&&p.horario)addLine('Horario',p.horario);
  if(contact&&campos.telefono&&(contact.telefono||contact.celular))addLine('Contacto',`${contact.nombre}${contact.cargo?' ('+contact.cargo+')':''}${contact.telefono?' — '+contact.telefono:''}${contact.celular?' / '+contact.celular:''}`);
  if(extra){const [br,bg,bb]=hexRgb(rd.barColor);doc.setTextColor(br,bg,bb);doc.setFont('helvetica','bold');doc.text('! '+extra,margin,y);y+=lineH;}
  if(detalle){y+=3;doc.setDrawColor(200,200,200);doc.line(margin,y,w-margin,y);y+=4;doc.setTextColor(120,120,120);doc.setFontSize(isSmall?6:8);doc.setFont('helvetica','bold');doc.text('DETALLE:',margin,y);y+=lineH-1;doc.setFont('helvetica','normal');doc.setTextColor(txr,txg,txb);doc.setFontSize(isSmall?7:10);const lines=doc.splitTextToSize(detalle,contentW);doc.text(lines,margin,y);}
  const footerH=isSmall?7:10; doc.setFillColor(247,249,252); doc.rect(0,h-footerH,w,footerH,'F'); doc.setDrawColor(221,227,236); doc.line(0,h-footerH,w,h-footerH); doc.setTextColor(150,150,150); doc.setFontSize(isSmall?5:8); doc.setFont('helvetica','normal');
  doc.text(pie||empresa,margin,h-footerH+(isSmall?4.5:7)); doc.text(fecha,w-margin,h-footerH+(isSmall?4.5:7),{align:'right'});
  if(rd.marcoWidth>0){const [mr,mg,mb]=hexRgb(rd.marcoColor);doc.setDrawColor(mr,mg,mb);doc.setLineWidth(rd.marcoWidth*0.3);doc.rect(rd.marcoWidth*0.15,rd.marcoWidth*0.15,w-rd.marcoWidth*0.3,h-rd.marcoWidth*0.3);}
  doc.save(`rotulo_${p.nombre.replace(/\s+/g,'_')}_${w}x${h}mm.pdf`);
  toast('PDF generado', 'success');
}

async function previewPDF() {
  const p = proveedores.find(x => x.id === rotuloProvId);
  if (!p) return;
  const { jsPDF } = window.jspdf;
  const rd = getCurrentDesign();
  const [w, h] = getRotuloWH();
  const isSmall = w <= 110 && h <= 80;
  const doc = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'mm', format: [w, h] });
  const pContacts = contactos.filter(c => c.proveedor_id === p.id);
  const campos = configData.rotulo_campos || { horario: true, direccion: true, telefono: true };
  const detalle = document.getElementById('rotuloDetalle').value;
  const extra = document.getElementById('rotuloExtra').value;
  const pie = configData.rotulo_pie || '';
  const empresa = configData.empresa_nombre || 'Cremac';
  const logo = logoBase64 || configData.logo_base64 || '';
  const fecha = new Date().toLocaleDateString('es-AR');
  const contact = pContacts[0];
  const margin = isSmall ? 4 : 14;
  const contentW = w - margin * 2;
  const hexRgb = hex => [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
  let y = 0;
  const headerH = isSmall ? 12 : 18;
  const [hr,hg,hb] = hexRgb(rd.headerBg);
  doc.setFillColor(hr,hg,hb); doc.rect(0,0,w,headerH,'F');
  if(logo){try{const imgH=isSmall?8:rd.logoSize/4;const imgW=imgH*2;let lx=margin;if(rd.logoPos==='center')lx=(w-imgW)/2;if(rd.logoPos==='right')lx=w-margin-imgW;doc.addImage(logo,'PNG',lx,isSmall?2:(headerH-imgH)/2,imgW,imgH);}catch{}}
  if(rd.empresaPos!=='hidden'){const [ecr2,ecg2,ecb2]=hexRgb(rd.empresaColor||'#ffffff');doc.setTextColor(ecr2,ecg2,ecb2);doc.setFontSize(isSmall?7:rd.empresaSize*0.75);doc.setFont('helvetica','bold');const nx=rd.empresaPos==='center'?w/2:(rd.empresaPos==='right'?w-margin:(logo?margin+(isSmall?16:rd.logoSize/2+4):margin));doc.text(empresa,nx,headerH/2+2,{align:rd.empresaPos==='center'?'center':(rd.empresaPos==='right'?'right':'left')});}
  if(rd.barHeight>0){const [br,bg,bb]=hexRgb(rd.barColor);doc.setFillColor(br,bg,bb);doc.rect(0,headerH,w,isSmall?1.5:rd.barHeight*0.4,'F');y=headerH+(isSmall?1.5:rd.barHeight*0.4);}else{y=headerH;}
  y+=isSmall?4:8;
  const [tr,tg,tb]=hexRgb(rd.titleColor);doc.setTextColor(tr,tg,tb);doc.setFontSize(isSmall?9:rd.provSize*0.7);doc.setFont('helvetica','bold');
  const provX=rd.provAlign==='center'?w/2:(rd.provAlign==='right'?w-margin:margin);
  doc.text(p.nombre,provX,y,{align:rd.provAlign});y+=isSmall?5:8;
  const lineH=isSmall?4:6;const [txr,txg,txb]=hexRgb(rd.textColor);doc.setFontSize(isSmall?7:10);
  const addLine=(lbl,val)=>{if(!val)return;doc.setTextColor(100,100,100);doc.setFont('helvetica','bold');doc.text(lbl+':',margin,y);doc.setFont('helvetica','normal');doc.setTextColor(txr,txg,txb);const ls=doc.splitTextToSize(val,contentW-25);doc.text(ls,margin+22,y);y+=lineH*ls.length;};
  if(campos.rubro&&p.rubro)addLine('Rubro',p.rubro);
  if(campos.direccion&&p.direccion)addLine('Direccion',[p.direccion,p.localidad,p.provincia,p.codigo_postal?'CP '+p.codigo_postal:''].filter(Boolean).join(', '));
  if(campos.horario&&p.horario)addLine('Horario',p.horario);
  if(contact&&campos.telefono&&(contact.telefono||contact.celular))addLine('Contacto',`${contact.nombre}${contact.cargo?' ('+contact.cargo+')':''}${contact.telefono?' - '+contact.telefono:''}${contact.celular?' / '+contact.celular:''}`);
  if(extra){const [br,bg,bb]=hexRgb(rd.barColor);doc.setTextColor(br,bg,bb);doc.setFont('helvetica','bold');doc.text('! '+extra,margin,y);y+=lineH;}
  if(detalle){y+=3;doc.setDrawColor(200,200,200);doc.line(margin,y,w-margin,y);y+=4;doc.setTextColor(120,120,120);doc.setFontSize(isSmall?6:8);doc.setFont('helvetica','bold');doc.text('DETALLE:',margin,y);y+=lineH-1;doc.setFont('helvetica','normal');doc.setTextColor(txr,txg,txb);doc.setFontSize(isSmall?7:10);const ls=doc.splitTextToSize(detalle,contentW);doc.text(ls,margin,y);}
  const footerH=isSmall?7:10;doc.setFillColor(247,249,252);doc.rect(0,h-footerH,w,footerH,'F');doc.setDrawColor(221,227,236);doc.line(0,h-footerH,w,h-footerH);doc.setTextColor(150,150,150);doc.setFontSize(isSmall?5:8);doc.setFont('helvetica','normal');
  doc.text(pie||empresa,margin,h-footerH+(isSmall?4.5:7));doc.text(fecha,w-margin,h-footerH+(isSmall?4.5:7),{align:'right'});
  if(rd.marcoWidth>0){const [mr,mg,mb]=hexRgb(rd.marcoColor);doc.setDrawColor(mr,mg,mb);doc.setLineWidth(rd.marcoWidth*0.3);doc.rect(rd.marcoWidth*0.15,rd.marcoWidth*0.15,w-rd.marcoWidth*0.3,h-rd.marcoWidth*0.3);}
  window.open(doc.output('bloburl'), '_blank');
}

// ===== EXPORT EXCEL PROVEEDORES =====
function exportExcel() {
  if (proveedores.length === 0) { toast('Sin datos para exportar', 'error'); return; }
  const rows = proveedores.map(p => {
    const pContacts = contactos.filter(c => c.proveedor_id === p.id);
    return {
      'Nombre': p.nombre, 'Rubro': p.rubro||'', 'Email': p.email||'',
      'Dirección': p.direccion||'', 'Localidad': p.localidad||'', 'Provincia': p.provincia||'',
      'Horario': p.horario||'', 'Estado': p.activo?'Activo':'Inactivo', 'Notas': p.notas||'',
      'Última modificación': p.updated_at?new Date(p.updated_at).toLocaleDateString('es-AR'):'',
      'Modificado por': p.modificado_por||'',
      'Contactos': pContacts.map(c=>`${c.nombre}${c.cargo?' ('+c.cargo+')':''}${c.telefono?' T:'+c.telefono:''}${c.celular?' C:'+c.celular:''}`).join(' | ')
    };
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(()=>({wch:20}));
  XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
  XLSX.writeFile(wb, `proveedores_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Excel exportado', 'success');
}

// ===== USERS =====
async function loadUsers() {
  try {
    const users = await sbFetch('/usuarios_perfil?select=*&order=nombre.asc');
    const tbody = document.getElementById('usersTableBody');
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin usuarios registrados</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${esc(u.nombre||'')} ${esc(u.apellido||'')}</strong></td>
        <td>${esc(u.email||'')}</td>
        <td><span class="badge ${u.rol==='admin'?'badge-rubro':'badge-active'}">${u.rol==='admin'?'Admin':'Usuario'}</span></td>
        <td><span class="badge ${u.activo!==false?'badge-active':'badge-inactive'}">${u.activo!==false?'Activo':'Inactivo'}</span></td>
        <td><div class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="openUserModal('${u.id}')">Editar</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="toggleUserActivo('${u.id}',${u.activo!==false})">${u.activo!==false?'Desactivar':'Activar'}</button>
        </div></td>
      </tr>`).join('');
  } catch { toast('Error al cargar usuarios', 'error'); }
}

function openUserModal(id = null) {
  editingUserId = id;
  document.getElementById('modalUserTitle').textContent = id ? 'Editar Usuario' : 'Nuevo Usuario';
  document.getElementById('u_passGroup').style.display = id ? 'none' : 'block';
  if (id) {
    ['nombre','apellido','email'].forEach(f => { document.getElementById('u_'+f).value = ''; });
  } else {
    ['nombre','apellido','email','pass'].forEach(f => { const el = document.getElementById('u_'+f); if(el) el.value = ''; });
    document.getElementById('u_rol').value = 'user';
  }
  document.getElementById('modalUser').classList.add('open');
}

async function saveUser() {
  const nombre = document.getElementById('u_nombre').value.trim();
  const apellido = document.getElementById('u_apellido').value.trim();
  const email = document.getElementById('u_email').value.trim();
  const pass = document.getElementById('u_pass').value;
  const rol = document.getElementById('u_rol').value;

  if (!nombre || !email) { toast('Nombre y email son obligatorios', 'error'); return; }

  if (!editingUserId) {
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
    } catch(e) { toast('Error: ' + e.message, 'error'); return; }
  } else {
    try {
      await sbFetch(`/usuarios_perfil?id=eq.${editingUserId}`, { method: 'PATCH', body: JSON.stringify({ nombre, apellido, rol }) });
      toast('Usuario actualizado', 'success');
    } catch { toast('Error al actualizar', 'error'); return; }
  }

  closeModal('modalUser');
  loadUsers();
}

async function toggleUserActivo(id, isActive) {
  try {
    await sbFetch(`/usuarios_perfil?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ activo: !isActive }) });
    toast(isActive ? 'Usuario desactivado' : 'Usuario activado', 'success');
    loadUsers();
  } catch { toast('Error al actualizar usuario', 'error'); }
}

// ===== TABS =====
function showTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelectorAll('.mobile-nav-item').forEach(t => t.classList.remove('active'));
  document.getElementById('mm-' + tab)?.classList.add('active');
  document.getElementById('paneProveedores').style.display = tab === 'proveedores' ? 'block' : 'none';
  document.getElementById('paneComisionistas').style.display = tab === 'comisionistas' ? 'block' : 'none';
  document.getElementById('paneAdmin').style.display = tab === 'admin' ? 'block' : 'none';
  if (tab === 'admin') { loadUsers(); initAdminRotuloPanel(); }
  if (tab === 'comisionistas') { loadComisionistas(); }
}

// ===== MODALS =====
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    closeMobileMenu();
  }
});

// ===== TOAST =====
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  const icons = { success: '✓', error: '✕' };
  el.innerHTML = `<span style="color:${type==='success'?'var(--success)':'var(--danger)'};font-size:16px">${icons[type]||'ℹ'}</span> ${msg}`;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3200);
}

// ===== UTILS =====
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
