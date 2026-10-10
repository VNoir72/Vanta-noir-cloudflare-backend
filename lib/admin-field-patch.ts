// Arrays are one field (e.g. an ordered playlist); plain objects are leaf patches.
export type FieldChange={path:string[];before:unknown;value:unknown};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function changedFields(before:unknown,value:unknown,path:string[]=[]):FieldChange[]{
 if(JSON.stringify(before)===JSON.stringify(value))return [];
 if(object(before)&&object(value))return Object.keys(value).flatMap(key=>changedFields(before[key],value[key],[...path,key]));
 return [{path,before,value}];
}
export function applyFieldChanges<T>(source:T,changes:FieldChange[],checkConflicts=false):T {
 let result=structuredClone(source);
 for(const change of changes){
  if(change.path.some(key=>['__proto__','prototype','constructor'].includes(key)))throw Error('Invalid field path.');
  if(!change.path.length){if(checkConflicts&&JSON.stringify(result)!==JSON.stringify(change.before))throw Error('This field changed. Refresh and try again.');result=structuredClone(change.value) as T;continue;}
  let target=result as Record<string,unknown>;
  for(const key of change.path.slice(0,-1)){if(!object(target[key]))throw Error('Invalid field path.');target=target[key] as Record<string,unknown>;}
  const key=change.path.at(-1)!;
  if(!Object.hasOwn(target,key)&&change.before!==undefined)throw Error('Invalid field path.');
  if(checkConflicts&&JSON.stringify(target[key])!==JSON.stringify(change.before))throw Error('This field changed. Refresh and try again.');
  target[key]=structuredClone(change.value);
 }
 return result;
}
