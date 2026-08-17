// Diseño por defecto y renderizado HTML del rótulo.
// Módulo base: lo usan tanto el editor de diseño (rotuloDesign.js) como el modal de creación (rotuloCrear.js).
import { state } from './state.js';
import { esc }   from './ui.js';

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

export function renderRotuloPreviewTo(targetId, rd, pData, pContactsData, detalleText, extraText, docInfo = {}) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const { tipoDoc = '', numDoc = '', valorDeclarado = '', bultoN = '', bultoTotal = '' } = docInfo;
  const docLabel     = tipoDoc && numDoc ? `${tipoDoc === 'remito' ? 'Remito' : 'Nota de despacho'} N°: ${numDoc}` : '';
  const valorLabel   = valorDeclarado ? `Valor declarado: ${valorDeclarado}` : '';
  const bultoLabel   = bultoN && bultoTotal ? `Bulto: ${bultoN}/${bultoTotal}` : '';
  const hasEnvioInfo = docLabel || valorLabel || bultoLabel;

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
        ${hasEnvioInfo ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #ddd">
          ${docLabel   ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>${esc(docLabel)}</strong></div>` : ''}
          ${valorLabel ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>${esc(valorLabel)}</strong></div>` : ''}
          ${bultoLabel ? `<div style="font-size:12px;color:${rd.textColor};margin-bottom:4px"><strong>${esc(bultoLabel)}</strong></div>` : ''}
        </div>` : ''}
        ${extraText  ? `<div style="font-size:12px;font-weight:bold;color:${rd.barColor};margin-bottom:4px;margin-top:${hasEnvioInfo ? '8px' : '0'}">⚠ ${esc(extraText)}</div>` : ''}
        ${detalleText ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #ddd"><div style="font-size:10px;text-transform:uppercase;color:#999;font-weight:bold;margin-bottom:3px">Detalle</div><div style="font-size:12px;color:${rd.textColor};white-space:pre-wrap">${esc(detalleText)}</div></div>` : ''}
      </div>
      <div style="background:#f7f9fc;border-top:1px solid #ddd;padding:6px 14px;display:flex;justify-content:space-between;font-size:10px;color:#999">
        <span>${pie ? esc(pie) : esc(empresa)}</span>
        <span>📅 ${fecha}</span>
      </div>
    </div>`;
}
