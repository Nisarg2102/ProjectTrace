// Accept either a backend origin or its /api URL; never append /api twice.
export function apiUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('VITE_API_URL is required. Set it to your backend URL and rebuild the frontend.');
  }
  const base = value.trim().replace(/\/+$/, '');
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password) {
    throw new Error('VITE_API_URL must be an HTTP(S) backend URL without credentials, query, or fragment');
  }
  return base.endsWith('/api') ? base : `${base}/api`;
}
