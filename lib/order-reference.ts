/** 50-bit human-readable order code. The database unique key remains authoritative. */
export function shortOrderReference(hex:string){
 const alphabet='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
 if(!/^[a-f\d]{13,}$/i.test(hex))throw Error('Invalid reference entropy.');
 let value=Math.floor(parseInt(hex.slice(0,13),16)/4),code='';
 for(let i=0;i<10;i++){code=alphabet[value%32]+code;value=Math.floor(value/32);}
 return 'VN-'+code;
}
/** Legacy provider references stay immutable; customers can use this short alias. */
export function customerOrderReference(reference:string){return /^VN-[a-f\d]{32}$/i.test(reference)?shortOrderReference(reference.slice(3)):reference;}
export function legacyOrderPrefixes(reference:string){
 const alphabet='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
 if(!/^VN-[0-9A-HJKMNP-TV-Z]{10}$/.test(reference))return [];
 let value=0;for(const char of reference.slice(3))value=value*32+alphabet.indexOf(char);
 const prefix=(value*4).toString(16).toUpperCase().padStart(13,'0');
 return [0,1,2,3].map(n=>'VN-'+prefix.slice(0,12)+(parseInt(prefix[12],16)+n).toString(16).toUpperCase());
}
