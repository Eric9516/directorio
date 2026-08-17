// Pestaña "Rótulo" del panel Admin: editor visual de diseño y modelos guardados.
import { sbFetch } from './api.js';
import { state }   from './state.js';
import { toast, esc } from './ui.js';
import { DEFAULT_DESIGN, getCurrentDesign, renderRotuloPreviewTo } from './rotuloRender.js';

function getRD() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : null; };
  return {
    headerBg:    g('rc_headerBg')    || DEFAULT_DESIGN.headerBg,
    barColor:    g('rc_barColor')    || DEFAULT_DESIGN.barColor,
    barHeight:   parseInt(g('rc_barHeight')   || DEFAULT_DESIGN.barHeight),
    titleColor:  g('rc_titleColor')  || DEFAULT_DESIGN.titleColor,
    textColor:   g('rc_textColor')   || DEFAULT_DESIGN.textColor,
    bodyBg:      g('rc_bodyBg')      || DEFAULT_DESIGN.bodyBg,
    logoSize:    parseInt(g('rc_logoSize')    || DEFAULT_DESIGN.logoSize),
    logoPos:     g('rc_logoPos')     || DEFAULT_DESIGN.logoPos,
    empresaFont: g('rc_empresaFont') || DEFAULT_DESIGN.empresaFont,
    empresaSize: parseInt(g('rc_empresaSize') || DEFAULT_DESIGN.empresaSize),
    empresaPos:  g('rc_empresaPos')  || DEFAULT_DESIGN.empresaPos,
    empresaColor:g('rc_empresaColor')|| DEFAULT_DESIGN.empresaColor,
    provFont:    g('rc_provFont')    || DEFAULT_DESIGN.provFont,
    provSize:    parseInt(g('rc_provSize')    || DEFAULT_DESIGN.provSize),
    provAlign:   g('rc_provAlign')   || DEFAULT_DESIGN.provAlign,
    marcoColor:  g('rc_marcoColor')  || DEFAULT_DESIGN.marcoColor,
    marcoWidth:  parseInt(g('rc_marcoWidth')  || DEFAULT_DESIGN.marcoWidth),
  };
}

function loadDesignIntoControls(rd) {
  const map = {
    headerBg:    'rc_headerBg',    barColor:    'rc_barColor',    barHeight:   'rc_barHeight',
    titleColor:  'rc_titleColor',  textColor:   'rc_textColor',   bodyBg:      'rc_bodyBg',
    logoPos:     'rc_logoPos',     logoSize:    'rc_logoSize',
    empresaFont: 'rc_empresaFont', empresaSize: 'rc_empresaSize', empresaPos:  'rc_empresaPos', empresaColor: 'rc_empresaColor',
    provFont:    'rc_provFont',    provSize:    'rc_provSize',    provAlign:   'rc_provAlign',
    marcoColor:  'rc_marcoColor',  marcoWidth:  'rc_marcoWidth',
  };
  Object.keys(map).forEach(k => {
    const el = document.getElementById(map[k]);
    if (el && rd[k] !== undefined) {
      el.value = rd[k];
      const lbl = document.getElementById(map[k] + 'Val');
      if (lbl) lbl.textContent = rd[k] + 'px';
    }
  });
}

function getDesignWH() {
  const w = parseFloat(document.getElementById('design_w')?.value) || 21;
  const h = parseFloat(document.getElementById('design_h')?.value) || 29.7;
  return [w * 10, h * 10];
}

// ===== TOGGLES DE CAMPOS =====
export function renderRotuloToggles() {
  const campos = state.configData.rotulo_campos || { horario: true, direccion: true, telefono: true, email: true };
  const labels = { horario: 'Horario de atención', direccion: 'Dirección', telefono: 'Teléfono del contacto', email: 'Email' };
  const container = document.getElementById('rotuloToggleList');
  if (!container) return;
  container.innerHTML = Object.keys(labels).map(k => `
    <div class="toggle-wrap" style="margin-bottom:12px" onclick="toggleRotuloCampo('${k}')">
      <div class="toggle ${campos[k] ? 'on' : ''}" id="toggle_${k}"></div>
      <span style="font-size:13px;font-weight:600;color:var(--text-mid)">${labels[k]}</span>
    </div>`).join('');
}

export function toggleRotuloCampo(k) {
  document.getElementById(`toggle_${k}`)?.classList.toggle('on');
}

export function getRotuloToggleValues() {
  const keys = ['horario', 'direccion', 'telefono', 'email'];
  const result = {};
  keys.forEach(k => {
    const el = document.getElementById(`toggle_${k}`);
    result[k] = el ? el.classList.contains('on') : true;
  });
  return result;
}

// ===== PESTAÑA DISEÑO ADMIN =====
export function initRotuloDesignTab() {
  loadDesignIntoControls(getCurrentDesign());
  const pieEl = document.getElementById('cfg_pie');
  if (pieEl) pieEl.value = state.configData.rotulo_pie || '';
  renderRotuloToggles();
  state.selectedDesignSize = 'a4';
  document.querySelectorAll('#adminPane-rotulo .size-btn').forEach(b => b.classList.remove('active'));
  const firstBtn = document.querySelector('#adminPane-rotulo .size-btn');
  if (firstBtn) firstBtn.classList.add('active');
  const dw = document.getElementById('design_w');
  const dh = document.getElementById('design_h');
  if (dw) dw.value = '21';
  if (dh) dh.value = '29.7';
  updateAdminPreview();
  loadRotuloDisenos();
}

export function selectDesignSize(btn, name) {
  document.querySelectorAll('#adminPane-rotulo .size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.selectedDesignSize = name;
  const wEl = document.getElementById('design_w');
  const hEl = document.getElementById('design_h');
  if (wEl) wEl.value = btn.dataset.w;
  if (hEl) hEl.value = btn.dataset.h;
  updateAdminPreview();
}

export function updateAdminPreview() {
  const mockProv = { nombre: 'Nombre del Proveedor SA', rubro: 'Ejemplo de rubro', direccion: 'Calle Ejemplo 1234', localidad: 'Córdoba', provincia: 'Córdoba', codigo_postal: '5000', horario: 'Lun-Vie 8 a 17hs' };
  renderRotuloPreviewTo('adminRotuloPreview', getRD(), mockProv, [], '', '');

  const wrap  = document.getElementById('adminPreviewWrap');
  const label = document.getElementById('adminPreviewLabel');
  const [dw, dh] = getDesignWH();
  const ratio = dw / dh;

  if (wrap) {
    wrap.style.aspectRatio = String(ratio);
    wrap.style.display     = 'flex';
    wrap.style.alignItems  = 'stretch';
    if (ratio < 1) { wrap.style.maxWidth = '480px'; wrap.style.margin = '0 auto'; }
    else           { wrap.style.maxWidth = '100%';   wrap.style.margin = '0'; }
    const inner = document.getElementById('adminRotuloPreview');
    if (inner) { inner.style.flex = '1'; inner.style.overflow = 'hidden'; }
  }
  if (label) label.textContent = `${dw / 10} × ${dh / 10} cm`;
}

export async function saveRotuloDesignFromAdmin() {
  const rd     = getRD();
  const pie    = document.getElementById('cfg_pie')?.value.trim() || '';
  const campos = getRotuloToggleValues();
  try {
    await sbFetch('/configuracion?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify({ rotulo_design: rd, rotulo_pie: pie, rotulo_campos: campos })
    });
    state.configData.rotulo_design = rd;
    state.configData.rotulo_pie    = pie;
    state.configData.rotulo_campos = campos;
    toast('Diseño guardado como predeterminado', 'success');
  } catch {
    toast('Error al guardar diseño', 'error');
  }
}

export async function resetRotuloDesign() {
  if (!confirm('¿Restablecer el diseño original?')) return;
  try {
    await sbFetch('/configuracion?id=eq.1', { method: 'PATCH', body: JSON.stringify({ rotulo_design: DEFAULT_DESIGN }) });
    state.configData.rotulo_design = { ...DEFAULT_DESIGN };
    loadDesignIntoControls(DEFAULT_DESIGN);
    updateAdminPreview();
    toast('Diseño restablecido', 'success');
  } catch {
    toast('Error al restablecer', 'error');
  }
}

// ===== MODELOS DE DISEÑO GUARDADOS =====
export async function loadRotuloDisenos() {
  try {
    state.rotuloDisenos = await sbFetch('/rotulo_disenos?select=*&order=created_at.desc');
    renderRotuloDisenos();
  } catch { toast('Error al cargar modelos guardados', 'error'); }
}

function renderRotuloDisenos() {
  const list  = document.getElementById('modelosRotuloList');
  const noMsg = document.getElementById('noModelosMsg');
  if (!list) return;
  const rows = state.rotuloDisenos || [];
  if (!rows.length) {
    list.innerHTML = '';
    if (noMsg) noMsg.style.display = 'block';
    return;
  }
  if (noMsg) noMsg.style.display = 'none';
  const activoId = state.configData.rotulo_diseno_id;
  list.innerHTML = rows.map(m => {
    const activo = m.id === activoId;
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1.5px solid ${activo ? 'var(--blue)' : 'var(--border)'};border-radius:8px;margin-bottom:8px">
      <div>
        <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px">${esc(m.nombre)} ${activo ? '<span class="badge badge-active">Predeterminado</span>' : ''}</div>
        <div style="font-size:11px;color:var(--text-muted)">Guardado el ${new Date(m.created_at).toLocaleDateString('es-AR')}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        ${!activo ? `<button class="btn btn-ghost btn-sm" onclick="usarModeloRotulo(${m.id})">Usar como predeterminado</button>` : ''}
        <button class="btn btn-danger-ghost btn-sm" onclick="eliminarModeloRotulo(${m.id})">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

export async function guardarComoModelo() {
  const nombreEl = document.getElementById('nuevoModeloNombre');
  const nombre = nombreEl?.value.trim();
  if (!nombre) { toast('Ponele un nombre al modelo', 'error'); return; }
  try {
    await sbFetch('/rotulo_disenos', {
      method: 'POST',
      body: JSON.stringify({ nombre, design: getRD(), pie: document.getElementById('cfg_pie')?.value.trim() || '', campos: getRotuloToggleValues() })
    });
    nombreEl.value = '';
    toast('Modelo guardado', 'success');
    await loadRotuloDisenos();
  } catch { toast('Error al guardar el modelo', 'error'); }
}

export async function usarModeloRotulo(id) {
  const modelo = (state.rotuloDisenos || []).find(m => m.id === id);
  if (!modelo) return;
  try {
    await sbFetch('/configuracion?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify({ rotulo_design: modelo.design, rotulo_pie: modelo.pie, rotulo_campos: modelo.campos, rotulo_diseno_id: modelo.id })
    });
    state.configData.rotulo_design    = modelo.design;
    state.configData.rotulo_pie       = modelo.pie;
    state.configData.rotulo_campos    = modelo.campos;
    state.configData.rotulo_diseno_id = modelo.id;
    loadDesignIntoControls(modelo.design);
    const pieEl = document.getElementById('cfg_pie');
    if (pieEl) pieEl.value = modelo.pie || '';
    renderRotuloToggles();
    updateAdminPreview();
    renderRotuloDisenos();
    toast(`"${modelo.nombre}" ahora es el predeterminado`, 'success');
  } catch { toast('Error al aplicar el modelo', 'error'); }
}

export async function eliminarModeloRotulo(id) {
  const modelo = (state.rotuloDisenos || []).find(m => m.id === id);
  if (!confirm(`¿Eliminar el modelo "${modelo?.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await sbFetch(`/rotulo_disenos?id=eq.${id}`, { method: 'DELETE' });
    if (state.configData.rotulo_diseno_id === id) state.configData.rotulo_diseno_id = null;
    toast('Modelo eliminado', 'error');
    await loadRotuloDisenos();
  } catch { toast('Error al eliminar el modelo', 'error'); }
}
