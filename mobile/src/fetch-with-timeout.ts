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

/** The deadline includes downloading the body, not just receiving headers. */
export async function fetchJsonWithTimeout<T>(
  url: string,
  options: Omit<RequestInit, 'signal'> = {},
  timeoutMs = 20000,
): Promise<{response: Response; data: T}> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('The request timed out. Please try again.'));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, {...options, signal: controller.signal});
        const data = await response.json().catch(error => {
          if (response.ok) throw error;
          return {error: "The store could not be reached."};
        });
        return {response, data: data as T};
      })(),
      deadline,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
