/** React Native's AbortSignal does not implement the browser timeout() helper. */
export async function fetchWithTimeout(
  url: string,
  options: Omit<RequestInit, 'signal'> = {},
  timeoutMs = 20000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {...options, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
}
