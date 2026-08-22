import { state, guardarUbicacion, leerUbicacionGuardada }           from './state.js';
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
import { loadUsers, openUserModal, saveUser, toggleUserActivo, deleteUserAccount,
         addCampoCustomRow, removeCampoCustomRow, saveCamposCustom, loadAuditLog, isOwner } from './admin.js';
import { selectDesignSize, updateAdminPreview, saveRotuloDesignFromAdmin,
         resetRotuloDesign, initRotuloDesignTab, toggleRotuloCampo,
         guardarComoModelo, usarModeloRotulo, eliminarModeloRotulo }    from './rotuloDesign.js';
import { openRotulo, selectSize, renderRotuloPreview, guardarRotulo,
         descargarRotuloGuardado, vistaPreviaRotuloGuardado,
         editRotuloGuardado, onBultoTotalChange }                      from './rotuloCrear.js';
import { deleteRotuloGuardado, verVersionesRotulo,
         loadRotulosScreen, renderRotulosScreen, abrirBultosRotulo }   from './rotuloLista.js';
import { abrirFotosRotulo, handleRotuloFotosUpload, deleteRotuloFoto } from './rotuloFotos.js';
import { loadTareas, setTareasFilter, openNewTaskModal, saveNewTask,
         openTaskDetail, completeTask, cancelTask,
         openReprogramModal, saveReprogram,
         toggleVistaDropdown, setTaskView }          from './tareas.js';
import { initMantenimientoAccess, showMantenimiento, exitMantenimiento,
         showMantTab, showMantAdminSubtab, isMantenimientoAdmin }      from './mantenimiento.js';
import { renderItems, onFamiliaFiltroChange, openItemModal, onModalFamiliaChange,
         updateCodigoPreview, promptNuevaFamilia, promptNuevaSubfamilia,
         saveItem, deleteItem, openItemDetalle, subirFotoDetalle, eliminarFotoDetalle,
         descargarQRDeItem }                                           from './items.js';
import { renderFamiliasPanel, saveFamiliaNombre, saveSubfamiliaNombre } from './familias.js';
import { addSector, saveSectorNombre, toggleSectorActivo } from './sectores.js';
import { abrirGenerarQR, renderQRBusqueda, agregarQRSeleccion, confirmarCantidadQR,
         actualizarCantidadQR, quitarQRSeleccion, generarQREtiquetasSeleccion } from './qrLabels.js';
import { abrirEscaner, cerrarEscaner, terminarEscaneo, removeFromRetiroCartYRefrescarScan } from './scanner.js';
import { addToRetiroCart, updateRetiroCantidad, updateRetiroObservacion,
         removeFromRetiroCart, confirmRetiro, enviarRetiroFinal, toggleHistorialDia,
         updateHistorialCantidad, deleteHistorialItem, renderHistorialRetiros,
         exportarRetirosPendientes, abrirExportarPeriodo, exportarRetirosPeriodo } from './retiros.js';
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
}

// ===== APP INIT =====
async function initApp() {
  document.getElementById('authScreen').style.display = 'none';

  const mantenimientoOnly = initMantenimientoAccess();
  updateUserDisplay();
  if (mantenimientoOnly) return; // usuario común de mantenimiento: no ve el resto de la app

  document.getElementById('appScreen').classList.add('visible');

  if (state.isAdmin) {
    document.getElementById('tab-admin').style.display      = 'flex';
    document.getElementById('mm-admin').style.display       = 'flex';
    document.getElementById('navDividerAdmin').style.display = 'block';
    document.getElementById('mmDividerAdmin').style.display  = 'block';
  }

  await loadConfig();
  await loadProveedores();

  const guardada = leerUbicacionGuardada();
  if (guardada?.screen === 'mantenimiento' && isMantenimientoAdmin()) {
    showMantenimiento(true);
  } else {
    const dirTabsValidos = ['proveedores', 'comisionistas', 'rotulos', 'tareas', ...(state.isAdmin ? ['admin'] : [])];
    showTab(dirTabsValidos.includes(guardada?.dirTab) ? guardada.dirTab : 'proveedores');
  }
}

function goHome() {
  if (state.mantenimientoOnly) return;
  if (document.getElementById('mantenimientoScreen').classList.contains('visible')) {
    exitMantenimiento();
    return;
  }
  showTab('proveedores');
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
  guardarUbicacion({ screen: 'directorio', dirTab: tab });
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelectorAll('.mobile-nav-item').forEach(t => t.classList.remove('active'));
  document.getElementById('mm-' + tab)?.classList.add('active');
  document.getElementById('paneProveedores').style.display   = tab === 'proveedores'   ? 'block' : 'none';
  document.getElementById('paneComisionistas').style.display = tab === 'comisionistas' ? 'block' : 'none';
  document.getElementById('paneRotulos').style.display       = tab === 'rotulos'       ? 'block' : 'none';
  document.getElementById('paneTareas').style.display        = tab === 'tareas'        ? 'block' : 'none';
  document.getElementById('paneAdmin').style.display         = tab === 'admin'         ? 'block' : 'none';
  document.body.classList.toggle('tareas-mode', tab === 'tareas');
  if (tab === 'admin')         showAdminTab('empresa');
  if (tab === 'comisionistas') loadComisionistas();
  if (tab === 'rotulos')       loadRotulosScreen();
  if (tab === 'tareas')        openTareasTab();
}

// ===== SUB-TABS DE ADMINISTRACIÓN =====
function showAdminTab(tab) {
  document.getElementById('adminSubtab-historial').style.display = isOwner() ? '' : 'none';
  if (tab === 'historial' && !isOwner()) tab = 'empresa';

  ['empresa', 'rotulo', 'comisionistas', 'usuarios', 'historial'].forEach(t => {
    document.getElementById('adminSubtab-' + t).classList.toggle('active', t === tab);
    document.getElementById('adminPane-' + t).style.display = t === tab ? 'block' : 'none';
  });

  if (tab === 'rotulo')     initRotuloDesignTab();
  if (tab === 'usuarios')   loadUsers();
  if (tab === 'historial')  loadAuditLog();
}

// Los selectores de tamaño del editor de diseño y del modal de creación comparten
// este mismo input numérico; según el contexto, actualiza una vista previa u otra.
function onCustomSizeInput(ctx) {
  const scope = ctx === 'design' ? '#adminPane-rotulo' : '#modalRotulo';
  document.querySelectorAll(scope + ' .size-btn').forEach(b => b.classList.remove('active'));
  if (ctx === 'design') updateAdminPreview();
  else renderRotuloPreview();
}

async function openTareasTab() {
  // Auto-procesar tareas pendientes al entrar
  try {
    await sbFetch('/rpc/process_pending_tasks_for_user', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: state.currentUser.id })
    });
  } catch {}
  await loadTareas();
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
    } catch (e) {
      ['sb_token', 'sb_refresh', 'sb_user_id', 'sb_user_email'].forEach(k => localStorage.removeItem(k));
      if (e.message === 'BLOCKED') {
        document.getElementById('authError').textContent = 'Tu cuenta está desactivada. Contactá al administrador.';
        document.getElementById('authError').style.display = 'block';
      }
    }
  }
});

// El modulo auth.js despacha este evento tras un login exitoso
document.addEventListener('userReady', initApp);

// ===== EXPONER AL SCOPE GLOBAL =====
Object.assign(window, {
  // Auth
  doLogin, doLogout,
  // Navegacion
  showTab, showAdminTab, toggleMobileMenu, closeMobileMenu, closeModal, goHome,
  // User dropdown & perfil
  toggleUserDropdown, closeUserDropdown, openProfile, saveProfile,
  // Proveedores
  renderProveedores, openProvModal, addContactRow, removeContactRow,
  saveProveedor, deleteProveedor, openDetail, openRotuloFromDetail, exportExcel,
  // Comisionistas
  renderComisionistas, openComModal, saveComisionista, deleteCom, openDetailCom, exportExcelCom,
  // Admin
  loadUsers, openUserModal, saveUser, toggleUserActivo, deleteUserAccount,
  addCampoCustomRow, removeCampoCustomRow, saveCamposCustom,
  // Config
  saveConfig, handleLogoUpload,
  // Rotulo
  openRotulo, selectSize, selectDesignSize, updateAdminPreview,
  saveRotuloDesignFromAdmin, resetRotuloDesign, onCustomSizeInput,
  renderRotuloPreview, guardarRotulo, descargarRotuloGuardado, vistaPreviaRotuloGuardado,
  initRotuloDesignTab, toggleRotuloCampo,
  deleteRotuloGuardado, editRotuloGuardado, verVersionesRotulo,
  loadRotulosScreen, renderRotulosScreen, onBultoTotalChange, abrirBultosRotulo,
  guardarComoModelo, usarModeloRotulo, eliminarModeloRotulo,
  abrirFotosRotulo, handleRotuloFotosUpload, deleteRotuloFoto,
  // Tareas
  loadTareas, setTareasFilter, openNewTaskModal, saveNewTask,
  openTaskDetail, completeTask, cancelTask,
  openReprogramModal, saveReprogram,
  toggleVistaDropdown, setTaskView,
  _currentTaskId: () => state.currentTaskId,
  // Mantenimiento
  showMantenimiento, exitMantenimiento, renderItems, onFamiliaFiltroChange,
  openItemModal, onModalFamiliaChange, updateCodigoPreview,
  promptNuevaFamilia, promptNuevaSubfamilia, saveItem, deleteItem,
  openItemDetalle, subirFotoDetalle, eliminarFotoDetalle,
  descargarQRDeItem,
  abrirGenerarQR, renderQRBusqueda, agregarQRSeleccion, confirmarCantidadQR,
  actualizarCantidadQR, quitarQRSeleccion, generarQREtiquetasSeleccion,
  abrirEscaner, cerrarEscaner, terminarEscaneo, removeFromRetiroCartYRefrescarScan,
  showMantTab, showMantAdminSubtab, renderFamiliasPanel,
  saveFamiliaNombre, saveSubfamiliaNombre,
  addToRetiroCart, updateRetiroCantidad, updateRetiroObservacion,
  removeFromRetiroCart, confirmRetiro, enviarRetiroFinal, toggleHistorialDia,
  updateHistorialCantidad, deleteHistorialItem, renderHistorialRetiros,
  exportarRetirosPendientes, abrirExportarPeriodo, exportarRetirosPeriodo,
  addSector, saveSectorNombre, toggleSectorActivo,
});

// El módulo principal cargó bien: si una carga anterior había fallado y disparado
// una recarga automática (ver el guard en <head>), este es un episodio nuevo y sano.
try { sessionStorage.removeItem('__cremac_reload_guard'); } catch {}
