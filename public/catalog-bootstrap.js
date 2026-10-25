/* Start the current catalogue while the application bundle downloads. Never persist inventory. */
(() => {
  if (location.pathname !== '/' && !location.pathname.startsWith('/products/')) return;
  const base = window.VANTA_NOIR_CONFIG?.apiBaseUrl || location.origin;
  const url = new URL('/api/catalog', base).href;
  const startedAt = Date.now();
  const request = fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(8000)})
    .then(async response => {
      if (!response.ok) { await response.body?.cancel(); return null; }
      return new Response(await response.blob(), {status: response.status, headers: response.headers});
    })
    .catch(() => null);
  window.__vnCatalogRequest = {url, startedAt, request};
})();
