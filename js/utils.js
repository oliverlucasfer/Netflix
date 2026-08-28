/**
 * Utilidades compartilhadas entre os módulos.
 */

/** Escapa caracteres especiais para uso seguro em templates HTML. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Cria um <span> de badge/pílula com classe e texto. */
export function buildBadge(text, className = 'meta-pill') {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}
