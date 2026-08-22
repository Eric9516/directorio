import { sbAuth, sbFetch } from './api.js';
import { state } from './state.js';
import { toast } from './ui.js';

export async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  document.getElementById('authError').style.display = 'none';

  if (!email || !pass) { showAuthError('Completá email y contraseña'); return; }

  let data;
  try {
    data = await sbAuth('/token?grant_type=password', { email, password: pass });
  } catch {
    showAuthError('Email o contraseña incorrectos');
    return;
  }

  localStorage.setItem('sb_token',      data.access_token);
  localStorage.setItem('sb_refresh',    data.refresh_token);
  localStorage.setItem('sb_user_id',    data.user.id);
  localStorage.setItem('sb_user_email', data.user.email);

  try {
    await loadUserProfile(data.user.id, data.user.email);
  } catch (e) {
    ['sb_token', 'sb_refresh', 'sb_user_id', 'sb_user_email'].forEach(k => localStorage.removeItem(k));
    showAuthError(e.message === 'BLOCKED'
      ? 'Tu cuenta está desactivada. Contactá al administrador.'
      : 'No se pudo cargar tu perfil. Verificá tu conexión e intentá de nuevo.');
    return;
  }

  // initApp se llama desde main.js via evento
  document.dispatchEvent(new CustomEvent('userReady'));
}

export function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}

export async function loadUserProfile(uid, email) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const rows = await sbFetch(`/usuarios_perfil?id=eq.${uid}&select=*`);
      if (rows.length) {
        if (rows[0].activo === false) throw new Error('BLOCKED');
        state.currentUser = rows[0];
        state.isAdmin = rows[0].rol === 'admin';
      } else {
        state.currentUser = { id: uid, email, nombre: email.split('@')[0], apellido: '', rol: 'user' };
        state.isAdmin = false;
      }
      return;
    } catch (err) {
      if (err.message === 'BLOCKED') throw err; // definitivo, no reintentar
      lastErr = err;
      if (attempt < 3) await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr;
}

export function doLogout() {
  if (!confirm('¿Cerrar sesión?')) return;
  ['sb_token', 'sb_refresh', 'sb_user_id', 'sb_user_email'].forEach(k => localStorage.removeItem(k));
  // Recarga completa a propósito: hay bastantes botones/pestañas (Mantenimiento, Admin, etc.)
  // que en el código solo se MUESTRAN si el usuario tiene permiso, pero nunca se vuelven a
  // OCULTAR — dependen de arrancar desde el HTML base. Si solo limpiáramos el estado en memoria,
  // el próximo usuario que entre en la misma pestaña del navegador podía heredar botones visibles
  // del usuario anterior (ej: entrar a Mantenimiento sin tener permiso) hasta refrescar la página.
  // Recargar garantiza que cada sesión arranca de cero, sin nada heredado.
  location.reload();
}
