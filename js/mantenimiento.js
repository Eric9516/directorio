// Módulo Mantenimiento: switch de pantalla completa y control de acceso.
// El catálogo/buscador de repuestos se agrega acá en los próximos pasos.
import { state } from './state.js';
import { isOwner } from './admin.js';
import { loadItems } from './items.js';
import { renderFamiliasPanel } from './familias.js';
import { loadHistorialRetiros } from './retiros.js';
import { renderSectoresPanel } from './sectores.js';

// Espeja is_mantenimiento_admin() del lado de Supabase (misma condición).
export function isMantenimientoAdmin() {
  return state.currentUser?.mantenimiento_rol === 'admin' || isOwner();
}

export function isMantenimientoComun() {
  return state.currentUser?.mantenimiento_rol === 'comun' && !isMantenimientoAdmin();
}

// Oculta del menú mobile todo lo que no sea Mantenimiento/Mi perfil/Cerrar sesión,
// para un usuario que solo tiene acceso a Mantenimiento.
function hideDirectorioNav() {
  ['mm-proveedores', 'mm-comisionistas', 'mm-rotulos', 'mm-tareas', 'mm-admin', 'mm-mantenimiento']
    .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}

export function initMantenimientoAccess() {
  state.mantenimientoOnly = isMantenimientoComun();

  if (isMantenimientoAdmin()) {
    document.getElementById('btnMantenimiento').style.display = 'flex';
    document.getElementById('mm-mantenimiento').style.display = 'flex';
  }

  if (state.mantenimientoOnly) {
    hideDirectorioNav();
    showMantenimiento(false);
    return true; // le indica a initApp que no debe mostrar appScreen
  }
  return false;
}

export function showMantenimiento(canExit = true) {
  document.getElementById('appScreen').classList.remove('visible');
  document.getElementById('mantenimientoScreen').classList.add('visible');
  document.getElementById('btnVolverDirectorio').style.display = canExit ? 'flex' : 'none';

  const u = state.currentUser;
  const nombre = u?.nombre || u?.email?.split('@')[0] || 'Usuario';
  document.getElementById('mantUserName').textContent = `${nombre} ${u?.apellido || ''}`.trim();
  document.getElementById('mantUserAvatar').textContent = (nombre[0] || 'U').toUpperCase();

  const admin = isMantenimientoAdmin();
  document.getElementById('manttab-admin').style.display = admin ? 'flex' : 'none';
  document.getElementById('manttabDividerAdmin').style.display = admin ? 'block' : 'none';
  // El sub-tab de familias/subfamilias es exclusivo del owner, no de cualquier admin de mantenimiento.
  document.getElementById('mantAdminSubtab-familias').style.display = isOwner() ? 'flex' : 'none';
  showMantTab('buscar');

  loadItems();
}

export function exitMantenimiento() {
  if (state.mantenimientoOnly) return; // usuario común: sin salida
  document.getElementById('mantenimientoScreen').classList.remove('visible');
  document.getElementById('appScreen').classList.add('visible');
}

// ===== NAV =====
export function showMantTab(tab) {
  document.querySelectorAll('#mantenimientoScreen .nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('manttab-' + tab).classList.add('active');
  document.getElementById('paneMantBuscar').style.display  = tab === 'buscar'  ? 'block' : 'none';
  document.getElementById('paneMantRetiros').style.display = tab === 'retiros' ? 'block' : 'none';
  document.getElementById('paneMantAdmin').style.display   = tab === 'admin'   ? 'block' : 'none';
  if (tab === 'admin') showMantAdminSubtab('repuestos');
  if (tab === 'retiros') {
    document.getElementById('historialRetirosTitle').textContent = isMantenimientoAdmin() ? '📋 Historial de retiros' : '📋 Mis retiros';
    loadHistorialRetiros();
  }
}

export function showMantAdminSubtab(tab) {
  ['repuestos', 'sectores', 'familias'].forEach(t => {
    document.getElementById('mantAdminSubtab-' + t).classList.toggle('active', t === tab);
    document.getElementById('mantAdminPane-' + t).style.display = t === tab ? 'block' : 'none';
  });
  if (tab === 'familias') renderFamiliasPanel();
  if (tab === 'sectores') renderSectoresPanel();
}
