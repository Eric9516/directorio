// Escaneo de QR con la cámara para agregar repuestos al retiro sin buscarlos a mano.
// Requiere HTTPS (o localhost) — el navegador no da acceso a la cámara si no.
import { state } from './state.js';
import { toast, esc } from './ui.js';
import { addToRetiroCart, removeFromRetiroCart } from './retiros.js';
import { showMantTab } from './mantenimiento.js';

let stream = null;
let scanning = false;
let ultimoCodigo = null;
let ultimoTimestamp = 0;
let canvas = null;

const MENSAJE_INICIAL = 'Apuntá al código QR del repuesto...';

export async function abrirEscaner() {
  const modal = document.getElementById('modalEscanear');
  const video = document.getElementById('scanVideo');
  const status = document.getElementById('scanStatus');
  status.textContent = MENSAJE_INICIAL;
  status.style.color = '';
  modal.classList.add('open');
  renderScanList();

  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Tu navegador no permite acceder a la cámara acá (¿estás en https:// o localhost?).';
    status.style.color = 'var(--danger)';
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    await video.play();
    canvas = canvas || document.createElement('canvas');
    scanning = true;
    ultimoCodigo = null;
    requestAnimationFrame(loopEscaneo);
  } catch (e) {
    status.textContent = 'No se pudo acceder a la cámara: ' + e.message;
    status.style.color = 'var(--danger)';
    toast('No se pudo acceder a la cámara', 'error');
  }
}

export function cerrarEscaner() {
  scanning = false;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  document.getElementById('modalEscanear').classList.remove('open');
}

// La usa el botón "Listo": cierra la cámara y lleva directo a revisar lo escaneado.
export function terminarEscaneo() {
  cerrarEscaner();
  showMantTab('carrito');
}

// El cierre genérico (clic afuera del modal, tecla Escape) solo oculta el modal —
// sin esto, la cámara seguiría encendida en segundo plano.
document.getElementById('modalEscanear')?.addEventListener('click', e => {
  if (e.target.id === 'modalEscanear') cerrarEscaner();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('modalEscanear')?.classList.contains('open')) cerrarEscaner();
});

function loopEscaneo() {
  if (!scanning) return;
  const video = document.getElementById('scanVideo');

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) procesarCodigo(code.data);
  }

  if (scanning) requestAnimationFrame(loopEscaneo);
}

// Exportada aparte para poder probarla sin depender de una cámara real (tests / consola).
export function procesarCodigo(codigo) {
  const ahora = Date.now();
  if (codigo === ultimoCodigo && ahora - ultimoTimestamp < 2000) return; // evita agregar 10 veces el mismo mientras sigue en cuadro
  ultimoCodigo = codigo;
  ultimoTimestamp = ahora;

  const status = document.getElementById('scanStatus');
  const it = state.items.find(x => x.codigo === codigo);

  if (!it) {
    status.textContent = `❌ Código "${codigo}" no encontrado en el catálogo`;
    status.style.color = 'var(--danger)';
  } else {
    addToRetiroCart(it.id, null);
    status.textContent = `✓ ${it.codigo} agregado — seguí escaneando`;
    status.style.color = 'var(--success)';
    renderScanList();
  }

  setTimeout(() => {
    status.textContent = MENSAJE_INICIAL;
    status.style.color = '';
  }, 1800);
}

// Muestra lo ya escaneado ahí mismo, sin taparlo con el modal — mismo dato que
// "Tu lista de retiro" de la pantalla de Buscar, solo que visible mientras seguís escaneando.
function renderScanList() {
  const box = document.getElementById('scanCartList');
  if (!box) return;
  if (!state.retiroCart.length) {
    box.innerHTML = '<p style="color:var(--text-muted);font-size:12px">Todavía no escaneaste nada.</p>';
    return;
  }
  box.innerHTML = state.retiroCart.map(c => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--surface2);border-radius:var(--radius-sm)">
      <div style="flex:1;font-size:12px;min-width:0"><strong>${esc(c.codigo)}</strong> — ${esc(c.descripcion)}</div>
      <span class="badge badge-rubro">x${c.cantidad}</span>
      <button class="btn btn-danger-ghost btn-sm btn-icon" title="Quitar" onclick="removeFromRetiroCartYRefrescarScan('${c.item_id}')">✕</button>
    </div>`).join('');
}

// Wrapper para que, al quitar un ítem desde acá, también se actualice esta lista
// (removeFromRetiroCart por sí solo solo refresca la de la pantalla de Buscar).
export function removeFromRetiroCartYRefrescarScan(itemId) {
  removeFromRetiroCart(itemId);
  renderScanList();
}
