// Updating filter links must never navigate, reload, or break shopping when a
// browser throttles history changes (notably Safari during continuous input).
export function replaceBrowseUrl(history:Pick<History,'state'|'replaceState'>, current:string, next:string) {
  if(current===next)return;
  try { history.replaceState(history.state,'',next); } catch { /* Filters remain usable without URL persistence. */ }
}
