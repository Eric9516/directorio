// Estado global compartido entre módulos.
// Todos los módulos importan este objeto y lo mutan directamente.
export const state = {
  currentUser: null,
  isAdmin: false,
  proveedores: [],
  contactos: [],
  comisionistas: [],
  camposCustom: [],
  configData: {},
  logoBase64: '',
  currentProvId: null,
  rotuloProvId: null,
  rotuloGuardadoActual: null,
  rotuloEditando: null,
  rotuloFotosGrupoId: null,
  rotuloFotosProvId: null,
  editingUserId: null,
  editingProvId: null,
  editingComId: null,
  contactRowCounter: 0,
  selectedSize: 'a4',
  selectedDesignSize: 'a4',
  rotuloDisenos: [],
  // Tareas Semáforo
  tareas: [],
  currentTaskId: null,
  // Mantenimiento
  mantenimientoOnly: false,
  items: [],
  familias: [],
  subfamilias: [],
  editingItemId: null,
  retiroCart: [],
  historialRetiros: [],
  historialUsuarios: {},
  historialAdmin: false,
  sectores: [],
};

// Recuerda en qué pantalla/pestaña estaba cada usuario para que un refresh de página
// (frecuente en mobile) lo deje donde estaba, en vez de mandarlo siempre a Directorio.
// Escapada por usuario, igual que el carrito, para no mezclar la ubicación de uno con
// la de otro en una compu/tablet compartida.
function ubicacionKey() {
  return `ultimaUbicacion_${state.currentUser?.id || 'anon'}`;
}

export function guardarUbicacion(patch) {
  try {
    const actual = leerUbicacionGuardada() || {};
    localStorage.setItem(ubicacionKey(), JSON.stringify({ ...actual, ...patch }));
  } catch {}
}

export function leerUbicacionGuardada() {
  try {
    const raw = localStorage.getItem(ubicacionKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
