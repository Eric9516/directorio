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
  editingUserId: null,
  editingProvId: null,
  editingComId: null,
  contactRowCounter: 0,
  selectedSize: 'a4',
  selectedDesignSize: 'a4',
  // Tareas Semáforo
  activeModule: null, // 'directorio' | 'tareas'
  tareas: [],
  currentTaskId: null,
};
