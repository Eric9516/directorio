// Log automático de errores del navegador: cuando algo revienta del lado del cliente
// (ej: un botón que queda muerto por un error de JS), queda registrado solo, sin que
// el usuario tenga que darse cuenta y avisar.
import { sbFetch } from './api.js';
import { state } from './state.js';
import { esc, toast } from './ui.js';
import { isOwner } from './admin.js';

export function puedeVerErrores() {
  return state.currentUser?.puede_ver_errores === true || isOwner();
}

// Corta una tormenta de errores repetidos (ej: un error en un loop) para no llenar
// la tabla de basura ni generar tráfico de más en una sola sesión.
const MAX_ERRORES_POR_SESION = 20;
let loggedCount = 0;

function pantallaActual() {
  if (document.getElementById('mantenimientoScreen')?.classList.contains('visible')) {
    const tab = document.querySelector('#mantenimientoScreen .nav-tab.active');
    return `mantenimiento:${tab ? tab.id.replace('manttab-', '') : '?'}`;
  }
  if (document.getElementById('appScreen')?.classList.contains('visible')) {
    const tab = document.querySelector('#appScreen .nav-tab.active');
    return `directorio:${tab ? tab.id.replace('tab-', '') : '?'}`;
  }
  return 'auth';
}

async function registrarError(mensaje, stack) {
  if (!state.currentUser?.id) return; // sin sesión no hay a quién atribuirlo, y evita abrir el insert a anónimos
  if (loggedCount >= MAX_ERRORES_POR_SESION) return;
  loggedCount++;
  try {
    await sbFetch('/error_logs', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: state.currentUser.id,
        usuario_email: state.currentUser.email || null,
        mensaje: String(mensaje || 'Error desconocido').slice(0, 2000),
        stack: stack ? String(stack).slice(0, 4000) : null,
        pantalla: pantallaActual(),
        url: location.href,
        user_agent: navigator.userAgent,
      }),
    });
  } catch {
    // Si falla el guardado del error, no queremos generar otro error por eso.
  }
}

export function initErrorLogging() {
  window.addEventListener('error', e => {
    registrarError(e.message, e.error?.stack);
  });
  window.addEventListener('unhandledrejection', e => {
    const reason = e.reason;
    registrarError(reason?.message || String(reason), reason?.stack);
  });
}

export async function loadErrorLogs() {
  const box = document.getElementById('errorLogTableBody');
  if (!box) return;
  box.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Cargando...</td></tr>';
  try {
    const rows = await sbFetch('/error_logs?select=*&order=created_at.desc&limit=200');
    if (!rows.length) {
      box.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin errores registrados</td></tr>';
      return;
    }
    box.innerHTML = rows.map(r => `
      <tr>
        <td style="white-space:nowrap">${esc(new Date(r.created_at).toLocaleString('es-AR'))}</td>
        <td>${esc(r.usuario_email || '—')}</td>
        <td>${esc(r.pantalla || '—')}</td>
        <td style="max-width:340px;white-space:normal;font-size:12px">${esc(r.mensaje)}</td>
        <td style="max-width:200px;white-space:normal;font-size:11px;color:var(--text-muted)">${esc((r.user_agent || '').slice(0, 80))}</td>
      </tr>`).join('');
  } catch {
    box.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger)">Error al cargar el log</td></tr>';
  }
}

export async function limpiarErrorLogs() {
  if (!confirm('¿Borrar todos los errores registrados?')) return;
  try {
    await sbFetch('/error_logs?id=not.is.null', { method: 'DELETE' });
    toast('Log de errores limpiado', 'success');
    await loadErrorLogs();
  } catch (e) {
    toast('Error al limpiar: ' + e.message, 'error');
  }
}
