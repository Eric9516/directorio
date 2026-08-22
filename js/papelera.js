// Papelera: proveedores y repuestos eliminados quedan acá (baja blanda) hasta que
// alguien con el permiso los restaura o los borra para siempre de la base.
import { sbFetch } from './api.js';
import { state } from './state.js';
import { toast, esc } from './ui.js';
import { isOwner } from './admin.js';

export function puedeVerPapelera() {
  return state.currentUser?.puede_ver_papelera === true || isOwner();
}

export async function loadPapelera() {
  const box = document.getElementById('papeleraList');
  if (!box) return;
  box.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Cargando...</p>';
  try {
    const [proveedores, items] = await Promise.all([
      sbFetch('/proveedores?select=id,nombre,eliminado_por,eliminado_at&eliminado=eq.true&order=eliminado_at.desc'),
      sbFetch('/items?select=id,codigo,descripcion,eliminado_por,eliminado_at&activo=eq.false&order=eliminado_at.desc'),
    ]);

    const idsUsuarios = [...new Set([...proveedores, ...items].map(r => r.eliminado_por).filter(Boolean))];
    let usuarios = {};
    if (idsUsuarios.length) {
      const perfiles = await sbFetch(`/usuarios_perfil?select=id,nombre,apellido,email&id=in.(${idsUsuarios.join(',')})`);
      usuarios = Object.fromEntries(perfiles.map(u => [u.id, u]));
    }

    const filas = [
      ...proveedores.map(p => ({ tipo: 'proveedor', id: p.id, titulo: p.nombre, ...p })),
      ...items.map(it => ({ tipo: 'repuesto', id: it.id, titulo: `${it.codigo} — ${it.descripcion}`, ...it })),
    ].sort((a, b) => new Date(b.eliminado_at || 0) - new Date(a.eliminado_at || 0));

    if (!filas.length) {
      box.innerHTML = '<div class="empty-state"><div class="empty-icon">🗑️</div><h3>La papelera está vacía</h3><p>Lo que se elimine de Proveedores o Repuestos va a aparecer acá.</p></div>';
      return;
    }

    box.innerHTML = filas.map(f => {
      const u = usuarios[f.eliminado_por];
      const quien = u ? (`${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email) : 'Desconocido';
      const cuando = f.eliminado_at ? new Date(f.eliminado_at).toLocaleString('es-AR') : '—';
      const tipoLabel = f.tipo === 'proveedor' ? '🏭 Proveedor' : '🔧 Repuesto';
      return `
        <div class="admin-card" style="margin-bottom:10px">
          <div class="admin-card-body" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <span class="badge badge-rubro">${tipoLabel}</span>
              <div style="font-weight:700;margin-top:6px">${esc(f.titulo)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Eliminado por ${esc(quien)} — ${esc(cuando)}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost btn-sm" onclick="restaurarDePapelera('${f.tipo}','${f.id}')">↺ Restaurar</button>
              <button class="btn btn-danger-ghost btn-sm" onclick="purgarDePapelera('${f.tipo}','${f.id}')">Eliminar definitivamente</button>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch {
    box.innerHTML = '<p style="color:var(--danger);font-size:13px">Error al cargar la papelera.</p>';
  }
}

export async function restaurarDePapelera(tipo, id) {
  try {
    if (tipo === 'proveedor') {
      await sbFetch(`/proveedores?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ eliminado: false, eliminado_por: null, eliminado_at: null }),
      });
    } else {
      await sbFetch(`/items?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: true, eliminado_por: null, eliminado_at: null }),
      });
    }
    toast('Restaurado', 'success');
    await loadPapelera();
  } catch (e) {
    toast('Error al restaurar: ' + e.message, 'error');
  }
}

export async function purgarDePapelera(tipo, id) {
  if (!confirm('¿Eliminar esto DEFINITIVAMENTE? No se puede deshacer.')) return;
  try {
    const tabla = tipo === 'proveedor' ? 'proveedores' : 'items';
    await sbFetch(`/${tabla}?id=eq.${id}`, { method: 'DELETE' });
    toast('Eliminado definitivamente', 'success');
    await loadPapelera();
  } catch (e) {
    toast('Error al eliminar: ' + e.message, 'error');
  }
}
