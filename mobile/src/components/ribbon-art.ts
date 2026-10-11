/** Procedural, deterministic artwork shared by web and native: no remote scripts. */
export function ribbonSvg(theme:number,moving=true,prefix="vn"){
 const mode=((theme%3)+3)%3,pearl=mode===0;
 const bg=pearl?'#f4f4f1':'#080b0c',silver=pearl?'#9ca2a3':'#e9eeee';
 const ribbons=Array.from({length:34},(_,i)=>{
  const y=325+i*2.8;
  const orbit=Array.from({length:65},(_,j)=>{const a=j/64*Math.PI*2,rx=290+i*7,ry=38+i*2.8,cx=i%2?610:420,cy=i%2?170:270;return `${j?'L':'M'} ${(cx+Math.cos(a)*rx*.89+Math.sin(a)*ry*.45).toFixed(2)} ${(cy-Math.cos(a)*rx*.45+Math.sin(a)*ry*.89).toFixed(2)}`;}).join(' ')+' Z';
  const d=mode===2?orbit:`M -80 ${y} C 190 ${510-i*5} 300 ${80+i*3} 560 ${190+i*3} S 835 ${260-i*6} 1100 ${-50+i*3}`;
  return `<path id="${prefix}r${i}" d="${d}" fill="none" stroke="${i%9===0?'#c9ff43':silver}" stroke-width="${i%9===0?1.8:.65}" opacity="${mode===2?.13: .23+(i%5)*.1}"/>`;
 }).join('');
 const particles=Array.from({length:mode===2?150:28},(_,i)=>{
  const x=(i*137.51)%1050,y=(i*73.73)%460,r=mode===2?.65+(i%4)*.32:.8;
  return `<circle cx="${moving?0:x}" cy="${moving?0:y}" r="${r}" fill="${i%5===0?'#d5ff63':pearl?'#929a8d':'#fff'}" opacity="${.35+i%5*.12}">${moving?`<animateMotion dur="${10+i%11}s" begin="-${i%19}s" repeatCount="indefinite"><mpath href="#${prefix}r${i%34}"/></animateMotion>`:''}</circle>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1000 460" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><defs><radialGradient id="${prefix}h"><stop stop-color="${pearl?'#fff':'#596442'}" stop-opacity=".45"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient></defs><rect width="1000" height="460" fill="${bg}"/><ellipse cx="680" cy="190" rx="420" ry="270" fill="url(#${prefix}h)"/><g>${ribbons}${moving&&mode!==2?'<animateTransform attributeName="transform" type="translate" values="0 -8;0 9;0 -8" dur="12s" repeatCount="indefinite"/>':''}</g>${particles}</svg>`;
}
