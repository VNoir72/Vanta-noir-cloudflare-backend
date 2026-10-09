/** One preference and resolver shared by React admin and standalone fulfilment pages. */
export type AdminThemeMode = 'system' | 'schedule' | 'light' | 'dark';
export const ADMIN_THEME_KEY = 'vn-admin-appearance-v1';
export function installAdminTheme() {
  const root = document.documentElement;
  const key = 'vn-admin-appearance-v1';
  const modes = ['system', 'schedule', 'light', 'dark'];
  const read = () => { try { const value = localStorage.getItem(key); return value && modes.includes(value) ? value : 'system'; } catch { return 'system'; } };
  const media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? {matches: false, addEventListener() {}, removeEventListener() {}};
  let mode = read();
  const apply = () => {
    const hour = new Date().getHours();
    const dark = mode === 'dark' || (mode === 'system' && media.matches) || (mode === 'schedule' && (hour >= 19 || hour < 7));
    root.dataset.vnAdminTheme = dark ? 'dark' : 'light';
    root.dataset.vnAdminMode = mode;
    document.querySelectorAll('[data-admin-theme-control]').forEach(control => { if (control instanceof HTMLSelectElement) control.value = mode; });
    window.dispatchEvent(new CustomEvent('vn-admin-theme-change'));
  };
  const change = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches('[data-admin-theme-control]') || !modes.includes(target.value)) return;
    mode = target.value;
    try { localStorage.setItem(key, mode); } catch { /* Still switch for this visit if storage is unavailable. */ }
    apply();
  };
  const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) { mode = read(); apply(); } };
  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('change', change);
  document.addEventListener('visibilitychange', apply);
  window.addEventListener('focus', apply);
  window.addEventListener('storage', storage);
  media.addEventListener('change', apply);
  const timer = window.setInterval(apply, 30_000);
  apply();
  return () => {
    document.removeEventListener('DOMContentLoaded', apply);
    document.removeEventListener('change', change);
    document.removeEventListener('visibilitychange', apply);
    window.removeEventListener('focus', apply);
    window.removeEventListener('storage', storage);
    media.removeEventListener('change', apply);
    window.clearInterval(timer);
    delete root.dataset.vnAdminTheme;
    delete root.dataset.vnAdminMode;
  };
}
// Runs before the page paints; React adopts this same controller instead of a second preference.
export const adminThemeScript = `(()=>{const __name=(fn)=>fn;window.__vnAdminThemeStop?.();window.__vnAdminThemeStop=(${installAdminTheme.toString()})();})();`;
export const adminThemeControlHTML = `<label class="vn-theme-control">Appearance<select aria-label="Admin appearance" data-admin-theme-control><option value="system">Auto · device</option><option value="schedule">Auto · time (7am–7pm light)</option><option value="light">Light</option><option value="dark">Dark</option></select></label>`;
