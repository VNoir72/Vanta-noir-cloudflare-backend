// Updating filter links must never navigate, reload, or break shopping when a
// browser throttles history changes (notably Safari during continuous input).
export function replaceBrowseUrl(history:Pick<History,'state'|'replaceState'>, current:string, next:string) {
  if(current===next)return;
  try { history.replaceState(history.state,'',next); } catch { /* Filters remain usable without URL persistence. */ }
}

export type BrowsePosition = { visibleCount:number; scrollY:number; cardColors:Record<string,string> };
export function readBrowsePosition(state:unknown):BrowsePosition|undefined {
  const value=(state as {vnBrowse?:BrowsePosition}|null)?.vnBrowse;
  if(!value || !Number.isFinite(value.scrollY) || value.scrollY<0 || !Number.isFinite(value.visibleCount))return;
  const cardColors=Object.fromEntries(Object.entries(value.cardColors??{}).filter(([key,color])=>key.length<160&&typeof color==='string'&&color.length<160));
  return {visibleCount:Math.max(36,Math.min(10000,Math.floor(value.visibleCount))),scrollY:value.scrollY,cardColors};
}
export function saveBrowsePosition(history:Pick<History,'state'|'replaceState'>,position:BrowsePosition){
  try{history.replaceState({...history.state,vnBrowse:position},'');}catch{/* Navigation still works with restricted storage. */}
}
