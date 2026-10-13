/** Keep a late native result for the next request without delaying ordinary shopping. */
export function createAppCheckCache(fetchToken: () => Promise<string | null>) {
  let cached: {token: string; until: number} | null = null;
  let pending: Promise<string | null> | null = null;
  return async (waitMs = 2500): Promise<string | null> => {
    if (cached && cached.until > Date.now()) return cached.token;
    if (!pending) {
      const request = Promise.resolve().then(fetchToken).then(token => {
        if (token) cached = {token, until: Date.now() + 180000};
        return token;
      }).catch(() => null);
      pending = request;
      void request.finally(() => { if (pending === request) pending = null; });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([pending, new Promise<null>(resolve => {
        timer = setTimeout(() => resolve(null), waitMs);
      })]);
    } finally { if (timer) clearTimeout(timer); }
  };
}
