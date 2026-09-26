export function matchesImageSignature(bytes:Uint8Array,type:string) {
  const prefix=(values:number[])=>values.every((n,i)=>bytes[i]===n);
  const ascii=(start:number,length:number)=>String.fromCharCode(...bytes.slice(start,start+length));
  if(type==='image/png')return prefix([137,80,78,71,13,10,26,10]);
  if(type==='image/jpeg')return prefix([255,216,255]);
  if(type==='image/webp')return ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';
  if(type==='image/avif')return ascii(4,4)==='ftyp'&&[8,...Array.from({length:Math.max(0,Math.floor((Math.min(bytes.length,64)-16)/4))},(_,i)=>16+i*4)].some(i=>['avif','avis'].includes(ascii(i,4)));
  return false;
}
