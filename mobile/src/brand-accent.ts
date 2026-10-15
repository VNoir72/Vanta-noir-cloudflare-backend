/** Choose the higher-contrast ink for a validated owner-selected accent. */
export function accentInk(hex:string){
 const rgb=(hex.match(/[a-f\d]{2}/gi)||['c8','ff','65']).map(v=>{const c=parseInt(v,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
 const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 return (luminance+.05)/.05>=1.05/(luminance+.05)?'#101510':'#ffffff';
}
