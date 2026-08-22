// Generación de etiquetas QR en PDF (hoja A4, varias por página) para imprimir y pegar
// en el depósito. Todo client-side: qrcode-generator arma el QR, jsPDF arma la hoja.
import { state } from './state.js';
import { toast, esc, closeModal } from './ui.js';

const COLS = 3;
const ROWS = 6;
const PAGE_W = 210, PAGE_H = 297, MARGIN = 15;
const LINEAS_POR_FORMATO = { qr: 0, qr_codigo: 1, qr_nombre: 2, qr_codigo_nombre: 3 };

// Único generador de PDF, reutilizado por el detalle de un ítem y por la selección múltiple.
export function generarQRPDF(items, nombreArchivo, formato = 'qr_codigo') {
  if (!items.length) { toast('No hay repuestos para generar QR', 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const cellW = (PAGE_W - MARGIN * 2) / COLS;
  const cellH = (PAGE_H - MARGIN * 2) / ROWS;
  const lineas = LINEAS_POR_FORMATO[formato] ?? 1;
  const qrSize = Math.min(cellW, cellH - lineas * 3.6 - 4) * 0.75;
  const perPage = COLS * ROWS;

  items.forEach((it, idx) => {
    const posInPage = idx % perPage;
    if (idx > 0 && posInPage === 0) doc.addPage();

    const col = posInPage % COLS;
    const row = Math.floor(posInPage / COLS);
    const cellX = MARGIN + col * cellW;
    const cellY = MARGIN + row * cellH;

    const qr = qrcode(0, 'M');
    qr.addData(it.codigo);
    qr.make();
    const dataUrl = qr.createDataURL(6, 4); // margen de 4 módulos: sin esto, muchos lectores no lo reconocen
    const formatoImg = dataUrl.match(/^data:image\/(\w+);/)?.[1]?.toUpperCase() || 'PNG';

    const qrX = cellX + (cellW - qrSize) / 2;
    const qrY = cellY + 2;
    doc.addImage(dataUrl, formatoImg, qrX, qrY, qrSize, qrSize);

    let textY = qrY + qrSize + 4;
    doc.setTextColor(30, 30, 30);

    if (formato === 'qr_codigo' || formato === 'qr_codigo_nombre') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(it.codigo, cellX + cellW / 2, textY, { align: 'center' });
      textY += 3.6;
    }
    if (formato === 'qr_nombre' || formato === 'qr_codigo_nombre') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const lines = doc.splitTextToSize(it.descripcion || '', cellW - 4).slice(0, 2);
      doc.text(lines, cellX + cellW / 2, textY, { align: 'center' });
    }
  });

  doc.save(nombreArchivo);
}

export function descargarQRItem(item) {
  generarQRPDF([item], `qr_${item.codigo}.pdf`, 'qr_codigo');
}

// ===== Modal de selección (varios ítems, cantidad de copias y formato a elección) =====

let seleccionQR = []; // { item_id, codigo, descripcion, cantidad }

export function abrirGenerarQR() {
  seleccionQR = [];
  document.getElementById('qrBuscarInput').value = '';
  document.getElementById('qrBusquedaResultados').innerHTML = '';
  renderQRSeleccion();
  document.getElementById('modalGenerarQR').classList.add('open');
}

export function renderQRBusqueda() {
  const q = document.getElementById('qrBuscarInput').value.trim().toLowerCase();
  const box = document.getElementById('qrBusquedaResultados');
  if (!q) { box.innerHTML = ''; return; }

  const matches = state.items
    .filter(it => [it.codigo, it.descripcion].some(v => v && v.toLowerCase().includes(q)))
    .slice(0, 15);

  box.innerHTML = matches.length
    ? matches.map(it => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;background:var(--surface2);border-radius:var(--radius-sm)">
          <span style="font-size:13px;min-width:0"><strong>${esc(it.codigo)}</strong> — ${esc(it.descripcion)}</span>
          <button class="btn btn-primary btn-sm" style="flex-shrink:0" onclick="agregarQRSeleccion('${it.id}')">＋ Agregar</button>
        </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:13px">Sin resultados</p>';
}

let pendienteItemId = null;

export function agregarQRSeleccion(itemId) {
  const it = state.items.find(x => x.id === itemId);
  if (!it) return;

  pendienteItemId = itemId;
  const existing = seleccionQR.find(s => s.item_id === itemId);
  document.getElementById('cantidadQRTitulo').textContent = `¿Cuántas etiquetas de "${it.codigo}" querés generar?`;
  document.getElementById('cantidadQRInput').value = existing?.cantidad || 1;
  document.getElementById('modalCantidadQR').classList.add('open');
}

export function confirmarCantidadQR() {
  const cantidad = parseInt(document.getElementById('cantidadQRInput').value, 10);
  if (!(cantidad > 0)) { toast('Ingresá un número mayor a 0', 'error'); return; }

  const it = state.items.find(x => x.id === pendienteItemId);
  if (!it) return;
  const existing = seleccionQR.find(s => s.item_id === pendienteItemId);
  if (existing) existing.cantidad = cantidad;
  else seleccionQR.push({ item_id: pendienteItemId, codigo: it.codigo, descripcion: it.descripcion, cantidad });

  closeModal('modalCantidadQR');
  renderQRSeleccion();
}

export function actualizarCantidadQR(itemId, value) {
  const s = seleccionQR.find(x => x.item_id === itemId);
  if (!s) return;
  const n = parseInt(value, 10);
  s.cantidad = n > 0 ? n : 1;
}

export function quitarQRSeleccion(itemId) {
  seleccionQR = seleccionQR.filter(s => s.item_id !== itemId);
  renderQRSeleccion();
}

function renderQRSeleccion() {
  const box = document.getElementById('qrSeleccionList');
  if (!seleccionQR.length) {
    box.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Todavía no agregaste ningún repuesto.</p>';
    return;
  }
  box.innerHTML = seleccionQR.map(s => `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="flex:1;min-width:160px;font-size:13px"><strong>${esc(s.codigo)}</strong> — ${esc(s.descripcion)}</div>
      <label style="font-size:12px;color:var(--text-muted)">Copias:</label>
      <input type="number" min="1" value="${s.cantidad}" style="width:64px" onchange="actualizarCantidadQR('${s.item_id}', this.value)">
      <button class="btn btn-danger-ghost btn-sm btn-icon" title="Quitar" onclick="quitarQRSeleccion('${s.item_id}')">✕</button>
    </div>`).join('');
}

export function generarQREtiquetasSeleccion() {
  if (!seleccionQR.length) { toast('Agregá al menos un repuesto', 'error'); return; }
  const formato = document.getElementById('qrFormato').value;
  const items = seleccionQR.flatMap(s => Array(s.cantidad).fill({ codigo: s.codigo, descripcion: s.descripcion }));
  generarQRPDF(items, `qr_repuestos_${new Date().toISOString().slice(0, 10)}.pdf`, formato);
  closeModal('modalGenerarQR');
}
