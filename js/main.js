import { state }                                                     from './state.js';
import { closeModal, toggleMobileMenu, closeMobileMenu }             from './ui.js';
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
         renderRotuloPreview, generatePDF, previewPDF,
         openModalRotuloDesign, toggleRotuloCampo }                  from './rotulo.js';

// ===== APP INIT =====
async function initApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').classList.add('visible');

  const nombre   = state.currentUser?.nombre   || state.currentUser?.email?.split('@')[0] || 'Usuario';
  const apellido = state.currentUser?.apellido || '';
  const fullName = `${nombre} ${apellido}`.trim();
  const initial  = nombre[0].toUpperCase();

  document.getElementById('userName').textContent      = fullName;
  document.getElementById('userAvatar').textContent    = initial;
  document.getElementById('mobileUsername').textContent = fullName;
  document.getElementById('mobileEmail').textContent   = state.currentUser?.email || '';
  document.getElementById('mobileAvatar').textContent  = initial;

  if (state.isAdmin) {
    document.getElementById('tab-admin').style.display = 'flex';
    document.getElementById('mm-admin').style.display  = 'flex';
  }

  await loadConfig();
  await loadProveedores();
}

function showTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelectorAll('.mobile-nav-item').forEach(t => t.classList.remove('active'));
  document.getElementById('mm-' + tab)?.classList.add('active');
  document.getElementById('paneProveedores').style.display   = tab === 'proveedores'   ? 'block' : 'none';
  document.getElementById('paneComisionistas').style.display = tab === 'comisionistas' ? 'block' : 'none';
  document.getElementById('paneAdmin').style.display         = tab === 'admin'         ? 'block' : 'none';
  if (tab === 'admin')         loadUsers();
  if (tab === 'comisionistas') loadComisionistas();
}

// ===== ANIMACIÓN DE FONDO (LOGIN) =====
(function initAuthDeco() {
  const cheeses = ['🧀', '🥛', '🫙'];
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
  }
});

// Recuperar sesión al cargar la página
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

// El módulo auth.js despacha este evento tras un login exitoso
document.addEventListener('userReady', initApp);

// ===== EXPONER AL SCOPE GLOBAL =====
// Necesario porque el HTML usa atributos onclick="función()"
Object.assign(window, {
  // Auth
  doLogin, doLogout,
  // Navegación
  showTab, toggleMobileMenu, closeMobileMenu, closeModal,
  // Proveedores
  renderProveedores, openProvModal, addContactRow, removeContactRow,
  saveProveedor, deleteProveedor, openDetail, openRotuloFromDetail, exportExcel,
  // Comisionistas
  renderComisionistas, openComModal, saveComisionista, deleteCom, openDetailCom, exportExcelCom,
  // Admin — usuarios
  loadUsers, openUserModal, saveUser, toggleUserActivo,
  // Admin — campos custom
  addCampoCustomRow, removeCampoCustomRow, saveCamposCustom,
  // Config
  saveConfig, handleLogoUpload,
  // Rótulo
  openRotulo, selectSize, selectDesignSize, updateAdminPreview,
  saveRotuloDesignFromAdmin, resetRotuloDesign, onCustomSizeInput,
  renderRotuloPreview, generatePDF, previewPDF, openModalRotuloDesign, toggleRotuloCampo,
});
