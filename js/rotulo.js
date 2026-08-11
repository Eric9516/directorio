import { sbFetch, sbStorageUpload, sbStorageDelete, SUPABASE_URL } from './api.js';
import { state }    from './state.js';
import { toast }    from './ui.js';

export const DEFAULT_DESIGN = {
  headerBg:    '#1a3a6b', barColor:    '#c8222a', barHeight:   4,
  titleColor:  '#1a3a6b', textColor:   '#333333', bodyBg:      '#ffffff',
  logoSize:    40,        logoPos:     'left',
  empresaFont: 'Arial,sans-serif', empresaSize: 14, empresaPos:  'left', empresaColor: '#ffffff',
  provFont:    'Arial,sans-serif', provSize:    18, provAlign:   'left',
  marcoColor:  '#1a3a6b', marcoWidth:  1,
};

export function getCurrentDesign() {
  return Object.assign({}, DEFAULT_DESIGN, state.configData.rotulo_design || {});
}

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

// ===== MODAL DISEÑO ADMIN =====
export function openModalRotuloDesign() {
  loadDesignIntoControls(getCurrentDesign());
  const pieEl = document.getElementById('cfg_pie');
  if (pieEl) pieEl.value = state.configData.rotulo_pie || '';
  renderRotuloToggles();
  state.selectedDesignSize = 'a4';
  document.querySelectorAll('#modalRotuloDesign .size-btn').forEach(b => b.classList.remove('active'));
  const firstBtn = document.querySelector('#modalRotuloDesign .size-btn');
  if (firstBtn) firstBtn.classList.add('active');
  const dw = document.getElementById('design_w');
  const dh = document.getElementById('design_h');
  if (dw) dw.value = '21';
  if (dh) dh.value = '29.7';
  updateAdminPreview();
  document.getElementById('modalRotuloDesign').classList.add('open');
}

export function selectDesignSize(btn, name) {
  document.querySelectorAll('#modalRotuloDesign .size-btn').forEach(b => b.classList.remove('active'));
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
    if (ratio < 1) { wrap.style.maxWidth = '320px'; wrap.style.margin = '0 auto'; }
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

// ===== TAMAÑOS =====
function getRotuloWH() {
  const w = parseFloat(document.getElementById('rotulo_w')?.value) || 21;
  const h = parseFloat(document.getElementById('rotulo_h')?.value) || 29.7;
  return [w * 10, h * 10];
}

function getDesignWH() {
  const w = parseFloat(document.getElementById('design_w')?.value) || 21;
  const h = parseFloat(document.getElementById('design_h')?.value) || 29.7;
  return [w * 10, h * 10];
}

export function onCustomSizeInput(ctx) {
  const modal = ctx === 'design' ? '#modalRotuloDesign' : '#modalRotulo';
  document.querySelectorAll(modal + ' .size-btn').forEach(b => b.classList.remove('active'));
  if (ctx === 'design') updateAdminPreview();
  else renderRotuloPreview();
}

// ===== MODAL RÓTULO (usuario) =====
export function openRotulo(id) {
  state.rotuloProvId = id;
  document.getElementById('rotuloDetalle').value = '';
  document.getElementById('rotuloExtra').value   = '';
  document.getElementById('rotuloTipoDoc').value    = '';
  document.getElementById('rotuloNumDoc').value     = '';
  document.getElementById('rotuloBultoN').value     = '';
  document.getElementById('rotuloBultoTotal').value = '';
  document.querySelectorAll('#modalRotulo .size-btn').forEach(b => b.classList.remove('active'));
  const a4btn = document.querySelector('#modalRotulo .size-btn');
  if (a4btn) a4btn.classList.add('active');
  const wEl = document.getElementById('rotulo_w');
  const hEl = document.getElementById('rotulo_h');
  if (wEl) wEl.value = '21';
  if (hEl) hEl.value = '29.7';
  renderRotuloPreview();
  loadRotulosGuardados(id);
  document.getElementById('modalRotulo').classList.add('open');
}

// ===== DOCUMENTO / BULTO =====
function getDocInfo() {
  const tipoDoc    = document.getElementById('rotuloTipoDoc')?.value || '';
  const numDoc     = document.getElementById('rotuloNumDoc')?.value.trim() || '';
  const bultoN     = document.getElementById('rotuloBultoN')?.value || '';
  const bultoTotal = document.getElementById('rotuloBultoTotal')?.value || '';
  return { tipoDoc, numDoc, bultoN, bultoTotal };
}

function slugifyProv(nombre, id) {
  const slug = String(nombre || 'proveedor')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `${slug}_${String(id).slice(0, 8)}`;
}

// ===== HISTORIAL DE RÓTULOS GUARDADOS =====
export async function loadRotulosGuardados(provId) {
  const listEl = document.getElementById('rotulosGuardadosList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Cargando...</div>';
  try {
    const rows = await sbFetch(`/rotulos_generados?proveedor_id=eq.${provId}&select=*&order=created_at.desc&limit=15`);
    if (!rows.length) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Todavía no hay rótulos guardados para este proveedor.</div>';
      return;
    }
    listEl.innerHTML = rows.map(r => {
      const fecha  = new Date(r.created_at).toLocaleDateString('es-AR');
      const docTxt = r.tipo_documento ? `${r.tipo_documento === 'remito' ? 'Remito' : 'Nota de despacho'} ${r.numero_documento || ''}`.trim() : '';
      const bulto  = r.bulto_actual && r.bulto_total ? `Bulto ${r.bulto_actual}/${r.bulto_total}` : '';
      const label  = [docTxt, bulto].filter(Boolean).join(' — ') || 'Rótulo';
      const url    = `${SUPABASE_URL}/storage/v1/object/public/rotulos/${r.storage_path}`;
      return `<div style="display:flex;align-items:center;gap:4px;border-radius:6px;background:var(--surface2)">
        <a href="${url}" target="_blank" rel="noopener" style="flex:1;display:flex;justify-content:space-between;gap:8px;padding:6px 8px;font-size:12px;text-decoration:none;color:var(--text);min-width:0">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</span>
          <span style="color:var(--text-muted);white-space:nowrap">${fecha}</span>
        </a>
        <button type="button" onclick="deleteRotuloGuardado('${r.id}','${r.storage_path}')" title="Eliminar" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:6px 8px;font-size:13px;line-height:1">🗑️</button>
      </div>`;
    }).join('');
  } catch {
    listEl.innerHTML = '<div style="font-size:12px;color:var(--danger)">Error al cargar el historial.</div>';
  }
}

export async function deleteRotuloGuardado(id, storagePath) {
  if (!confirm('¿Eliminar este rótulo guardado? Esta acción no se puede deshacer.')) return;
  try {
    await sbFetch(`/rotulos_generados?id=eq.${id}`, { method: 'DELETE' });
    try { await sbStorageDelete(storagePath); } catch {}
    toast('Rótulo eliminado', 'error');
    loadRotulosGuardados(state.rotuloProvId);
  } catch {
    toast('Error al eliminar', 'error');
  }
}

export function selectSize(btn, name) {
  document.querySelectorAll('#modalRotulo .size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const wEl = document.getElementById('rotulo_w');
  const hEl = document.getElementById('rotulo_h');
  if (wEl) wEl.value = btn.dataset.w;
  if (hEl) hEl.value = btn.dataset.h;
  renderRotuloPreview();
}

// ===== RENDER HTML =====
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderRotuloPreviewTo(targetId, rd, pData, pContactsData, detalleText, extraText, docInfo = {}) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const { tipoDoc = '', numDoc = '', bultoN = '', bultoTotal = '' } = docInfo;
  const docLabel   = tipoDoc && numDoc ? `${tipoDoc === 'remito' ? 'Remito' : 'Nota de despacho'} N°: ${numDoc}` : '';
  const bultoLabel = bultoN && bultoTotal ? `Bulto: ${bultoN}/${bultoTotal}` : '';

  const campos  = state.configData.rotulo_campos || { horario: true, direccion: true, telefono: true };
  const pie     = state.configData.rotulo_pie    || '';
  const empresa = state.configData.empresa_nombre || 'Cremac';
  const logo    = state.logoBase64 || state.configData.logo_base64 || '';
  const fecha   = new Date().toLocaleDateString('es-AR');
  const contact = pContactsData && pContactsData[0];

  const logoHtml = logo
    ? `<img src="${logo}" style="height:${rd.logoSize}px;object-fit:contain;flex-shrink:0" alt="${esc(empresa)}">`
    : '';
  const nameHtml = rd.empresaPos !== 'hidden'
    ? `<div style="font-family:${rd.empresaFont};font-size:${rd.empresaSize}px;font-weight:bold;color:${rd.empresaColor || '#ffffff'};${rd.empresaPos === 'right' ? 'margin-left:auto' : ''}">${esc(empresa)}</div>`
    : '';

  let headerContent;
  if      (rd.logoPos === 'center') headerContent = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%">${logoHtml}${nameHtml}</div>`;
  else if (rd.logoPos === 'right')  headerContent = `<div style="display:flex;align-items:center;width:100%;justify-content:space-between">${nameHtml}${logoHtml}</div>`;
  else                              headerContent = `<div style="display:flex;align-items:center;gap:12px;width:100%">${logoHtml}${nameHtml}</div>`;

  el.innerHTML = `
    <div style="border:${rd.marcoWidth > 0 ? rd.marcoWidth + 'px solid ' + rd.marcoColor : 'none'};border-radius:8px;overflow:hidden;background:${rd.bodyBg};font-family:Arial,sans-serif">
      <div style="background:${rd.headerBg};padding:10px 14px;display:flex;align-items:center">${headerContent}</div>
      ${rd.barHeight > 0 ? `<div style="height:${rd.barHeight}px;background:${rd.barColor}"></div>` : ''}
      <div style="padding:14px">
        <div style="font-family:${rd.provFont};font-size:${rd.provSize}px;font-weight:bold;color:${rd.titleColor};text-align:${rd.provAlign};margin-bottom:10px">${esc(pData.nombre || '')}</div>
        ${campos.rubro     && pData.rubro     ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>Rubro:</strong> ${esc(pData.rubro)}</div>` : ''}
        ${campos.direccion && pData.direccion ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>Dirección:</strong> ${esc([pData.direccion, pData.localidad, pData.provincia, pData.codigo_postal ? 'CP ' + pData.codigo_postal : ''].filter(Boolean).join(', '))}</div>` : ''}
        ${campos.horario   && pData.horario   ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>Horario:</strong> ${esc(pData.horario)}</div>` : ''}
        ${contact && campos.telefono && (contact.telefono || contact.celular) ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>Contacto:</strong> ${esc(contact.nombre)}${contact.cargo ? ' (' + esc(contact.cargo) + ')' : ''}${contact.telefono ? ' — ' + esc(contact.telefono) : ''}${contact.celular ? ' / ' + esc(contact.celular) : ''}</div>` : ''}
        ${docLabel   ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>${esc(docLabel)}</strong></div>` : ''}
        ${bultoLabel ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>${esc(bultoLabel)}</strong></div>` : ''}
        ${extraText  ? `<div style="font-size:12px;font-weight:bold;color:${rd.barColor};margin-bottom:4px">⚠ ${esc(extraText)}</div>` : ''}
        ${detalleText ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #ddd"><div style="font-size:10px;text-transform:uppercase;color:#999;font-weight:bold;margin-bottom:3px">Detalle</div><div style="font-size:12px;color:${rd.textColor};white-space:pre-wrap">${esc(detalleText)}</div></div>` : ''}
      </div>
      <div style="background:#f7f9fc;border-top:1px solid #ddd;padding:6px 14px;display:flex;justify-content:space-between;font-size:10px;color:#999">
        <span>${pie ? esc(pie) : esc(empresa)}</span>
        <span>📅 ${fecha}</span>
      </div>
    </div>`;
}

export function renderRotuloPreview() {
  const p = state.proveedores.find(x => x.id === state.rotuloProvId);
  if (!p) return;
  const pContacts = state.contactos.filter(c => c.proveedor_id === p.id);
  renderRotuloPreviewTo('rotuloPreview', getCurrentDesign(), p, pContacts,
    document.getElementById('rotuloDetalle').value,
    document.getElementById('rotuloExtra').value,
    getDocInfo());
}

// ===== PDF =====
function hexRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function buildPDF(doc, p, rd, pContacts, campos, detalle, extra, pie, empresa, logo, fecha, w, h, docInfo = {}) {
  const isSmall  = w <= 110 && h <= 80;
  const margin   = isSmall ? 4 : 14;
  const contentW = w - margin * 2;
  let y = 0;

  const headerH = isSmall ? 12 : 18;
  const [hr, hg, hb] = hexRgb(rd.headerBg);
  doc.setFillColor(hr, hg, hb);
  doc.rect(0, 0, w, headerH, 'F');

  if (logo) {
    try {
      const imgH = isSmall ? 8 : rd.logoSize / 4;
      const imgW = imgH * 2;
      let lx = margin;
      if (rd.logoPos === 'center') lx = (w - imgW) / 2;
      if (rd.logoPos === 'right')  lx = w - margin - imgW;
      doc.addImage(logo, 'PNG', lx, isSmall ? 2 : (headerH - imgH) / 2, imgW, imgH);
    } catch {}
  }

  if (rd.empresaPos !== 'hidden') {
    const [ecr, ecg, ecb] = hexRgb(rd.empresaColor || '#ffffff');
    doc.setTextColor(ecr, ecg, ecb);
    doc.setFontSize(isSmall ? 7 : rd.empresaSize * 0.75);
    doc.setFont('helvetica', 'bold');
    const nx    = rd.empresaPos === 'center' ? w / 2 : (rd.empresaPos === 'right' ? w - margin : (logo ? margin + (isSmall ? 16 : rd.logoSize / 2 + 4) : margin));
    const align = rd.empresaPos === 'center' ? 'center' : (rd.empresaPos === 'right' ? 'right' : 'left');
    doc.text(empresa, nx, headerH / 2 + 2, { align });
  }

  if (rd.barHeight > 0) {
    const [br, bg, bb] = hexRgb(rd.barColor);
    doc.setFillColor(br, bg, bb);
    doc.rect(0, headerH, w, isSmall ? 1.5 : rd.barHeight * 0.4, 'F');
    y = headerH + (isSmall ? 1.5 : rd.barHeight * 0.4);
  } else {
    y = headerH;
  }
  y += isSmall ? 4 : 8;

  const [tr, tg, tb] = hexRgb(rd.titleColor);
  doc.setTextColor(tr, tg, tb);
  doc.setFontSize(isSmall ? 9 : rd.provSize * 0.7);
  doc.setFont('helvetica', 'bold');
  const provX = rd.provAlign === 'center' ? w / 2 : (rd.provAlign === 'right' ? w - margin : margin);
  doc.text(p.nombre, provX, y, { align: rd.provAlign });
  y += isSmall ? 5 : 8;

  const lineH = isSmall ? 4 : 6;
  const [txr, txg, txb] = hexRgb(rd.textColor);
  doc.setFontSize(isSmall ? 7 : 10);

  const addLine = (label, value) => {
    if (!value) return;
    doc.setTextColor(100, 100, 100); doc.setFont('helvetica', 'bold');
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(txr, txg, txb);
    const lines = doc.splitTextToSize(value, contentW - 25);
    doc.text(lines, margin + 22, y);
    y += lineH * lines.length;
  };

  if (campos.rubro     && p.rubro)     addLine('Rubro', p.rubro);
  if (campos.direccion && p.direccion) addLine('Dirección', [p.direccion, p.localidad, p.provincia, p.codigo_postal ? 'CP ' + p.codigo_postal : ''].filter(Boolean).join(', '));
  if (campos.horario   && p.horario)   addLine('Horario', p.horario);

  const contact = pContacts[0];
  if (contact && campos.telefono && (contact.telefono || contact.celular)) {
    addLine('Contacto', `${contact.nombre}${contact.cargo ? ' (' + contact.cargo + ')' : ''}${contact.telefono ? ' — ' + contact.telefono : ''}${contact.celular ? ' / ' + contact.celular : ''}`);
  }

  const { tipoDoc = '', numDoc = '', bultoN = '', bultoTotal = '' } = docInfo;
  if (tipoDoc && numDoc) addLine(tipoDoc === 'remito' ? 'Remito N°' : 'N° Desp.', numDoc);
  if (bultoN && bultoTotal) addLine('Bulto', `${bultoN}/${bultoTotal}`);

  if (extra) {
    const [br, bg, bb] = hexRgb(rd.barColor);
    doc.setTextColor(br, bg, bb); doc.setFont('helvetica', 'bold');
    doc.text('! ' + extra, margin, y); y += lineH;
  }

  if (detalle) {
    y += 3;
    doc.setDrawColor(200, 200, 200); doc.line(margin, y, w - margin, y); y += 4;
    doc.setTextColor(120, 120, 120); doc.setFontSize(isSmall ? 6 : 8); doc.setFont('helvetica', 'bold');
    doc.text('DETALLE:', margin, y); y += lineH - 1;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(txr, txg, txb); doc.setFontSize(isSmall ? 7 : 10);
    const lines = doc.splitTextToSize(detalle, contentW);
    doc.text(lines, margin, y);
  }

  const footerH = isSmall ? 7 : 10;
  doc.setFillColor(247, 249, 252); doc.rect(0, h - footerH, w, footerH, 'F');
  doc.setDrawColor(221, 227, 236); doc.line(0, h - footerH, w, h - footerH);
  doc.setTextColor(150, 150, 150); doc.setFontSize(isSmall ? 5 : 8); doc.setFont('helvetica', 'normal');
  doc.text(pie || empresa, margin, h - footerH + (isSmall ? 4.5 : 7));
  doc.text(fecha, w - margin, h - footerH + (isSmall ? 4.5 : 7), { align: 'right' });

  if (rd.marcoWidth > 0) {
    const [mr, mg, mb] = hexRgb(rd.marcoColor);
    doc.setDrawColor(mr, mg, mb); doc.setLineWidth(rd.marcoWidth * 0.3);
    doc.rect(rd.marcoWidth * 0.15, rd.marcoWidth * 0.15, w - rd.marcoWidth * 0.3, h - rd.marcoWidth * 0.3);
  }
}

function getPDFContext() {
  const p = state.proveedores.find(x => x.id === state.rotuloProvId);
  if (!p) return null;
  const { jsPDF } = window.jspdf;
  const rd        = getCurrentDesign();
  const [w, h]    = getRotuloWH();
  const doc       = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'mm', format: [w, h] });
  return {
    p, doc, rd, w, h,
    pContacts: state.contactos.filter(c => c.proveedor_id === p.id),
    campos:    state.configData.rotulo_campos || { horario: true, direccion: true, telefono: true },
    detalle:   document.getElementById('rotuloDetalle').value,
    extra:     document.getElementById('rotuloExtra').value,
    pie:       state.configData.rotulo_pie     || '',
    empresa:   state.configData.empresa_nombre || 'Cremac',
    logo:      state.logoBase64 || state.configData.logo_base64 || '',
    fecha:     new Date().toLocaleDateString('es-AR'),
    docInfo:   getDocInfo(),
  };
}

export async function generatePDF() {
  const ctx = getPDFContext();
  if (!ctx) return;
  const { p, doc, rd, w, h, pContacts, campos, detalle, extra, pie, empresa, logo, fecha, docInfo } = ctx;
  buildPDF(doc, p, rd, pContacts, campos, detalle, extra, pie, empresa, logo, fecha, w, h, docInfo);
  doc.save(`rotulo_${p.nombre.replace(/\s+/g, '_')}_${w}x${h}mm.pdf`);
  toast('PDF generado', 'success');

  try {
    const blob = doc.output('blob');
    const path = `${slugifyProv(p.nombre, p.id)}/${Date.now()}_${w}x${h}mm.pdf`;
    await sbStorageUpload(path, blob);
    await sbFetch('/rotulos_generados', {
      method: 'POST',
      body: JSON.stringify({
        proveedor_id:     p.id,
        tipo_documento:   docInfo.tipoDoc || null,
        numero_documento: docInfo.numDoc  || null,
        bulto_actual:     docInfo.bultoN     ? parseInt(docInfo.bultoN)     : null,
        bulto_total:      docInfo.bultoTotal ? parseInt(docInfo.bultoTotal) : null,
        storage_path:     path,
        creado_por:       state.currentUser?.id || null,
      }),
    });
    loadRotulosGuardados(p.id);
    toast('Guardado en la carpeta del proveedor', 'success');
  } catch (e) {
    toast('El PDF se descargó, pero no se pudo guardar en el historial: ' + e.message, 'error');
  }
}

export function previewPDF() {
  const ctx = getPDFContext();
  if (!ctx) return;
  const { p, doc, rd, w, h, pContacts, campos, detalle, extra, pie, empresa, logo, fecha, docInfo } = ctx;
  buildPDF(doc, p, rd, pContacts, campos, detalle, extra, pie, empresa, logo, fecha, w, h, docInfo);
  window.open(doc.output('bloburl'), '_blank');
}
