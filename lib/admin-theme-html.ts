import {adminThemeCSS} from './admin-theme-css';
import {adminThemeScript, adminThemeControlHTML} from './admin-theme';
/** Same tokens and controller as /admin, including local-device preference. */
export const adminThemeHead = `<style>${adminThemeCSS}</style><script>${adminThemeScript}</script>`;
export const adminThemeToolbar = adminThemeControlHTML;
