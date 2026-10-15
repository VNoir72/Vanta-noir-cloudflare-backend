/** Select readable text using the actual candidate colours, not assumed pure black. */
export function accentInk(hex:string){
 const luminance=(value:string)=>{const rgb=(value.match(/[a-f\d]{2}/gi)||[]).map(v=>{const c=parseInt(v,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
 const background=luminance(/^#[a-f\d]{6}$/i.test(hex)?hex:'#c8ff65');
 const dark=luminance('#101510');
 const darkContrast=(Math.max(background,dark)+.05)/(Math.min(background,dark)+.05);
 const whiteContrast=1.05/(background+.05);
 if(Math.max(darkContrast,whiteContrast)<4.5)return '#000000';
 return darkContrast>=whiteContrast?'#101510':'#ffffff';
}
