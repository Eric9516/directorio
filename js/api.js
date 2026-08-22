// Configuración de Supabase y helpers de red
export const SUPABASE_URL = 'https://kpwkxkkbnmdhqqvjmneh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_llAKdu5sRcVMBMjX3Txr6A_4pH9zZ--';
export const API        = `${SUPABASE_URL}/rest/v1`;
export const AUTH_API   = `${SUPABASE_URL}/auth/v1`;

// ===== RENOVACIÓN AUTOMÁTICA DE SESIÓN =====
function decodeJwtExp(token) {
  try {
    let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return JSON.parse(atob(base64)).exp;
  } catch {
    return null;
  }
}

function forceLogout() {
  ['sb_token', 'sb_refresh', 'sb_user_id', 'sb_user_email'].forEach(k => localStorage.removeItem(k));
  const authScreen = document.getElementById('authScreen');
  const appScreen  = document.getElementById('appScreen');
  if (authScreen) authScreen.style.display = 'flex';
  if (appScreen)  appScreen.classList.remove('visible');
}

let refreshPromise = null;

async function ensureFreshToken() {
  const token = localStorage.getItem('sb_token');
  if (!token) return;
  const exp = decodeJwtExp(token);
  if (exp && exp * 1000 - Date.now() > 60000) return; // todavía válido por más de un minuto

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = localStorage.getItem('sb_refresh');
      if (!refresh) { forceLogout(); return; }
      try {
        const res  = await fetch(`${AUTH_API}/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error_description || 'No se pudo renovar la sesión');
        localStorage.setItem('sb_token',   data.access_token);
        localStorage.setItem('sb_refresh', data.refresh_token);
      } catch {
        forceLogout();
      }
    })().finally(() => { refreshPromise = null; });
  }
  await refreshPromise;
}

export async function sbFetch(path, opts = {}) {
  await ensureFreshToken();
  const token = localStorage.getItem('sb_token');
  const headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export async function sbStorageUpload(path, blob, contentType = 'application/pdf', bucket = 'rotulos') {
  await ensureFreshToken();
  const token = localStorage.getItem('sb_token');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: blob,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export async function sbStorageDelete(path, bucket = 'rotulos') {
  await ensureFreshToken();
  const token = localStorage.getItem('sb_token');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
}

export async function sbAuth(path, body) {
  const res = await fetch(`${AUTH_API}${path}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Error de autenticación');
  return data;
}
