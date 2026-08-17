// Modal "Generar rótulo": crear o editar un envío puntual, arma el PDF y lo sube a Storage.
import { sbFetch, sbStorageUpload } from './api.js';
import { state }             from './state.js';
import { toast, esc }        from './ui.js';
import { loadComisionistas } from './comisionistas.js';
import { getCurrentDesign, renderRotuloPreviewTo } from './rotuloRender.js';
import { buildPDF }          from './rotuloPdf.js';
import { loadRotulosScreen } from './rotuloLista.js';

export function slugifyProv(nombre, id) {
  const slug = String(nombre || 'proveedor')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `${slug}_${String(id).slice(0, 8)}`;
}

function populateComisionistaSelect() {
  const sel = document.getElementById('rotuloComisionista');
  if (!sel) return;
  const cur = sel.value;
  const comisionistas = [...state.comisionistas].sort((a, b) => (a.empresa || a.nombre || '').localeCompare(b.empresa || b.nombre || ''));
  sel.innerHTML = '<option value="">Sin comisionista</option>' +
    comisionistas.map(c => `<option value="${c.id}">${esc(c.empresa || c.nombre)}</option>`).join('');
  sel.value = cur;
}

function resetRotuloDescargas() {
  document.getElementById('rotuloDescargasWrap').style.display = 'none';
  document.getElementById('rotuloDescargasList').innerHTML = '';
  const btn = document.getElementById('btnGuardarRotulo');
  if (btn) btn.disabled = false;
  const lbl = document.getElementById('btnGuardarRotuloLabel');
  if (lbl) lbl.textContent = 'Guardar';
}

export async function openRotulo(id) {
  state.rotuloProvId = id;
  state.rotuloEditando = null;
  state.rotuloGuardadoActual = null;
  document.getElementById('rotuloExtra').value   = '';
  document.getElementById('rotuloTipoDoc').value    = '';
  document.getElementById('rotuloNumDoc').value     = '';
  document.getElementById('rotuloValorDeclarado').value = '';
  document.getElementById('rotuloComisionista').value   = '';
  document.getElementById('rotuloBultoTotal').value = '1';
  document.getElementById('rotuloMotivoEdicion').value = '';
  document.getElementById('rotuloMotivoWrap').style.display = 'none';
  renderBultoDetalleFields(false);
  resetRotuloDescargas();
  document.querySelectorAll('#modalRotulo .size-btn').forEach(b => b.classList.remove('active'));
  const a4btn = document.querySelector('#modalRotulo .size-btn');
  if (a4btn) a4btn.classList.add('active');
  const wEl = document.getElementById('rotulo_w');
  const hEl = document.getElementById('rotulo_h');
  if (wEl) wEl.value = '21';
  if (hEl) hEl.value = '29.7';
  populateComisionistaSelect();
  renderRotuloPreview();
  document.getElementById('modalRotulo').classList.add('open');
  if (!state.comisionistas.length) {
    await loadComisionistas();
    populateComisionistaSelect();
  }
}

// ===== BULTOS (uno o varios por envío) =====
export function onBultoTotalChange() {
  renderBultoDetalleFields(true);
  renderRotuloPreview();
}

function renderBultoDetalleFields(preserve, prefill = null) {
  const wrap  = document.getElementById('rotuloDetallesWrap');
  const total = Math.max(1, parseInt(document.getElementById('rotuloBultoTotal')?.value) || 1);
  const prevValues = prefill || (preserve
    ? Array.from(wrap.querySelectorAll('.rotulo-bulto-detalle')).map(t => t.value)
    : []);
  wrap.innerHTML = Array.from({ length: total }, (_, i) => `
    <div class="form-group" style="margin-bottom:0">
      <label>${total > 1 ? `Descripción — Bulto ${i + 1} de ${total}` : 'Detalle / Descripción'}</label>
      <textarea class="rotulo-bulto-detalle" placeholder="Ej: Motor eléctrico para reparación — N° interno 0452" rows="3" oninput="renderRotuloPreview()">${esc(prevValues[i] || '')}</textarea>
    </div>`).join('');
}

function getBultosDetalle() {
  return Array.from(document.querySelectorAll('#rotuloDetallesWrap .rotulo-bulto-detalle')).map(t => t.value);
}

// ===== EDICIÓN (admin) =====
export async function editRotuloGuardado(id) {
  try {
    const rows = await sbFetch(`/rotulos_generados?id=eq.${id}&select=*`);
    const r = rows[0];
    if (!r) return;
    const bultos = await sbFetch(`/rotulos_bultos?rotulo_id=eq.${id}&select=*&order=numero.asc`);

    state.rotuloProvId = r.proveedor_id;
    state.rotuloEditando = { grupoId: r.grupo_id };
    state.rotuloGuardadoActual = null;

    document.getElementById('rotuloExtra').value          = r.extra || '';
    document.getElementById('rotuloTipoDoc').value        = r.tipo_documento || '';
    document.getElementById('rotuloNumDoc').value         = r.numero_documento || '';
    document.getElementById('rotuloValorDeclarado').value = r.valor_declarado || '';
    document.getElementById('rotuloBultoTotal').value     = bultos.length || r.bulto_total || 1;
    document.getElementById('rotuloMotivoEdicion').value  = '';
    document.getElementById('rotuloMotivoWrap').style.display = 'block';
    resetRotuloDescargas();
    renderBultoDetalleFields(false, bultos.map(b => b.detalle || ''));

    if (!state.comisionistas.length) await loadComisionistas();
    populateComisionistaSelect();
    document.getElementById('rotuloComisionista').value = r.comisionista_id || '';

    document.querySelectorAll('#modalRotulo .size-btn').forEach(b => b.classList.remove('active'));
    const wEl = document.getElementById('rotulo_w');
    const hEl = document.getElementById('rotulo_h');
    if (wEl) wEl.value = r.ancho_mm ? r.ancho_mm / 10 : 21;
    if (hEl) hEl.value = r.alto_mm  ? r.alto_mm  / 10 : 29.7;

    renderRotuloPreview();
    document.getElementById('modalRotulo').classList.add('open');
  } catch {
    toast('No se pudo cargar el rótulo para editar', 'error');
  }
}

// ===== DOCUMENTO =====
function getDocInfo() {
  const tipoDoc        = document.getElementById('rotuloTipoDoc')?.value || '';
  const numDoc         = document.getElementById('rotuloNumDoc')?.value.trim() || '';
  const valorDeclarado = document.getElementById('rotuloValorDeclarado')?.value.trim() || '';
  const comisionistaId = document.getElementById('rotuloComisionista')?.value || '';
  const bultoTotal     = document.getElementById('rotuloBultoTotal')?.value || '1';
  return { tipoDoc, numDoc, valorDeclarado, comisionistaId, bultoTotal };
}

function getRotuloWH() {
  const w = parseFloat(document.getElementById('rotulo_w')?.value) || 21;
  const h = parseFloat(document.getElementById('rotulo_h')?.value) || 29.7;
  return [w * 10, h * 10];
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

export function renderRotuloPreview() {
  const p = state.proveedores.find(x => x.id === state.rotuloProvId);
  if (!p) return;
  const pContacts = state.contactos.filter(c => c.proveedor_id === p.id);
  const bultos    = getBultosDetalle();
  const docInfo   = getDocInfo();
  renderRotuloPreviewTo('rotuloPreview', getCurrentDesign(), p, pContacts,
    bultos[0] || '',
    document.getElementById('rotuloExtra').value,
    { ...docInfo, bultoN: bultos.length > 1 ? '1' : '' });
}

// ===== GUARDAR (genera un PDF por bulto + sube a Storage + registra versión) =====
export async function guardarRotulo() {
  const p = state.proveedores.find(x => x.id === state.rotuloProvId);
  if (!p) return;

  const editando = state.rotuloEditando;
  let motivo = '';
  if (editando) {
    motivo = document.getElementById('rotuloMotivoEdicion')?.value.trim() || '';
    if (!motivo) { toast('Contá el motivo de la edición antes de guardar', 'error'); return; }
  }

  if (!document.getElementById('rotuloComisionista')?.value) {
    if (!confirm('No seleccionaste un comisionista para este envío. ¿Guardar igual?')) return;
  }

  const rd            = getCurrentDesign();
  const [w, h]         = getRotuloWH();
  const pContacts      = state.contactos.filter(c => c.proveedor_id === p.id);
  const campos         = state.configData.rotulo_campos || { horario: true, direccion: true, telefono: true };
  const pie            = state.configData.rotulo_pie     || '';
  const empresa        = state.configData.empresa_nombre || 'Cremac';
  const logo           = state.logoBase64 || state.configData.logo_base64 || '';
  const fecha          = new Date().toLocaleDateString('es-AR');
  const docInfo        = getDocInfo();
  const extra          = document.getElementById('rotuloExtra').value;
  const bultosDetalle  = getBultosDetalle();
  const total          = bultosDetalle.length;

  const btn = document.getElementById('btnGuardarRotulo');
  const lbl = document.getElementById('btnGuardarRotuloLabel');
  if (btn) btn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const bultosGenerados = [];
    for (let i = 0; i < total; i++) {
      if (lbl) lbl.textContent = total > 1 ? `Guardando bulto ${i + 1}/${total}...` : 'Guardando...';
      const doc = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'mm', format: [w, h] });
      buildPDF(doc, p, rd, pContacts, campos, bultosDetalle[i], extra, pie, empresa, logo, fecha, w, h,
        { tipoDoc: docInfo.tipoDoc, numDoc: docInfo.numDoc, valorDeclarado: docInfo.valorDeclarado,
          bultoN: total > 1 ? String(i + 1) : '', bultoTotal: total > 1 ? String(total) : '' });
      const blob = doc.output('blob');
      const path = `${slugifyProv(p.nombre, p.id)}/${Date.now()}_bulto${i + 1}de${total}_${w}x${h}mm.pdf`;
      const url  = await sbStorageUpload(path, blob);
      bultosGenerados.push({ numero: i + 1, detalle: bultosDetalle[i], storage_path: path, url });
    }

    const payload = {
      proveedor_id:     p.id,
      tipo_documento:   docInfo.tipoDoc || null,
      numero_documento: docInfo.numDoc  || null,
      valor_declarado:  docInfo.valorDeclarado || null,
      comisionista_id:  docInfo.comisionistaId || null,
      bulto_total:      total,
      extra:            extra || null,
      ancho_mm:         w,
      alto_mm:          h,
      storage_path:     bultosGenerados[0].storage_path,
      creado_por:       state.currentUser?.id || null,
      vigente:          true,
    };

    if (editando) {
      const siblings   = await sbFetch(`/rotulos_generados?grupo_id=eq.${editando.grupoId}&select=version`);
      const maxVersion = siblings.reduce((m, s) => Math.max(m, s.version), 0);
      payload.grupo_id       = editando.grupoId;
      payload.version        = maxVersion + 1;
      payload.motivo_edicion = motivo;
      await sbFetch(`/rotulos_generados?grupo_id=eq.${editando.grupoId}&vigente=eq.true`, { method: 'PATCH', body: JSON.stringify({ vigente: false }) });
    } else {
      payload.grupo_id = crypto.randomUUID();
      payload.version  = 1;
    }

    const inserted = await sbFetch('/rotulos_generados', { method: 'POST', body: JSON.stringify(payload) });
    const rotuloId = inserted[0]?.id;

    await sbFetch('/rotulos_bultos', {
      method: 'POST',
      body: JSON.stringify(bultosGenerados.map(b => ({
        rotulo_id: rotuloId, numero: b.numero, detalle: b.detalle || null, storage_path: b.storage_path,
      }))),
    });

    state.rotuloGuardadoActual = bultosGenerados.map(b => ({ numero: b.numero, url: b.url, w, h }));
    state.rotuloEditando = null;
    document.getElementById('rotuloMotivoWrap').style.display = 'none';

    document.getElementById('rotuloDescargasList').innerHTML = bultosGenerados.map(b => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--surface2);border-radius:6px;padding:8px 10px">
        <span style="font-size:12px;font-weight:600">Bulto ${b.numero}/${total}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="vistaPreviaRotuloGuardado(${b.numero})">Vista previa</button>
          <button class="btn btn-ghost btn-sm" onclick="descargarRotuloGuardado(${b.numero})">Descargar</button>
        </div>
      </div>`).join('');
    document.getElementById('rotuloDescargasWrap').style.display = 'block';

    if (document.getElementById('paneRotulos')?.style.display !== 'none') loadRotulosScreen();
    toast('Envío guardado', 'success');
  } catch (e) {
    toast('No se pudo guardar: ' + e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (lbl) lbl.textContent = 'Guardar';
  }
}

export function descargarRotuloGuardado(numero) {
  const item = (state.rotuloGuardadoActual || []).find(b => b.numero === numero);
  if (!item) return;
  const a = document.createElement('a');
  a.href = item.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.download = `rotulo_bulto${item.numero}_${item.w}x${item.h}mm.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function vistaPreviaRotuloGuardado(numero) {
  const item = (state.rotuloGuardadoActual || []).find(b => b.numero === numero);
  if (!item) return;
  window.open(item.url, '_blank');
}
