export function garmentName(name:string){
 const clean=name.replace(/^\d{1,3}[ .—-]+/,'').trim();
 const parts=clean.split(/\s+[—–]\s+/);
 return parts.length===2&&parts[0].toLowerCase()===parts[1].toLowerCase()?parts[0]:clean;
}
