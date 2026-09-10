// Thin wrapper around the /api/books REST endpoints exposed by the Express
// server. All calls are same-origin: in dev, Vite proxies /api to :3000
// (see vite.config.js); in production the SPA is served by the same host.

const BASE = '/api/books';

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const detail = body?.details?.join('; ') || body?.error || `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return body;
}

export function listBooks({ genre, author } = {}) {
  const params = new URLSearchParams();
  if (genre) params.set('genre', genre);
  if (author) params.set('author', author);
  const qs = params.toString();
  return request(qs ? `${BASE}?${qs}` : BASE);
}

export function getBook(id) {
  return request(`${BASE}/${id}`);
}

export function createBook(data) {
  return request(BASE, { method: 'POST', body: JSON.stringify(data) });
}

export function updateBook(id, data) {
  return request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteBook(id) {
  return request(`${BASE}/${id}`, { method: 'DELETE' });
}
