import { state }                                                     from './state.js';
import { closeModal, toast, toggleMobileMenu, closeMobileMenu }      from './ui.js';
import { doLogin, doLogout, loadUserProfile }                        from './auth.js';
import { loadConfig, saveConfig, handleLogoUpload }                  from './config.js';
import { loadProveedores, renderProveedores,
         openProvModal, addContactRow, removeContactRow,
         saveProveedor, deleteProveedor,
         openDetail, openRotuloFromDetail, exportExcel }             from './proveedores.js';
import { loadComisionistas, renderComisionistas,
         openComModal, saveComisionista, deleteCom,
         openDetailCom, exportExcelCom }                             from './comisionistas.js';
import { loadUsers, openUserModal, saveUser, toggleUserActivo,
         addCampoCustomRow, removeCampoCustomRow, saveCamposCustom } from './admin.js';
import { openRotulo, selectSize, selectDesignSize, updateAdminPreview,
         saveRotuloDesignFromAdmin, resetRotuloDesign, onCustomSizeInput,
         renderRotuloPreview, guardarRotulo, descargarRotuloGuardado,
         vistaPreviaRotuloGuardado, openModalRotuloDesign, toggleRotuloCampo,
         deleteRotuloGuardado, editRotuloGuardado, verVersionesRotulo,
         loadRotulosScreen, renderRotulosScreen }                    from './rotulo.js';
import { loadTareas, setTareasFilter, openNewTaskModal, saveNewTask,
         openTaskDetail, completeTask, cancelTask,
         openReprogramModal, saveReprogram,
         openDayClose, processPendingTasks, showTareasTab,
         toggleVistaDropdown, setTaskView }          from './tareas.js';
import { sbFetch } from './api.js';

// ===== NOMBRE PERSONALIZADO =====
function updateUserDisplay() {
  const nombre   = state.currentUser?.nombre   || state.currentUser?.email?.split('@')[0] || 'Usuario';
  const apellido = state.currentUser?.apellido || '';
  const fullName = `${nombre} ${apellido}`.trim();
  const initial  = (nombre[0] || 'U').toUpperCase();

  document.getElementById('userName').textContent      = fullName;
  document.getElementById('userAvatar').textContent    = initial;
  document.getElementById('mobileUsername').textContent = fullName;
  document.getElementById('mobileEmail').textContent   = state.currentUser?.email || '';
  document.getElementById('mobileAvatar').textContent  = initial;
  document.getElementById('launcherGreeting').textContent = 'Hola, ' + nombre + ' \uD83D\uDC4B';
}

// ===== APP INIT =====
async function initApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').classList.add('visible');

  updateUserDisplay();

  if (state.isAdmin) {
    document.getElementById('tab-admin').style.display = 'flex';
    document.getElementById('mm-admin').style.display  = 'flex';
  }

  showLauncher();
}

// ===== LAUNCHER =====
function showLauncher() {
  state.activeModule = null;
  document.body.classList.remove('tareas-mode');
  document.getElementById('launcherScreen').classList.add('visible');
  document.getElementById('directorioWrap').style.display = 'none';
  document.getElementById('tareasWrap').style.display = 'none';
  document.getElementById('headerSwitchBtn').style.display = 'none';
}

async function openModule(mod) {
  document.getElementById('launcherScreen').classList.remove('visible');
  document.getElementById('headerSwitchBtn').style.display = 'flex';

  if (mod === 'directorio') {
    state.activeModule = 'directorio';
    document.body.classList.remove('tareas-mode');
    document.getElementById('directorioWrap').style.display = 'block';
    document.getElementById('tareasWrap').style.display = 'none';
    document.getElementById('headerSwitchLabel').textContent = '\uD83D\uDCCB Tareas';
    await loadConfig();
    await loadProveedores();
  } else if (mod === 'tareas') {
    state.activeModule = 'tareas';
    document.body.classList.add('tareas-mode');
    document.getElementById('directorioWrap').style.display = 'none';
    document.getElementById('tareasWrap').style.display = 'block';
    document.getElementById('headerSwitchLabel').textContent = '\uD83E\uDDC0 Directorio';
    // Auto-procesar tareas pendientes al entrar
    try {
      await sbFetch('/rpc/process_pending_tasks_for_user', {
        method: 'POST',
        body: JSON.stringify({ target_user_id: state.currentUser.id })
      });
    } catch {}
    await loadTareas();
  }
}

function switchModule() {
  if (state.activeModule === 'directorio') {
    openModule('tareas');
  } else if (state.activeModule === 'tareas') {
    openModule('directorio');
  } else {
    showLauncher();
  }
}

function goHome() {
  showLauncher();
}

// ===== USER DROPDOWN =====
function toggleUserDropdown() {
  document.getElementById('userDropdown').classList.toggle('open');
}

function closeUserDropdown() {
  document.getElementById('userDropdown')?.classList.remove('open');
}

document.addEventListener('click', e => {
  const dd = document.getElementById('userDropdown');
  const badge = document.querySelector('.user-badge');
  if (dd?.classList.contains('open') && !badge?.contains(e.target) && !dd.contains(e.target)) {
    dd.classList.remove('open');
  }
});

// ===== PERFIL =====
function openProfile() {
  const u = state.currentUser;
  document.getElementById('pf_nombre').value = u?.nombre || '';
  document.getElementById('pf_apellido').value = u?.apellido || '';
  document.getElementById('profileEmail').textContent = u?.email || '';
  const initial = ((u?.nombre || u?.email || 'U')[0] || 'U').toUpperCase();
  document.getElementById('profileAvatar').textContent = initial;

  const status = u?.access_status || (u?.activo !== false ? 'active' : 'blocked');
  const statusMap = {
    active:  { label: 'Activo',    cls: 'badge-active' },
    trial:   { label: 'Prueba',    cls: 'badge-rubro' },
    blocked: { label: 'Bloqueado', cls: 'badge-inactive' },
    expired: { label: 'Expirado',  cls: 'badge-inactive' },
  };
  const s = statusMap[status] || statusMap.active;
  const badge = document.getElementById('profileAccessBadge');
  badge.textContent = s.label;
  badge.className = 'badge ' + s.cls;

  document.getElementById('modalProfile').classList.add('open');
}

async function saveProfile() {
  const nombre = document.getElementById('pf_nombre').value.trim();
  const apellido = document.getElementById('pf_apellido').value.trim();

  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  try {
    await sbFetch('/usuarios_perfil?id=eq.' + state.currentUser.id, {
      method: 'PATCH',
      body: JSON.stringify({ nombre, apellido })
    });
    state.currentUser.nombre = nombre;
    state.currentUser.apellido = apellido;
    updateUserDisplay();
    closeModal('modalProfile');
    toast('Perfil actualizado', 'success');
  } catch (e) {
    toast('Error al guardar: ' + e.message, 'error');
  }
}

// ===== TABS =====
function showTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelectorAll('.mobile-nav-item').forEach(t => t.classList.remove('active'));
  document.getElementById('mm-' + tab)?.classList.add('active');
  document.getElementById('paneProveedores').style.display   = tab === 'proveedores'   ? 'block' : 'none';
  document.getElementById('paneComisionistas').style.display = tab === 'comisionistas' ? 'block' : 'none';
  document.getElementById('paneRotulos').style.display       = tab === 'rotulos'       ? 'block' : 'none';
  document.getElementById('paneAdmin').style.display         = tab === 'admin'         ? 'block' : 'none';
  if (tab === 'admin')         loadUsers();
  if (tab === 'comisionistas') loadComisionistas();
  if (tab === 'rotulos')       loadRotulosScreen();
}

// ===== ANIMACION DE FONDO (LOGIN) =====
(function initAuthDeco() {
  const cheeses = ['\uD83E\uDDC0', '\uD83E\uDD5B', '\uD83E\uDED9'];
  const deco    = document.getElementById('authDeco');
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className           = 'cheese-float';
    el.textContent         = cheeses[i % cheeses.length];
    el.style.left              = (Math.random() * 100) + '%';
    el.style.animationDuration = (8 + Math.random() * 12) + 's';
    el.style.animationDelay    = (-Math.random() * 15) + 's';
    el.style.fontSize          = (24 + Math.random() * 30) + 'px';
    deco.appendChild(el);
  }
})();

// ===== EVENTOS GLOBALES =====
document.getElementById('loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('loginPass').addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    closeMobileMenu();
    closeUserDropdown();
  }
});

// Recuperar sesion al cargar la pagina
window.addEventListener('load', async () => {
  const token = localStorage.getItem('sb_token');
  const uid   = localStorage.getItem('sb_user_id');
  const email = localStorage.getItem('sb_user_email');
  if (token && uid) {
    try {
      await loadUserProfile(uid, email);
      await initApp();
    } catch {}
  }
});

// El modulo auth.js despacha este evento tras un login exitoso
document.addEventListener('userReady', initApp);

// ===== EXPONER AL SCOPE GLOBAL =====
Object.assign(window, {
  // Auth
  doLogin, doLogout,
  // Navegacion
  showTab, toggleMobileMenu, closeMobileMenu, closeModal,
  // Launcher
  openModule, switchModule, goHome, showLauncher,
  // User dropdown & perfil
  toggleUserDropdown, closeUserDropdown, openProfile, saveProfile,
  // Proveedores
  renderProveedores, openProvModal, addContactRow, removeContactRow,
  saveProveedor, deleteProveedor, openDetail, openRotuloFromDetail, exportExcel,
  // Comisionistas
  renderComisionistas, openComModal, saveComisionista, deleteCom, openDetailCom, exportExcelCom,
  // Admin
  loadUsers, openUserModal, saveUser, toggleUserActivo,
  addCampoCustomRow, removeCampoCustomRow, saveCamposCustom,
  // Config
  saveConfig, handleLogoUpload,
  // Rotulo
  openRotulo, selectSize, selectDesignSize, updateAdminPreview,
  saveRotuloDesignFromAdmin, resetRotuloDesign, onCustomSizeInput,
  renderRotuloPreview, guardarRotulo, descargarRotuloGuardado, vistaPreviaRotuloGuardado,
  openModalRotuloDesign, toggleRotuloCampo,
  deleteRotuloGuardado, editRotuloGuardado, verVersionesRotulo,
  loadRotulosScreen, renderRotulosScreen,
  // Tareas
  loadTareas, setTareasFilter, openNewTaskModal, saveNewTask,
  openTaskDetail, completeTask, cancelTask,
  openReprogramModal, saveReprogram,
  openDayClose, processPendingTasks, showTareasTab,
  toggleVistaDropdown, setTaskView,
  _currentTaskId: () => state.currentTaskId,
});
