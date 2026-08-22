// Módulo Mantenimiento: switch de pantalla completa y control de acceso.
// El catálogo/buscador de repuestos se agrega acá en los próximos pasos.
import { state, guardarUbicacion, leerUbicacionGuardada } from './state.js';
import { isOwner } from './admin.js';
import { loadItems } from './items.js';
import { loadHistorialRetiros, renderRetiroCart, restaurarCartLocal } from './retiros.js';
import { puedeVerErrores } from './errorLog.js';

// Espeja is_mantenimiento_admin() del lado de Supabase (misma condición).
export function isMantenimientoAdmin() {
  return state.currentUser?.mantenimiento_rol === 'admin' || isOwner();
}

// Hay una sola pantalla de "Administración" (compartida entre Directorio y
// Mantenimiento), pero varios permisos distintos pueden dar acceso a ALGUNA de sus
// pestañas (Directorio admin, Mantenimiento admin, o el permiso puntual de Errores).
// Esto decide si el botón para entrar siquiera se muestra.
export function tieneAccesoAdmin() {
  return state.isAdmin || isMantenimientoAdmin() || puedeVerErrores();
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

  // Al recargar la página, vuelve a la pestaña de Mantenimiento en la que estaba.
  // "admin" queda como valor legado (antes existía acá) por si alguien tenía esa
  // pestaña guardada de una sesión vieja — ya no es una pestaña de Mantenimiento.
  if (!initialTab) initialTab = leerUbicacionGuardada()?.mantTab || 'buscar';
  if (!['buscar', 'carrito', 'retiros'].includes(initialTab)) initialTab = 'buscar';
  showMantTab(initialTab);
  setMobileMenuModo('mantenimiento', canExit);

  loadItems();
}

export function exitMantenimiento() {
  if (state.mantenimientoOnly) return; // usuario común: sin salida
  guardarUbicacion({ screen: 'directorio' });
  document.getElementById('mantenimientoScreen').classList.remove('visible');
  document.getElementById('appScreen').classList.add('visible');
  setMobileMenuModo('directorio');
}

// El menú mobile (hamburguesa) es un único elemento compartido entre Directorio,
// Mantenimiento y Administración — hay que mostrarle a cada uno solo su propia
// navegación, nunca mezcladas. "admin" no muestra ninguna de las dos: adentro de
// Administración se navega con las sub-pestañas de la propia pantalla.
export function setMobileMenuModo(modo, canExit = true) {
  const tieneAdmin = tieneAccesoAdmin();
  const enDirectorio = modo === 'directorio';
  const enMantenimiento = modo === 'mantenimiento';

  ['mm-proveedores', 'mm-comisionistas', 'mm-rotulos', 'mm-tareas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = enDirectorio ? 'flex' : 'none';
  });
  const dirAdminVisible = enDirectorio && tieneAdmin;
  document.getElementById('mm-admin').style.display = dirAdminVisible ? 'flex' : 'none';
  document.getElementById('mmDividerAdmin').style.display = dirAdminVisible ? 'block' : 'none';

  ['mm-mant-buscar', 'mm-mant-carrito', 'mm-mant-retiros'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = enMantenimiento ? 'flex' : 'none';
  });
  const adminBtn = document.getElementById('mm-mant-admin');
  if (adminBtn) adminBtn.style.display = (enMantenimiento && tieneAdmin) ? 'flex' : 'none';
  const volverBtn = document.getElementById('mm-volver-directorio');
  if (volverBtn) volverBtn.style.display = (enMantenimiento && canExit) ? 'flex' : 'none';
  const irBtn = document.getElementById('mm-mantenimiento');
  if (irBtn && isMantenimientoAdmin()) irBtn.style.display = enDirectorio ? 'flex' : 'none';
}

// ===== NAV =====
export function showMantTab(tab) {
  guardarUbicacion({ screen: 'mantenimiento', mantTab: tab });
  document.querySelectorAll('#mantenimientoScreen .nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('manttab-' + tab).classList.add('active');
  document.getElementById('paneMantBuscar').style.display  = tab === 'buscar'  ? 'block' : 'none';
  document.getElementById('paneMantCarrito').style.display = tab === 'carrito' ? 'block' : 'none';
  document.getElementById('paneMantRetiros').style.display = tab === 'retiros' ? 'block' : 'none';
  if (tab === 'carrito') renderRetiroCart();
  if (tab === 'retiros') {
    document.getElementById('historialRetirosTitle').textContent = puedeVerTodosLosRetiros() ? '📋 Historial de retiros' : '📋 Mis retiros';
    loadHistorialRetiros();
  }
}
