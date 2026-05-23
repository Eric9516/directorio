import { sbFetch }                from './api.js';
import { state }                 from './state.js';
import { toast }                 from './ui.js';
import { renderCamposCustomAdmin } from './admin.js';
import { renderRotuloToggles, getRotuloToggleValues } from './rotulo.js';

export async function loadConfig() {
  try {
    const rows = await sbFetch('/configuracion?id=eq.1&select=*');
    if (rows.length) {
      state.configData = rows[0];
      applyConfig();
    }
  } catch {}
}

export function applyConfig() {
  const nombre = state.configData.empresa_nombre || 'Cremac';
  document.getElementById('headerName').textContent = nombre;
  document.title = `Directorio — ${nombre}`;

  if (state.configData.logo_base64) {
    state.logoBase64 = state.configData.logo_base64;
    setLogoSrc(state.logoBase64);
  }

  ['nombre', 'direccion', 'telefono', 'email'].forEach(k => {
    const el = document.getElementById(`cfg_${k}`);
    if (el) el.value = state.configData[`empresa_${k}`] || '';
  });

  const pieEl = document.getElementById('cfg_pie');
  if (pieEl) pieEl.value = state.configData.rotulo_pie || '';

  state.camposCustom = state.configData.comisionistas_campos_custom || [];
  renderCamposCustomAdmin();
  renderRotuloToggles();
}

export function setLogoSrc(src) {
  document.getElementById('authLogo').src = src;
  document.getElementById('headerLogo').src = src;
  const preview = document.getElementById('logoPreview');
  if (preview) { preview.src = src; preview.style.display = 'block'; document.getElementById('logoUploadText').style.display = 'none'; }
}

export function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { state.logoBase64 = ev.target.result; setLogoSrc(state.logoBase64); };
  reader.readAsDataURL(file);
}

export async function saveConfig() {
  const body = {
    empresa_nombre:    document.getElementById('cfg_nombre').value.trim()    || 'Cremac',
    empresa_direccion: document.getElementById('cfg_direccion').value.trim(),
    empresa_telefono:  document.getElementById('cfg_telefono').value.trim(),
    empresa_email:     document.getElementById('cfg_email').value.trim(),
    rotulo_pie:        document.getElementById('cfg_pie').value.trim(),
    logo_base64:       state.logoBase64 || state.configData.logo_base64 || '',
    rotulo_campos:     getRotuloToggleValues()
  };

  try {
    await sbFetch('/configuracion?id=eq.1', { method: 'PATCH', body: JSON.stringify(body) });
    state.configData = { ...state.configData, ...body };
    applyConfig();
    toast('Configuración guardada', 'success');
  } catch {
    toast('Error al guardar configuración', 'error');
  }
}
