/**
 * Carrossel horizontal acessível: scroll-snap, drag com inércia (mouse),
 * paginação animada via rAF e navegação por teclado.
 */
import { escapeHtml } from './utils.js';

const DRAG_THRESHOLD = 6;
const PAGING_DURATION = 550;
const GLIDE_MIN_VELOCITY = 0.25;
const GLIDE_STOP_VELOCITY = 0.02;
const GLIDE_DECAY_PER_FRAME = 0.95;
const STAGGER_STEP_MS = 25;
const STAGGER_MAX_MS = 300;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function createCarousel({ track, prev, next, onSelect }) {
  function buildCard(item, index) {
    const li = document.createElement('li');
    li.className = 'card card--enter';
    li.tabIndex = 0;
    li.style.animationDelay = `${Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS)}ms`;
    li.dataset.id = item.id;
    li.dataset.type = item.type;
    li.setAttribute('role', 'listitem');
    li.setAttribute('aria-label', item.title);

    let media;
    const src = item.poster || item.fallback;
    if (src) {
      const img = document.createElement('img');
      img.className = 'card-img';
      img.draggable = false;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = src;
      media = img;
    } else {
      const ph = document.createElement('div');
      ph.className = 'card-img card-img--placeholder';
      ph.textContent = item.title;
      media = ph;
    }

    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    const metaLine = [
      item.date ? String(item.date).slice(0, 4) : '',
      item.type === 'tv' ? 'Série' : 'Filme',
    ].filter(Boolean).join(' • ');
    overlay.innerHTML = `
      <span class="card-title">${escapeHtml(item.title)}</span>
      ${metaLine ? `<span class="card-meta">${escapeHtml(metaLine)}</span>` : ''}
    `;

    li.append(media, overlay);

    const open = () => onSelect(item);
    li.addEventListener('click', open);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    return li;
  }

  function render(items) {
    cancelAnimations();
    const frag = document.createDocumentFragment();
    items.forEach((item, index) => frag.appendChild(buildCard(item, index)));
    track.replaceChildren(frag);
    updateArrows();
  }

  function renderSkeletons(count = 6) {
    cancelAnimations();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const li = document.createElement('li');
      li.className = 'card card--skeleton';
      li.setAttribute('aria-hidden', 'true');
      frag.appendChild(li);
    }
    track.replaceChildren(frag);
    updateArrows();
  }

  let pagingRaf = null;
  let glideRaf = null;

  function cancelAnimations() {
    if (pagingRaf !== null) {
      cancelAnimationFrame(pagingRaf);
      pagingRaf = null;
    }
    if (glideRaf !== null) {
      cancelAnimationFrame(glideRaf);
      glideRaf = null;
    }
    track.classList.remove('is-paging', 'is-dragging');
  }

  function animateScrollTo(target) {
    cancelAnimations();
    const max = track.scrollWidth - track.clientWidth;
    target = Math.max(0, Math.min(target, max));
    const start = track.scrollLeft;
    const delta = target - start;
    if (!delta) return;

    if (reducedMotion.matches) {
      track.scrollLeft = target;
      return;
    }

    track.classList.add('is-paging');
    const duration = PAGING_DURATION;
    const t0 = performance.now();
    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

    const stepFrame = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      track.scrollLeft = start + delta * easeOutQuint(p);
      if (p < 1) {
        pagingRaf = requestAnimationFrame(stepFrame);
      } else {
        pagingRaf = null;
        track.classList.remove('is-paging');
      }
    };
    pagingRaf = requestAnimationFrame(stepFrame);
  }

  function scrollByCards(dir) {
    const card = track.querySelector('.card');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 10;
    const step = card ? card.offsetWidth + gap : track.clientWidth * 0.8;
    animateScrollTo(track.scrollLeft + dir * step);
  }

  prev.addEventListener('click', () => scrollByCards(-1));
  next.addEventListener('click', () => scrollByCards(1));

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollByCards(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollByCards(-1);
    }
  });

  /** Habilita/desabilita as setas conforme a posição do scroll. */
  function updateArrows() {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max - 1;
  }

  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();

  let dragging = false;
  let suppressClick = false;
  let startX = 0;
  let startScroll = 0;
  let velocity = 0;
  let lastScrollLeft = 0;
  let lastMoveT = 0;

  function onMove(e) {
    const dx = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) <= DRAG_THRESHOLD) return;
      dragging = true;
      track.classList.add('is-dragging');
      lastScrollLeft = track.scrollLeft;
      lastMoveT = performance.now();
      velocity = 0;
    }
    track.scrollLeft = startScroll - dx;

    const now = performance.now();
    const dt = now - lastMoveT;
    if (dt >= 1) {
      const inst = (track.scrollLeft - lastScrollLeft) / dt;
      velocity = velocity * 0.8 + inst * 0.2;
      lastScrollLeft = track.scrollLeft;
      lastMoveT = now;
    }
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    suppressClick = dragging;
    const wasDragging = dragging;
    dragging = false;
    if (!wasDragging) return;

    if (reducedMotion.matches || Math.abs(velocity) < GLIDE_MIN_VELOCITY) {
      track.classList.remove('is-dragging');
      return;
    }
    startGlide(velocity);
  }

  function startGlide(v) {
    let last = performance.now();
    const stepFrame = (now) => {
      const dt = Math.min(now - last, 64);
      last = now;
      const max = track.scrollWidth - track.clientWidth;
      const next = track.scrollLeft + v * dt;
      v *= Math.pow(GLIDE_DECAY_PER_FRAME, dt / 16.7);
      if (Math.abs(v) < GLIDE_STOP_VELOCITY || next <= 0 || next >= max) {
        track.scrollLeft = Math.max(0, Math.min(next, max));
        glideRaf = null;
        track.classList.remove('is-dragging');
        return;
      }
      track.scrollLeft = next;
      glideRaf = requestAnimationFrame(stepFrame);
    };
    glideRaf = requestAnimationFrame(stepFrame);
  }

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    cancelAnimations();
    dragging = false;
    suppressClick = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });

  track.addEventListener('dragstart', (e) => e.preventDefault());

  track.addEventListener('click', (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
    }
  }, true);

  return { render, renderSkeletons };
}
