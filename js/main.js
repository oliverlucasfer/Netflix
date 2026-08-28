/**
 * Orquestração da página: fileiras dinâmicas, hero, navegação one-page
 * e integração com os módulos de API, carrossel e modal.
 */
import { getList, getTopRated, getDetails, hasKey, imageUrl, POSTER_SIZE, BACKDROP_SIZE } from './api.js';
import { createCarousel } from './carousel.js';
import { createModal } from './modal.js';
import { buildBadge } from './utils.js';

const HEADER_SCROLLED_AT = 24;
const NAV_ACTIVE_BAND = '-40% 0px -55% 0px';
const NEUTRAL_SYNOPSIS = 'Sinopse não disponível para este título.';

const FALLBACK_TITLES = [
  'The Umbrella Academy', 'Stranger Things', 'Dark', 'Money Heist',
  'The Witcher', 'Lucifer', 'Narcos', 'O Gambito da Rainha',
  'Shadow and Bone', 'Sex Education',
];

function getFallbackItems() {
  const items = [];
  for (let i = 1; i <= 10; i++) {
    items.push({
      id: `local-${i}`,
      type: 'movie',
      title: FALLBACK_TITLES[i - 1],
      overview: '',
      poster: '',
      backdrop: '',
      fallback: `img/mini${i}.jpg`,
    });
  }
  return items;
}

const heroFallback = {
  id: 'local-hero',
  type: 'tv',
  title: 'HOUSE OF CARDS',
  overview:
    'Um político inescrupuloso não mede esforços para conquistar o poder nos EUA neste drama vencedor do Emmy e do Globo de Ouro.',
  date: '2013',
  vote: 8.8,
  backdrop: 'img/capa-house.jpg',
  fallback: 'img/capa-house.jpg',
};

const ROWS = [
  { id: 'em-alta', title: 'Em alta', kind: 'trending', isHeroSource: true },
  { id: 'lancamentos', title: 'Lançamentos', kind: 'now-playing' },
  { id: 'filmes', title: 'Filmes em alta', kind: 'trending-movie' },
  { id: 'series', title: 'Séries em alta', kind: 'trending-tv' },
  { id: 'documentarios', title: 'Documentários', kind: 'documentaries' },
  { id: 'melhores', title: 'Melhor avaliados', kind: 'top-rated' },
];

const ARROW_LEFT =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6z"/></svg>';
const ARROW_RIGHT =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6z"/></svg>';

const dom = {
  header: document.querySelector('.site-header'),
  heroBg: document.getElementById('hero-bg'),
  heroText: document.querySelector('.hero-text'),
  heroTitle: document.getElementById('hero-title'),
  heroDesc: document.getElementById('hero-desc'),
  heroMeta: document.getElementById('hero-meta'),
  heroPlay: document.getElementById('hero-play'),
  heroInfo: document.getElementById('hero-info'),
  rows: document.getElementById('rows'),
  navLinks: Array.from(document.querySelectorAll('.nav-link')),
};

let apiKey = '';
try {
  ({ TMDB_API_KEY: apiKey } = await import('./config.js'));
} catch {
  console.warn('config.js não encontrado — usando imagens locais.');
}

const modal = createModal(document.getElementById('modal'), {
  loadDetails: hasKey(apiKey)
    ? (item) => getDetails(apiKey, item.id, item.type)
    : null,
});

let currentHero = null;

function withImages(item) {
  return {
    ...item,
    poster: imageUrl(item.poster, POSTER_SIZE),
    backdrop: imageUrl(item.backdrop, BACKDROP_SIZE),
  };
}

function animateHeroSwap() {
  dom.heroBg.classList.remove('hero-bg--in');
  dom.heroText.classList.remove('hero-text--in');
  void dom.heroBg.offsetWidth;
  dom.heroBg.classList.add('hero-bg--in');
  dom.heroText.classList.add('hero-text--in');
}

function renderHero(item, { animate = true } = {}) {
  currentHero = item;
  dom.heroTitle.textContent = item.title;
  dom.heroDesc.textContent = item.overview || NEUTRAL_SYNOPSIS;

  const metaParts = [
    buildBadge(item.type === 'tv' ? 'Série' : 'Filme', 'meta-pill'),
    item.date ? buildBadge(String(item.date).slice(0, 4), 'meta-year') : null,
    item.vote ? buildBadge(`★ ${item.vote}`, 'meta-rating') : null,
  ].filter(Boolean);
  dom.heroMeta.replaceChildren(...metaParts);

  const bg = item.backdrop || item.fallback;
  if (bg) {
    dom.heroBg.style.backgroundImage = `url("${bg}")`;
    dom.heroBg.hidden = false;
  } else {
    dom.heroBg.hidden = true;
  }

  if (animate) animateHeroSwap();
}

function buildRowSection({ id, title }) {
  const section = document.createElement('section');
  section.className = 'row';
  section.id = `row-${id}`;
  section.setAttribute('aria-labelledby', `row-title-${id}`);
  section.innerHTML = `
    <h2 class="row-title" id="row-title-${id}">${title}</h2>
    <div class="carousel" aria-roledescription="carrossel">
      <button class="carousel-arrow carousel-arrow--left" aria-label="Ver anteriores">${ARROW_LEFT}</button>
      <ul class="carousel-track" role="list"></ul>
      <button class="carousel-arrow carousel-arrow--right" aria-label="Ver mais">${ARROW_RIGHT}</button>
    </div>`;
  return section;
}

const rows = ROWS.map((cfg) => {
  const section = buildRowSection(cfg);
  dom.rows.appendChild(section);
  return {
    ...cfg,
    section,
    carousel: createCarousel({
      track: section.querySelector('.carousel-track'),
      prev: section.querySelector('.carousel-arrow--left'),
      next: section.querySelector('.carousel-arrow--right'),
      onSelect: (item) => modal.open(item),
    }),
  };
});

async function fetchRow(row) {
  const raw = row.kind === 'top-rated'
    ? await getTopRated(apiKey)
    : await getList(apiKey, row.kind);
  return raw.map(withImages);
}

async function loadAll() {
  rows.forEach((row) => row.carousel.renderSkeletons());

  if (hasKey(apiKey)) {
    const settled = await Promise.allSettled(rows.map((row) => fetchRow(row)));
    let heroDone = false;
    let anySuccess = false;

    settled.forEach((result, i) => {
      const row = rows[i];
      if (result.status === 'fulfilled' && result.value.length) {
        anySuccess = true;
        row.carousel.render(result.value);
        if (row.isHeroSource && !heroDone) {
          renderHero(result.value[0]);
          heroDone = true;
        }
      } else {
        if (result.status === 'rejected') {
          console.warn(`Fileira "${row.title}" falhou, usando fallback.`, result.reason);
        }
        row.carousel.render(getFallbackItems());
      }
    });

    if (anySuccess) {
      if (!heroDone) renderHero(heroFallback);
      return;
    }
    console.warn('Todas as buscas TMDB falharam — usando fallback local.');
  }
  rows.forEach((row) => row.carousel.render(getFallbackItems()));
  renderHero(heroFallback);
}

const onScroll = () => {
  dom.header.classList.toggle('is-scrolled', window.scrollY > HEADER_SCROLLED_AT);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

dom.heroInfo.addEventListener('click', () => {
  if (currentHero) modal.open(currentHero);
});

dom.heroPlay.addEventListener('click', () => {
  dom.rows.querySelector('.row')?.scrollIntoView({ behavior: 'smooth' });
});

// A rolagem em si é nativa (âncoras + scroll-behavior: smooth).
// Aqui apenas mantemos o estado visual do link ativo.
dom.navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    dom.navLinks.forEach((l) => l.classList.remove('is-active'));
    link.classList.add('is-active');
  });
});

const NAV_BY_SECTION = {
  hero: '#hero',
  'row-filmes': '#row-filmes',
  'row-series': '#row-series',
  'row-documentarios': '#row-documentarios',
};

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const hash = NAV_BY_SECTION[entry.target.id];
    if (!hash) return;
    dom.navLinks.forEach((l) => l.classList.toggle('is-active', l.hash === hash));
  });
}, { rootMargin: NAV_ACTIVE_BAND });

Object.keys(NAV_BY_SECTION).forEach((id) => {
  const el = document.getElementById(id);
  if (el) sectionObserver.observe(el);
});

loadAll();
