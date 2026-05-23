import { sbAuth, sbFetch } from './api.js';
import { state } from './state.js';
import { toast, closeMobileMenu } from './ui.js';

export async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  document.getElementById('authError').style.display = 'none';

  if (!email || !pass) { showAuthError('Completá email y contraseña'); return; }

  try {
    const data = await sbAuth('/token?grant_type=password', { email, password: pass });
    localStorage.setItem('sb_token',      data.access_token);
    localStorage.setItem('sb_refresh',    data.refresh_token);
    localStorage.setItem('sb_user_id',    data.user.id);
    localStorage.setItem('sb_user_email', data.user.email);
    await loadUserProfile(data.user.id, data.user.email);
    // initApp se llama desde main.js via evento
    document.dispatchEvent(new CustomEvent('userReady'));
  } catch {
    showAuthError('Email o contraseña incorrectos');
  }
}

export function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}

export async function loadUserProfile(uid, email) {
  try {
    const rows = await sbFetch(`/usuarios_perfil?id=eq.${uid}&select=*`);
    if (rows.length) {
      state.currentUser = rows[0];
      state.isAdmin = rows[0].rol === 'admin';
    } else {
      state.currentUser = { id: uid, email, nombre: email.split('@')[0], apellido: '', rol: 'user' };
      state.isAdmin = false;
    }
  } catch {
    state.currentUser = { id: uid, email, nombre: email.split('@')[0], apellido: '', rol: 'user' };
    state.isAdmin = false;
  }
}

export function doLogout() {
  if (!confirm('¿Cerrar sesión?')) return;
  closeMobileMenu();
  ['sb_token', 'sb_refresh', 'sb_user_id', 'sb_user_email'].forEach(k => localStorage.removeItem(k));
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').classList.remove('visible');
}
