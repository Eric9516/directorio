// Fotos de comprobante adjuntas a un envío (evidencia del despacho, no forman parte del rótulo impreso).
import { sbFetch, sbStorageUpload, sbStorageDelete, SUPABASE_URL } from './api.js';
import { state }      from './state.js';
import { toast }      from './ui.js';
import { slugifyProv } from './rotuloCrear.js';

const MAX_FOTOS_ROTULO = 5;

function compressImage(file, maxDim = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width  = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

export async function abrirFotosRotulo(grupoId, proveedorId) {
  state.rotuloFotosGrupoId = grupoId;
  state.rotuloFotosProvId  = proveedorId;
  document.getElementById('rotuloFotosInput').value = '';
  document.getElementById('rotuloFotosCamara').value = '';
  document.getElementById('rotuloFotosStatus').textContent = '';
  document.getElementById('modalRotuloFotos').classList.add('open');
  await loadRotuloFotos(grupoId);
}

async function loadRotuloFotos(grupoId) {
  const grid = document.getElementById('rotuloFotosGrid');
  grid.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Cargando...</div>';
  try {
    const rows = await sbFetch(`/rotulos_fotos?grupo_id=eq.${grupoId}&select=*&order=created_at.asc`);
    if (!rows.length) {
      grid.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Todavía no hay fotos para este rótulo.</div>';
    } else {
      grid.innerHTML = rows.map(f => {
        const url = `${SUPABASE_URL}/storage/v1/object/public/rotulos/${f.storage_path}`;
        return `<div style="position:relative;width:90px;height:90px">
          <a href="${url}" target="_blank" rel="noopener">
            <img src="${url}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1.5px solid var(--border)">
          </a>
          <button type="button" onclick="deleteRotuloFoto('${f.id}','${f.storage_path}')" title="Eliminar foto" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:var(--danger);color:white;border:none;cursor:pointer;font-size:12px;line-height:1">✕</button>
        </div>`;
      }).join('');
    }
    const status  = document.getElementById('rotuloFotosStatus');
    const lleno   = rows.length >= MAX_FOTOS_ROTULO;
    status.textContent = lleno ? `Llegaste al máximo de ${MAX_FOTOS_ROTULO} fotos.` : `${rows.length}/${MAX_FOTOS_ROTULO} fotos`;
    document.getElementById('rotuloFotosInput').disabled          = lleno;
    document.getElementById('rotuloFotosCamara').disabled         = lleno;
    document.getElementById('rotuloFotosTrigger').disabled        = lleno;
    document.getElementById('rotuloFotosTriggerGaleria').disabled = lleno;
  } catch {
    grid.innerHTML = '<div style="font-size:12px;color:var(--danger)">Error al cargar las fotos.</div>';
    document.getElementById('rotuloFotosInput').disabled          = false;
    document.getElementById('rotuloFotosCamara').disabled         = false;
    document.getElementById('rotuloFotosTrigger').disabled        = false;
    document.getElementById('rotuloFotosTriggerGaleria').disabled = false;
  }
}

export async function handleRotuloFotosUpload(event) {
  const files    = Array.from(event.target.files || []);
  const grupoId  = state.rotuloFotosGrupoId;
  const provId   = state.rotuloFotosProvId;
  if (!files.length || !grupoId) return;

  const status = document.getElementById('rotuloFotosStatus');
  const existentes = await sbFetch(`/rotulos_fotos?grupo_id=eq.${grupoId}&select=id`);
  const disponibles = MAX_FOTOS_ROTULO - existentes.length;
  if (disponibles <= 0) {
    status.textContent = `Ya llegaste al máximo de ${MAX_FOTOS_ROTULO} fotos.`;
    event.target.value = '';
    return;
  }

  const prov = state.proveedores.find(p => p.id === provId);
  const aSubir = files.slice(0, disponibles);

  for (let i = 0; i < aSubir.length; i++) {
    status.textContent = `Subiendo foto ${i + 1}/${aSubir.length}...`;
    try {
      const blob = await compressImage(aSubir[i]);
      const path = `${slugifyProv(prov?.nombre, provId)}/fotos/${Date.now()}_${i}.jpg`;
      await sbStorageUpload(path, blob, 'image/jpeg');
      await sbFetch('/rotulos_fotos', {
        method: 'POST',
        body: JSON.stringify({
          grupo_id:     grupoId,
          proveedor_id: provId,
          storage_path: path,
          creado_por:   state.currentUser?.id || null,
        }),
      });
    } catch (e) {
      toast('Error al subir una foto: ' + e.message, 'error');
    }
  }

  event.target.value = '';
  await loadRotuloFotos(grupoId);
}

export async function deleteRotuloFoto(id, storagePath) {
  if (!confirm('¿Eliminar esta foto?')) return;
  try {
    await sbFetch(`/rotulos_fotos?id=eq.${id}`, { method: 'DELETE' });
    try { await sbStorageDelete(storagePath); } catch {}
    await loadRotuloFotos(state.rotuloFotosGrupoId);
  } catch {
    toast('Error al eliminar la foto', 'error');
  }
}
