import { sbFetch } from './api.js';
import { state } from './state.js';
import { toast, closeModal } from './ui.js';

// ============================================
// TAREAS SEM\u00c1FORO \u2014 M\u00f3dulo principal
// ============================================

// ===== HELPERS =====
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function trafficLabel(level) {
  const map = { green: 'Normal', yellow: 'Atenci\u00f3n', red: 'Cr\u00edtica' };
  return map[level] || level;
}

// ===== CARGAR TAREAS =====
export async function loadTareas() {
  try {
    state.tareas = await sbFetch('/tasks?user_id=eq.' + state.currentUser.id + '&order=created_at.desc&select=*');
  } catch (e) {
    state.tareas = [];
    toast('Error al cargar tareas', 'error');
  }
  renderTareasStats();
  renderTareas();
}

// ===== STATS =====
function renderTareasStats() {
  const pending = state.tareas.filter(t => t.status === 'pending');
  const red = pending.filter(t => t.traffic_level === 'red').length;
  const yellow = pending.filter(t => t.traffic_level === 'yellow').length;
  const green = pending.filter(t => t.traffic_level === 'green').length;
  const stagnant = pending.filter(t => t.is_stagnant).length;

  const el = document.getElementById('tareasStats');
  if (!el) return;
  el.innerHTML = `
    <div class="tareas-stat stat-red">
      <div class="tareas-stat-number">${red}</div>
      <div class="tareas-stat-label">Rojas</div>
    </div>
    <div class="tareas-stat stat-yellow">
      <div class="tareas-stat-number">${yellow}</div>
      <div class="tareas-stat-label">Amarillas</div>
    </div>
    <div class="tareas-stat stat-green">
      <div class="tareas-stat-number">${green}</div>
      <div class="tareas-stat-label">Verdes</div>
    </div>
    <div class="tareas-stat stat-blue">
      <div class="tareas-stat-number">${stagnant}</div>
      <div class="tareas-stat-label">Estancadas</div>
    </div>
  `;
}

// ===== FILTRO ACTIVO =====
let currentFilter = 'todas';
let currentView = 'wide';

export function setTareasFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.tareas-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  renderTareas();
}

// ===== RENDER LISTA =====
function renderTareas() {
  const container = document.getElementById('tareasListContainer');
  if (!container) return;

  let tasks = state.tareas.filter(t => t.status === 'pending');

  switch (currentFilter) {
    case 'green': tasks = tasks.filter(t => t.traffic_level === 'green'); break;
    case 'yellow': tasks = tasks.filter(t => t.traffic_level === 'yellow'); break;
    case 'red': tasks = tasks.filter(t => t.traffic_level === 'red'); break;
    case 'stagnant': tasks = tasks.filter(t => t.is_stagnant); break;
    case 'completed': tasks = state.tareas.filter(t => t.status === 'completed'); break;
    case 'todas':
    default: break;
  }

  if (currentFilter === 'todas') {
    const order = { red: 0, yellow: 2, green: 3 };
    tasks.sort((a, b) => {
      const aOrder = a.is_stagnant && a.traffic_level !== 'red' ? 1 : (order[a.traffic_level] ?? 3);
      const bOrder = b.is_stagnant && b.traffic_level !== 'red' ? 1 : (order[b.traffic_level] ?? 3);
      return aOrder - bOrder;
    });
  }

  if (tasks.length === 0) {
    const msgs = {
      todas: { icon: '\ud83d\udea6', title: 'Sin tareas pendientes', desc: 'Cre\u00e1 tu primera tarea para empezar.' },
      completed: { icon: '\u2705', title: 'Sin tareas completadas', desc: 'Complet\u00e1 tareas para verlas ac\u00e1.' },
      stagnant: { icon: '\ud83c\udfaf', title: 'Sin tareas estancadas', desc: '\u00a1Bien! No ten\u00e9s tareas acumuladas.' },
      green: { icon: '\ud83d\udfe2', title: 'Sin tareas verdes', desc: '' },
      yellow: { icon: '\ud83d\udfe1', title: 'Sin tareas amarillas', desc: '' },
      red: { icon: '\ud83d\udd34', title: 'Sin tareas rojas', desc: '' },
    };
    const m = msgs[currentFilter] || msgs.todas;
    container.innerHTML = `
      <div class="tareas-empty">
        <div class="tareas-empty-icon">${m.icon}</div>
        <h3>${m.title}</h3>
        <p>${m.desc}</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="task-list view-${currentView}">${tasks.map(t => renderTaskCard(t, currentView)).join('')}</div>`;
}

function renderTaskCard(t, view) {
  const isCompleted = t.status === 'completed';
  const title = `${isCompleted ? '<s style="opacity:0.5">' : ''}${esc(t.title)}${isCompleted ? '</s>' : ''}`;
  const badge = `<span class="traffic-badge ${t.traffic_level}">${trafficLabel(t.traffic_level)}</span>`;
  const stagnant = t.is_stagnant ? '<span class="stagnant-badge">\u26a0</span>' : '';
  const desc = t.description ? `<div class="task-card-desc">${esc(t.description)}</div>` : '';
  const meta = `<div class="task-card-meta">
    <span class="task-meta-item">\ud83d\udcc5 ${formatDate(t.start_date)}</span>
    <span class="task-meta-item">\u23f3 ${t.pending_days}d</span>
    ${t.carry_count > 0 ? `<span class="task-meta-item">\ud83d\udd04 ${t.carry_count}</span>` : ''}
  </div>`;
  const completeBtn = !isCompleted ? `<button class="task-action-btn complete" onclick="event.stopPropagation();completeTask('${t.id}')">\u2713</button>` : '';

  if (view === 'grid') {
    return `
      <div class="task-card ${t.traffic_level}" onclick="openTaskDetail('${t.id}')">
        <div class="task-card-top">
          <div class="task-card-title">${title}</div>
          ${badge} ${stagnant}
        </div>
        ${desc}
        ${meta}
        ${!isCompleted ? `<div class="task-card-bottom">${completeBtn}</div>` : ''}
      </div>`;
  }

  return `
    <div class="task-card ${t.traffic_level}" onclick="openTaskDetail('${t.id}')">
      <div class="task-card-body">
        <div class="task-card-top">
          <div class="task-card-title">${title}</div>
          ${badge} ${stagnant}
        </div>
        ${desc}
        ${meta}
      </div>
      <div class="task-card-actions">${completeBtn}</div>
    </div>`;
}

// ===== MODAL NUEVA TAREA =====
export function openNewTaskModal() {
  document.getElementById('nt_titulo').value = '';
  document.getElementById('nt_descripcion').value = '';
  document.getElementById('nt_semaforo').value = 'green';
  document.getElementById('nt_fecha').value = todayStr();
  document.getElementById('nt_fecha').min = todayStr();
  document.getElementById('modalNewTask').classList.add('open');
}

export async function saveNewTask() {
  const title = document.getElementById('nt_titulo').value.trim();
  const description = document.getElementById('nt_descripcion').value.trim();
  const traffic = document.getElementById('nt_semaforo').value;
  const date = document.getElementById('nt_fecha').value || null;

  if (!title) { toast('El t\u00edtulo es obligatorio', 'error'); return; }

  try {
    await sbFetch('/rpc/create_task', {
      method: 'POST',
      body: JSON.stringify({
        p_title: title,
        p_description: description,
        p_traffic_level: traffic,
        p_assigned_date: date
      })
    });
    toast('Tarea creada', 'success');
    closeModal('modalNewTask');
    await loadTareas();
  } catch (e) {
    toast('Error al crear tarea: ' + e.message, 'error');
  }
}

// ===== DETALLE DE TAREA =====
export async function openTaskDetail(taskId) {
  const t = state.tareas.find(x => x.id === taskId);
  if (!t) return;
  state.currentTaskId = taskId;

  document.getElementById('taskDetailTitle').textContent = t.title;

  let history = [];
  try {
    history = await sbFetch('/task_history?task_id=eq.' + taskId + '&order=created_at.desc&select=*');
  } catch {}

  const actionLabels = {
    created: '\ud83c\udd95 Creada',
    edited: '\u270f\ufe0f Editada',
    completed: '\u2705 Completada',
    cancelled: '\u274c Cancelada',
    carried: '\ud83d\udd04 Arrastrada',
    reprogrammed: '\ud83d\udcc5 Reprogramada',
    traffic_changed: '\ud83d\udea6 Sem\u00e1foro',
    stagnant_detected: '\u26a0\ufe0f Estancada',
  };

  document.getElementById('taskDetailBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Estado</label><div class="value"><span class="badge ${t.status === 'pending' ? 'badge-active' : 'badge-inactive'}">${t.status === 'pending' ? 'Pendiente' : t.status === 'completed' ? 'Completada' : 'Cancelada'}</span></div></div>
      <div class="detail-item"><label>Sem\u00e1foro</label><div class="value"><span class="traffic-badge ${t.traffic_level}">${trafficLabel(t.traffic_level)}</span></div></div>
      <div class="detail-item"><label>Fecha inicio</label><div class="value">${formatDate(t.start_date)}</div></div>
      <div class="detail-item"><label>Fecha asignada</label><div class="value">${formatDate(t.assigned_date)}</div></div>
      <div class="detail-item"><label>D\u00edas pendiente</label><div class="value">${t.pending_days}</div></div>
      <div class="detail-item"><label>Arrastres</label><div class="value">${t.carry_count}</div></div>
      <div class="detail-item"><label>Estancada</label><div class="value">${t.is_stagnant ? '<span class="stagnant-badge">\u26a0 S\u00ed</span>' : 'No'}</div></div>
    </div>
    ${t.description ? `<div class="detail-section"><label style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted)">Descripci\u00f3n</label><p style="margin-top:4px;font-size:14px;color:var(--text-mid)">${esc(t.description)}</p></div>` : ''}
    ${t.is_stagnant && t.status === 'pending' ? `
    <div style="background:#fff3e0;border:1.5px solid #ffe0b2;border-radius:var(--radius-sm);padding:14px;margin-top:12px">
      <div style="font-size:13px;font-weight:700;color:#e65100;margin-bottom:4px">\u26a0 Tarea estancada</div>
      <div style="font-size:12px;color:#bf360c;line-height:1.5">Esta tarea lleva varios d\u00edas pendiente y requiere una decisi\u00f3n para que no siga acumul\u00e1ndose.</div>
    </div>` : ''}
    <div class="divider"></div>
    <div style="font-weight:700;color:var(--blue);margin-bottom:12px;font-size:13px">\ud83d\udccb Historial</div>
    ${history.length === 0 ? '<p style="color:var(--text-muted);font-size:12px">Sin registros</p>' :
      `<div style="display:flex;flex-direction:column;gap:6px">${history.map(h => `
        <div style="display:flex;gap:10px;align-items:flex-start;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-weight:700;white-space:nowrap;color:var(--text-mid)">${actionLabels[h.action] || h.action}</span>
          <span style="color:var(--text-muted);flex:1">${esc(h.note || '')}</span>
          <span style="color:var(--text-muted);white-space:nowrap;font-size:11px">${new Date(h.created_at).toLocaleDateString('es-AR')}</span>
        </div>`).join('')}
      </div>`}
  `;

  const actionsEl = document.getElementById('taskDetailActions');
  if (t.status === 'pending') {
    actionsEl.style.display = 'flex';
  } else {
    actionsEl.style.display = 'none';
  }

  document.getElementById('modalTaskDetail').classList.add('open');
}

// ===== COMPLETAR TAREA =====
export async function completeTask(taskId) {
  try {
    await sbFetch('/rpc/complete_task', {
      method: 'POST',
      body: JSON.stringify({ p_task_id: taskId })
    });
    toast('Tarea completada', 'success');
    closeModal('modalTaskDetail');
    await loadTareas();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ===== CANCELAR TAREA =====
export async function cancelTask(taskId) {
  if (!confirm('\u00bfCancelar esta tarea?')) return;
  try {
    await sbFetch('/rpc/cancel_task', {
      method: 'POST',
      body: JSON.stringify({ p_task_id: taskId })
    });
    toast('Tarea cancelada', 'success');
    closeModal('modalTaskDetail');
    await loadTareas();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ===== REPROGRAMAR =====
export function openReprogramModal() {
  const t = state.tareas.find(x => x.id === state.currentTaskId);
  if (!t) return;
  document.getElementById('rp_fecha').value = '';
  document.getElementById('rp_fecha').min = todayStr();
  document.getElementById('modalReprogram').classList.add('open');
}

export async function saveReprogram() {
  const date = document.getElementById('rp_fecha').value;
  if (!date) { toast('Seleccion\u00e1 una fecha', 'error'); return; }

  try {
    await sbFetch('/rpc/reprogram_task', {
      method: 'POST',
      body: JSON.stringify({
        p_task_id: state.currentTaskId,
        p_new_assigned_date: date
      })
    });
    toast('Tarea reprogramada', 'success');
    closeModal('modalReprogram');
    closeModal('modalTaskDetail');
    await loadTareas();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ===== CIERRE DEL DIA =====
export async function openDayClose() {
  const pending = state.tareas.filter(t => t.status === 'pending');
  const completedToday = state.tareas.filter(t =>
    t.status === 'completed' && t.completed_at && t.completed_at.slice(0, 10) === todayStr()
  );
  const toCarry = pending.filter(t => t.assigned_date < todayStr());
  const stagnant = pending.filter(t => t.is_stagnant);

  document.getElementById('dayCloseBody').innerHTML = `
    <div class="tareas-stats" style="margin-bottom:16px">
      <div class="tareas-stat">
        <div class="tareas-stat-number green">${completedToday.length}</div>
        <div class="tareas-stat-label">Completadas hoy</div>
      </div>
      <div class="tareas-stat">
        <div class="tareas-stat-number blue">${pending.length}</div>
        <div class="tareas-stat-label">Pendientes</div>
      </div>
      <div class="tareas-stat">
        <div class="tareas-stat-number yellow">${toCarry.length}</div>
        <div class="tareas-stat-label">Se arrastran</div>
      </div>
      <div class="tareas-stat">
        <div class="tareas-stat-number red">${stagnant.length}</div>
        <div class="tareas-stat-label">Estancadas</div>
      </div>
    </div>
    ${toCarry.length > 0 ? `
    <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:var(--text-mid);margin-bottom:8px">\ud83d\udd04 Tareas que se arrastran</div>
      ${toCarry.map(t => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
        <span>${esc(t.title)}</span>
        <span class="traffic-badge ${t.traffic_level}" style="flex-shrink:0">${trafficLabel(t.traffic_level)}</span>
      </div>`).join('')}
    </div>` : '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">\u2705 No hay tareas para arrastrar.</p>'}
    ${toCarry.length > 0 ? `<button class="btn btn-primary btn-full" onclick="processPendingTasks()">\ud83d\udd04 Actualizar tareas pendientes</button>` : ''}
  `;

  document.getElementById('modalDayClose').classList.add('open');
}

export async function processPendingTasks() {
  try {
    const result = await sbFetch('/rpc/process_pending_tasks_for_user', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: state.currentUser.id })
    });
    toast(`${result} tarea(s) actualizada(s)`, 'success');
    closeModal('modalDayClose');
    await loadTareas();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ===== VISTA SELECTOR =====
export function toggleVistaDropdown() {
  document.getElementById('vistaDropdown').classList.toggle('open');
}

export function setTaskView(view) {
  currentView = view;
  document.getElementById('vistaDropdown').classList.remove('open');
  document.querySelectorAll('.vista-option').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderTareas();
}

document.addEventListener('click', e => {
  const sel = document.querySelector('.vista-selector');
  const dd = document.getElementById('vistaDropdown');
  if (dd && sel && !sel.contains(e.target)) dd.classList.remove('open');
});

// ===== BOTTOM NAV =====
export function showTareasTab(tab) {
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.bottom-nav-item[data-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  switch (tab) {
    case 'hoy':
      currentFilter = 'todas';
      document.querySelectorAll('.tareas-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'todas'));
      loadTareas();
      break;
    case 'nueva':
      openNewTaskModal();
      break;
    case 'cierre':
      openDayClose();
      break;
    case 'perfil':
      window.openProfile();
      break;
  }
}
