import {accentInk} from './brand-accent';
import {adminThemeCSS} from './admin-theme-css';
import {adminThemeScript, adminThemeControlHTML} from './admin-theme';
/** Same tokens and controller as /admin, including local-device preference. */
// Standalone fulfilment pages do not mount React's AdminAppearance.
export const standaloneAdminAccentScript = `(()=>{const __name=(fn)=>fn;const ink=(${accentInk.toString()});const apply=color=>{if(typeof color!=="string"||!/^#[a-f0-9]{6}$/i.test(color))return;document.documentElement.style.setProperty("--admin-accent",color);document.documentElement.style.setProperty("--admin-on-accent",ink(color));try{localStorage.setItem("vn-admin-accent",color);}catch{}};try{apply(localStorage.getItem("vn-admin-accent"));}catch{}fetch("/api/store-settings",{cache:"no-store",signal:AbortSignal.timeout(15000)}).then(r=>r.ok?r.json():null).then(s=>apply(s?.brandAccent?.admin)).catch(()=>{});})();`;
export const adminThemeHead = `<style>${adminThemeCSS}</style><script>${adminThemeScript}${standaloneAdminAccentScript}</script>`;
export const adminThemeToolbar = adminThemeControlHTML;
