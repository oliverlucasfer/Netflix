/**
 * Proxy serverless para a API do TMDB (Vercel Function).
 * Mantém a API key no servidor: o navegador chama /api/tmdb?path=...&page=1
 * e esta função injeta a chave e repassa a requisição ao TMDB.
 *
 * Requer a env var TMDB_API_KEY configurada no projeto na Vercel.
 */

const API_BASE = 'https://api.themoviedb.org/3';
const LANGUAGE = 'pt-BR';
const REQUEST_TIMEOUT = 8000;

// Apenas os endpoints usados pelo front (evita proxy aberto).
const PATH_PATTERNS = [
  /^trending\/(all|movie|tv)\/week$/,
  /^discover\/movie$/,
  /^movie\/now_playing$/,
  /^(movie|tv)\/top_rated$/,
  /^(movie|tv)\/\d+$/,
];

// Somente estes parâmetros são repassados; language e api_key são do servidor.
const ALLOWED_PARAMS = new Set(['page', 'with_genres', 'sort_by']);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TMDB_API_KEY não configurada no servidor' });
  }

  const path = String(req.query.path || '');
  if (!PATH_PATTERNS.some((pattern) => pattern.test(path))) {
    return res.status(400).json({ error: 'Caminho não permitido' });
  }

  const outgoing = new URLSearchParams({ api_key: apiKey, language: LANGUAGE });
  for (const [key, value] of Object.entries(req.query)) {
    if (ALLOWED_PARAMS.has(key) && typeof value === 'string') {
      outgoing.set(key, value);
    }
  }

  try {
    const upstream = await fetch(`${API_BASE}/${path}?${outgoing}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `TMDB ${upstream.status}` });
    }
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Falha ao contatar o TMDB' });
  }
};
