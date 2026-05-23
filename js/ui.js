// Utilidades de UI: toast, modales, menú mobile, helpers de escape y campo

export function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  const icons = { success: '✓', error: '✕' };
  el.innerHTML = `<span style="color:${type === 'success' ? 'var(--success)' : 'var(--danger)'};font-size:16px">${icons[type] || 'ℹ'}</span> ${msg}`;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3200);
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

export function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu.classList.contains('open')) {
    closeMobileMenu();
  } else {
    menu.classList.add('open');
    document.getElementById('mobileMenuOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

export function closeMobileMenu() {
  document.getElementById('mobileMenu')?.classList.remove('open');
  document.getElementById('mobileMenuOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// Escapa HTML para prevenir XSS
export function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Genera una fila de detalle label/valor
export function field(label, val) {
  if (!val) return '';
  return `<div class="detail-item"><label>${label}</label><div class="value">${esc(val)}</div></div>`;
}
