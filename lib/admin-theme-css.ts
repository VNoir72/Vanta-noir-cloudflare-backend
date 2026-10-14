// Shared verbatim by the dashboard and standalone shipping pages.
export const adminThemeCSS = String.raw`/* The only admin palettes. All admin components consume these semantic values. */
html[data-vn-admin-theme] {
 --admin-ground:#f5f7f7; --admin-surface:#fff; --admin-soft:#eef1ef;
 --admin-text:#171a1c; --admin-muted:#626c65; --admin-border:#dce3de;
 --admin-glass:rgba(255,255,255,.85); --admin-panel:rgba(255,255,255,.76);
 --admin-edge:rgba(255,255,255,.92); --admin-shadow:rgba(31,45,36,.1);
 --admin-accent:#c8ff65; --admin-on-accent:#1b2818;
 --admin-danger:#a12e22; --admin-danger-bg:#fff0ed;
 --admin-success:#35632c; --admin-success-bg:#e8f3dd;
 --admin-warning:#78561c; --admin-warning-bg:#fff4da;
 --admin-info:#316694; --admin-info-bg:#e8f0f7;
 --admin-scheme:light;
 --admin-backdrop:url('/images/vanta-pearl-leaf-glass.webp');
 --admin-ground-image:radial-gradient(ellipse at 85% 15%,#e2ebe4 0%,transparent 55%);
}
html[data-vn-admin-theme=dark] {
 --admin-ground:#343f39; --admin-surface:#46564c; --admin-soft:#3d4d43;
 --admin-text:#f2f3ea; --admin-muted:#c1cec1; --admin-border:#718276;
 --admin-glass:rgba(78,96,83,.89); --admin-panel:rgba(83,103,89,.80);
 --admin-edge:rgba(215,230,208,.24); --admin-shadow:rgba(14,27,18,.25);
 --admin-accent:#c8ff65; --admin-on-accent:#1b2818;
 --admin-danger:#ffb7ad; --admin-danger-bg:#65443e;
 --admin-success:#c7e9b2; --admin-success-bg:#465e42;
 --admin-warning:#efdaa2; --admin-warning-bg:#625c3f;
 --admin-info:#c3dbef; --admin-info-bg:#435867;
 --admin-scheme:dark;
 --admin-backdrop:url('/images/admin-leaves.svg');
 --admin-ground-image:radial-gradient(ellipse at 90% 5%,#5a715d80 0%,transparent 55%);
}
html[data-vn-admin-theme],html[data-vn-admin-theme] body,html[data-vn-admin-theme] :is(.vn-control-center,.vn-staff-portal,.vn-access-page,.vn-welcome-screen) {
 color-scheme:var(--admin-scheme); color:var(--admin-text);
 --background:var(--admin-ground); --foreground:var(--admin-text);
 --card:var(--admin-panel); --card-foreground:var(--admin-text);
 --popover:var(--admin-glass); --popover-foreground:var(--admin-text);
 --muted:var(--admin-soft); --muted-foreground:var(--admin-muted);
 --border:var(--admin-border); --input:var(--admin-border); --ring:var(--admin-muted);
 --primary:var(--admin-accent); --primary-foreground:var(--admin-on-accent);
 --secondary:var(--admin-soft); --secondary-foreground:var(--admin-text);
 --accent:var(--admin-soft); --accent-foreground:var(--admin-text);
 --destructive:var(--admin-danger); --vn-lime:var(--admin-accent); --vn-muted:var(--admin-muted);
 --vn-brand-pearl:var(--admin-ground); --vn-brand-ink:var(--admin-text);
 --vn-brand-muted:var(--admin-muted); --vn-brand-line:var(--admin-border);
 --vn-glass-ground:var(--admin-ground-image); --vn-glass-surface:var(--admin-glass);
 --vn-glass-panel:var(--admin-panel); --vn-glass-edge:var(--admin-edge);
 --vn-glass-shadow:inset 0 1px 0 var(--admin-edge),0 10px 32px var(--admin-shadow); --vn-glass-filter:blur(12px) saturate(115%);
}
html[data-vn-admin-theme] body {background:var(--admin-ground-image),var(--admin-ground);margin:0}
html[data-vn-admin-theme] :is(.vn-control-center,.vn-access-page,.vn-welcome-screen) {background:var(--admin-ground-image),var(--admin-ground)}
html[data-vn-admin-theme] :is([role=dialog],[role=alertdialog],[role=menu],[role=listbox],[data-slot=popover-content],[data-slot=select-content],[data-sonner-toast]) {background:var(--admin-glass)!important;color:var(--admin-text)!important;border-color:var(--admin-edge)!important;backdrop-filter:blur(22px);color-scheme:var(--admin-scheme)}
/* Dialogs are portalled outside the workspace: give them their own bounded scrollport.
   Team chat already has a bounded shell, message scroller and fixed composer. */
html[data-vn-admin-theme] :is([data-slot=dialog-content]:not(.vn-team-chat),[data-slot=alert-dialog-content]) {
 max-height:calc(100vh - 32px);
 max-height:calc(100dvh - 32px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
 min-height:0;overflow-y:auto;overscroll-behavior:contain;
 -webkit-overflow-scrolling:touch;scroll-padding-block:16px
}
/* Do not pull the last editor actions below the sheet's scroll boundary. */
html[data-vn-admin-theme] .vn-studio-footer {margin-bottom:0;padding-bottom:max(20px,env(safe-area-inset-bottom))}
html[data-vn-admin-theme] :is(input,textarea,select) {color-scheme:var(--admin-scheme)}
html[data-vn-admin-theme] :is(input,textarea)::placeholder {color:var(--admin-muted);opacity:1}
html[data-vn-admin-theme] option {background:var(--admin-surface);color:var(--admin-text)}
html[data-vn-admin-theme] :focus-visible {outline:2px solid var(--admin-muted);outline-offset:3px}
/* One viewport budget: Appearance takes its natural height; the workspace gets the rest. */
.vn-admin-shell {height:100vh;height:100dvh;display:grid;grid-template-rows:auto minmax(0,1fr);min-width:0;overflow:hidden}
.vn-admin-workspace {min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
/* Outrank the legacy min-h-screen utility in every dashboard section. */
html[data-vn-admin-theme] .vn-admin-workspace>.vn-exact {height:100%;min-height:0}
.vn-admin-workspace>.vn-welcome-screen {min-height:100%}
.vn-appearance-bar {position:relative;z-index:31;display:flex;justify-content:flex-end;padding:8px 20px;background:var(--admin-glass);border-bottom:1px solid var(--admin-edge);color:var(--admin-text)}
.vn-theme-control {display:flex;align-items:center;gap:10px;font:500 12px/1.5 system-ui;color:var(--admin-muted)}
.vn-theme-control select {max-width:230px;padding:7px 10px;border:1px solid var(--admin-border);border-radius:12px;background:var(--admin-surface);color:var(--admin-text);font:inherit}

html[data-vn-admin-theme=dark] img[src$="vanta-spire-light.svg"] {content:url('/images/vanta-spire-on-dark.svg')}
html[data-vn-admin-theme] .recharts-cartesian-axis-tick text {fill:var(--admin-muted)}
html[data-vn-admin-theme] .recharts-cartesian-grid line {stroke:var(--admin-border)}
html[data-vn-admin-theme] .vn-standalone {font:16px/1.5 system-ui;padding:24px}
html[data-vn-admin-theme] .vn-standalone section {background:var(--admin-panel);color:var(--admin-text);border-color:var(--admin-edge);backdrop-filter:blur(22px)}
@media(prefers-reduced-transparency:reduce),(prefers-contrast:more) {html[data-vn-admin-theme] {--admin-glass:var(--admin-surface);--admin-panel:var(--admin-surface);--vn-glass-filter:none}}
@media(max-width:640px) {.vn-appearance-bar{padding:7px 12px}.vn-theme-control{font-size:11px}}
html[data-vn-admin-theme] {--vn-brand-white:var(--admin-surface);--vn-brand-border:var(--admin-border);--vn-brand-lime:var(--admin-accent)}
html[data-vn-admin-theme=dark] :is(.vn-control-center,.vn-welcome-screen) {background-image:url('/images/admin-leaves.svg'),var(--admin-ground-image);background-size:cover;background-attachment:fixed}
html[data-vn-admin-theme] .vn-control-center :is(.vn-glass,.vn-exact-metrics>article) {background:var(--admin-panel);border-color:var(--admin-edge);box-shadow:var(--vn-glass-shadow);backdrop-filter:blur(18px);border-radius:22px}
html[data-vn-admin-theme] :is(.vn-control-center,.vn-mobile-drawer) :is(button[aria-current],button[aria-pressed=true],[data-state=active]) {color:var(--admin-on-accent)}
html[data-vn-admin-theme] [data-slot=button][data-variant=default] {color:var(--admin-on-accent)!important}
html[data-vn-admin-theme] [data-slot=button][data-variant=destructive] {background:var(--admin-danger-bg)!important;color:var(--admin-danger)!important}
html[data-vn-admin-theme] .vn-standalone :is(input,select,textarea) {background:var(--admin-surface);color:var(--admin-text);border-color:var(--admin-border)}
html[data-vn-admin-theme] .vn-standalone :is(button,.button,.pill) {color:var(--admin-on-accent)}
html[data-vn-admin-theme] .vn-standalone .secondary {color:var(--admin-text)}
html[data-vn-admin-theme] .vn-standalone label.vn-theme-control {display:flex;justify-content:flex-end}
@media(prefers-reduced-transparency:reduce),(prefers-contrast:more) {html[data-vn-admin-theme] .vn-control-center :is(.vn-glass,.vn-exact-metrics>article){backdrop-filter:none}}
`;
