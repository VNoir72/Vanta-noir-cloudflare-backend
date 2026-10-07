/** A request path must never replace the configured storefront authority. */
export function storefrontRedirectUrl(requestUrl: URL, storefrontBase: string): string {
  const destination = new URL(storefrontBase);
  destination.pathname = requestUrl.pathname;
  destination.search = requestUrl.search;
  destination.hash = '';
  return destination.href;
}
