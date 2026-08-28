/**
 * Camada de acesso à API do TMDB.
 * Todas as respostas passam por normalize() para um formato estável.
 */

const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';
const LANGUAGE = 'pt-BR';
const REQUEST_TIMEOUT = 8000;
const KEY_SENTINEL = 'COLE_SUA_CHAVE_AQUI';

export const POSTER_SIZE = 'w342';
export const BACKDROP_SIZE = 'w1280';

/** true quando há uma chave TMDB configurada (e não o placeholder). */
export function hasKey(key) {
  return Boolean(key && key !== KEY_SENTINEL);
}

/** Monta URL de imagem do TMDB a partir do path (ex.: /abc.jpg). */
export function imageUrl(path, size = POSTER_SIZE) {
  if (!path) return '';
  return `${IMG_BASE}${size}${path}`;
}

function normalize(item, type) {
  const kind = type || (item.media_type === 'movie' ? 'movie' : 'tv');
  return {
    id: item.id,
    type: kind,
    title: item.title || item.name || 'Sem título',
    overview: item.overview || '',
    poster: item.poster_path || '',
    backdrop: item.backdrop_path || item.poster_path || '',
    vote: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
    date: item.release_date || item.first_air_date || '',
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

/** Constrói a URL da API de forma segura (sem concatenação manual de query). */
function buildUrl(path, key, params = {}) {
  const url = new URL(`${API_BASE}/${path}`);
  url.search = new URLSearchParams({ api_key: key, language: LANGUAGE, ...params });
  return url;
}

const ENDPOINTS = {
  trending: 'trending/all/week',
  'trending-movie': 'trending/movie/week',
  'trending-tv': 'trending/tv/week',
  documentaries: 'discover/movie',
  'now-playing': 'movie/now_playing',
};

/** Lista de títulos por categoria (kind). Sempre resolve o type fixo. */
export async function getList(key, kind) {
  const path = ENDPOINTS[kind];
  if (!path) throw new Error(`Lista desconhecida: ${kind}`);

  const params = { page: '1' };
  if (kind === 'documentaries') {
    params.with_genres = '99';
    params.sort_by = 'popularity.desc';
  }

  const data = await fetchJson(buildUrl(path, key, params));
  const fixedType = kind === 'trending' ? null : kind === 'trending-tv' ? 'tv' : 'movie';
  return (data.results || []).map((item) => normalize(item, fixedType));
}

/** Top rated: mescla filmes e séries ordenados por nota. */
export async function getTopRated(key) {
  const fetchKind = (kind) => fetchJson(buildUrl(`${kind}/top_rated`, key, { page: '1' }));
  const [movies, shows] = await Promise.all([fetchKind('movie'), fetchKind('tv')]);

  return [
    ...movies.results.map((item) => normalize(item, 'movie')),
    ...shows.results.map((item) => normalize(item, 'tv')),
  ].sort((a, b) => (b.vote ?? 0) - (a.vote ?? 0));
}

/** Detalhes completos de um título (tagline, gêneros, duração/temporadas). */
export async function getDetails(key, id, type) {
  const data = await fetchJson(buildUrl(`${type}/${id}`, key));
  return {
    ...normalize(data, type),
    tagline: data.tagline || '',
    genres: (data.genres || []).map((genre) => genre.name),
    runtime: data.runtime || null,
    seasons: data.number_of_seasons || null,
  };
}
