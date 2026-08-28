/**
 * Modal de detalhes acessível: foco preso, fecha com Esc/backdrop,
 * conteúdo de fundo com `inert` e enriquecimento assíncrono via TMDB.
 */
import { buildBadge } from './utils.js';

const NEUTRAL_SYNOPSIS = 'Sinopse não disponível para este título.';

export function createModal(root, { loadDetails } = {}) {
  const titleEl = root.querySelector('[data-modal="title"]');
  const metaEl = root.querySelector('[data-modal="meta"]');
  const taglineEl = root.querySelector('[data-modal="tagline"]');
  const chipsEl = root.querySelector('[data-modal="chips"]');
  const runtimeEl = root.querySelector('[data-modal="runtime"]');
  const descEl = root.querySelector('[data-modal="desc"]');
  const backdropEl = root.querySelector('[data-modal="backdrop"]');
  const closeBtn = root.querySelector('[data-modal="close"]');

  let lastFocused = null;
  let requestId = 0;

  /** Remove a interatividade do fundo enquanto o modal está aberto. */
  function setBackgroundInert(state) {
    [document.querySelector('main'), document.querySelector('.site-header')]
      .forEach((el) => el?.toggleAttribute('inert', state));
  }

  function renderBasic(item) {
    titleEl.textContent = item.title;
    const metaParts = [
      buildBadge(item.type === 'tv' ? 'Série' : 'Filme'),
      item.date ? buildBadge(String(item.date).slice(0, 4), 'meta-year') : null,
      item.vote ? buildBadge(`★ ${item.vote}`, 'meta-rating') : null,
    ].filter(Boolean);
    metaEl.replaceChildren(...metaParts);

    taglineEl.hidden = true;
    runtimeEl.textContent = '';
    chipsEl.replaceChildren();

    descEl.textContent = item.overview || NEUTRAL_SYNOPSIS;

    if (item.backdrop) {
      backdropEl.style.backgroundImage = `url("${item.backdrop}")`;
      backdropEl.hidden = false;
    } else {
      backdropEl.hidden = true;
    }
  }

  async function enrich(item) {
    if (!loadDetails) return;
    const id = ++requestId;
    try {
      const details = await loadDetails(item);
      if (id !== requestId || root.hidden) return;

      if (details.tagline) {
        taglineEl.textContent = details.tagline;
        taglineEl.hidden = false;
      }

      const chips = details.genres.map((name) => buildBadge(name, 'chip'));
      chipsEl.replaceChildren(...chips);

      const duration = details.runtime
        ? `${details.runtime} min`
        : details.seasons
          ? `${details.seasons} temporada${details.seasons > 1 ? 's' : ''}`
          : '';
      runtimeEl.textContent = duration;
    } catch {
      /* detalhes extras são opcionais */
    }
  }

  function open(item) {
    lastFocused = document.activeElement;
    renderBasic(item);
    root.hidden = false;
    document.body.classList.add('modal-open');
    setBackgroundInert(true);
    document.addEventListener('keydown', onKeydown);
    closeBtn.focus();
    enrich(item);
  }

  function close() {
    requestId++;
    root.hidden = true;
    document.body.classList.remove('modal-open');
    setBackgroundInert(false);
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = root.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  return { open, close };
}
