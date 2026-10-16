// A working catalogue request is stronger evidence than a separate health probe.
let lastSuccess = 0;
const listeners = new Set<() => void>();
export function recordStoreReachable() {
  lastSuccess = Date.now();
  for (const listener of listeners) listener();
}
export function storeReachedSince(time: number) { return lastSuccess > 0 && lastSuccess >= time; }
export function subscribeStoreReachable(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
