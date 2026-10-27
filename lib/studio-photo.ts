import index from './studio-photo-index.json';
const groups=new Map(Object.entries(index).map(([prefix,names])=>[prefix,new Set(names.split('|'))]));
/** Only files in the verified studio manifest may be rewritten. */
export function studioPhoto(src:string){
 const slash=src.lastIndexOf('/');
 const prefix=src.slice(0,slash),name=src.slice(slash+1);
 return groups.get(prefix)?.has(name)?'/images/catalogue/studio-grey/'+name:src;
}
