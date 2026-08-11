// Configuración de Supabase y helpers de red
export const SUPABASE_URL = 'https://kpwkxkkbnmdhqqvjmneh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_llAKdu5sRcVMBMjX3Txr6A_4pH9zZ--';
export const API        = `${SUPABASE_URL}/rest/v1`;
export const AUTH_API   = `${SUPABASE_URL}/auth/v1`;

export async function sbFetch(path, opts = {}) {
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

export async function sbStorageUpload(path, blob, contentType = 'application/pdf') {
  const token = localStorage.getItem('sb_token');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/rotulos/${path}`, {
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
  return `${SUPABASE_URL}/storage/v1/object/public/rotulos/${path}`;
}

export async function sbStorageDelete(path) {
  const token = localStorage.getItem('sb_token');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/rotulos/${path}`, {
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
