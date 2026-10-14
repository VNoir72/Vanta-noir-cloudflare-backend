/** Compact presentation only. Never use this label as a database/provider key. */
export function compactIdentifier(value:string){
  if(value.length<=16)return value;
  return value.startsWith('VN-')?'VN-…'+value.slice(-8):value.slice(0,5)+'…'+value.slice(-5);
}
/** Short, stable new SKU suggestion; the existing database uniqueness check still applies. */
export function suggestedSku(name:string,color:string,size:string,index:number){
  let hash=2166136261;
  for(const char of `${name.trim().toUpperCase()}|${color.trim().toUpperCase()}|${index}`){hash=Math.imul(hash^char.charCodeAt(0),16777619);}
  const style=name.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean).map(word=>word[0]).join('').slice(0,3)||'VN';
  const code=(hash>>>0).toString(36).toUpperCase().padStart(7,'0').slice(-5);
  const suffix=size.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3)||'OS';
  return `${style}${code}-${suffix}`;
}
