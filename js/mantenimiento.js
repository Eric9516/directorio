// Módulo Mantenimiento: switch de pantalla completa y control de acceso.
// El catálogo/buscador de repuestos se agrega acá en los próximos pasos.
import { state, guardarUbicacion, leerUbicacionGuardada } from './state.js';
import { isOwner } from './admin.js';
import { loadItems } from './items.js';
import { renderFamiliasPanel } from './familias.js';
import { loadHistorialRetiros, renderRetiroCart, restaurarCartLocal } from './retiros.js';
import { renderSectoresPanel } from './sectores.js';

// Espeja is_mantenimiento_admin() del lado de Supabase (misma condición).
export function isMantenimientoAdmin() {
  return state.currentUser?.mantenimiento_rol === 'admin' || isOwner();
}

// Espeja can_view_all_retiros() del lado de Supabase. Ver el historial completo de
// retiros (de todos los usuarios) y exportarlo es un permiso aparte del de admin de
// mantenimiento — por defecto solo lo tiene el superadmin, salvo que habilite a alguien.
export function puedeVerTodosLosRetiros() {
  return state.currentUser?.puede_ver_retiros === true || isOwner();
}

// El acceso a Directorio ahora es un permiso propio ("Permisos de Directorio" = Desactivado),
// independiente del rol de Mantenimiento — antes se inferís mal del rol de Mantenimiento.
// El owner nunca queda bloqueado, aunque su propia fila tenga rol='disabled' por error.
export function directorioDesactivado() {
  return state.currentUser?.rol === 'disabled' && !isOwner();
}

export function initMantenimientoAccess() {
  state.mantenimientoOnly = directorioDesactivado();

  if (isMantenimientoAdmin()) {
    document.getElementById('btnMantenimiento').style.display = 'flex';
    document.getElementById('mm-mantenimiento').style.display = 'flex';
  }

  if (state.mantenimientoOnly) {
    showMantenimiento(false); // ya deja el menú mobile solo con lo de Mantenimiento
    return true; // le indica a initApp que no debe mostrar appScreen
  }
  return false;
}

export function showMantenimiento(canExit = true, initialTab) {
  restaurarCartLocal();
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

  // Al recargar la página, vuelve a la pestaña de Mantenimiento en la que estaba
  // (a menos que ya no tenga permiso para verla, ej. "admin" sin serlo).
  if (!initialTab) initialTab = leerUbicacionGuardada()?.mantTab || 'buscar';
  if (initialTab === 'admin' && !admin) initialTab = 'buscar';
  showMantTab(initialTab);
  setMobileMenuMantenimiento(true, canExit);

  loadItems();
}

export function exitMantenimiento() {
  if (state.mantenimientoOnly) return; // usuario común: sin salida
  guardarUbicacion({ screen: 'directorio' });
  document.getElementById('mantenimientoScreen').classList.remove('visible');
  document.getElementById('appScreen').classList.add('visible');
  setMobileMenuMantenimiento(false);
}

// El menú mobile (hamburguesa) es un único elemento compartido entre Directorio y
// Mantenimiento — hay que mostrarle a cada uno solo su propia navegación, nunca las dos mezcladas.
function setMobileMenuMantenimiento(dentro, canExit = true) {
  const admin = isMantenimientoAdmin();

  // Ítems propios de Directorio: ocultos mientras estás adentro de Mantenimiento.
  ['mm-proveedores', 'mm-comisionistas', 'mm-rotulos', 'mm-tareas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = dentro ? 'none' : 'flex';
  });
  const dirAdminVisible = !dentro && state.isAdmin;
  document.getElementById('mm-admin').style.display = dirAdminVisible ? 'flex' : 'none';
  document.getElementById('mmDividerAdmin').style.display = dirAdminVisible ? 'block' : 'none';

  // Ítems propios de Mantenimiento: visibles solo estando adentro.
  ['mm-mant-buscar', 'mm-mant-carrito', 'mm-mant-retiros'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = dentro ? 'flex' : 'none';
  });
  const adminBtn = document.getElementById('mm-mant-admin');
  if (adminBtn) adminBtn.style.display = (dentro && admin) ? 'flex' : 'none';
  const volverBtn = document.getElementById('mm-volver-directorio');
  if (volverBtn) volverBtn.style.display = (dentro && canExit) ? 'flex' : 'none';
  const irBtn = document.getElementById('mm-mantenimiento');
  if (irBtn && admin) irBtn.style.display = dentro ? 'none' : 'flex';
}

// ===== NAV =====
export function showMantTab(tab) {
  guardarUbicacion({ screen: 'mantenimiento', mantTab: tab });
  document.querySelectorAll('#mantenimientoScreen .nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('manttab-' + tab).classList.add('active');
  document.getElementById('paneMantBuscar').style.display  = tab === 'buscar'  ? 'block' : 'none';
  document.getElementById('paneMantCarrito').style.display = tab === 'carrito' ? 'block' : 'none';
  document.getElementById('paneMantRetiros').style.display = tab === 'retiros' ? 'block' : 'none';
  document.getElementById('paneMantAdmin').style.display   = tab === 'admin'   ? 'block' : 'none';
  if (tab === 'admin') showMantAdminSubtab('repuestos');
  if (tab === 'carrito') renderRetiroCart();
  if (tab === 'retiros') {
    document.getElementById('historialRetirosTitle').textContent = puedeVerTodosLosRetiros() ? '📋 Historial de retiros' : '📋 Mis retiros';
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
