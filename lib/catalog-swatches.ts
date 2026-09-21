const tones: Array<[RegExp,string]> = [
  [/burgundy|wine/i,'#641F31'],[/charcoal|carbon/i,'#414246'],[/black|noir/i,'#171719'],
  [/bone|ivory|cream/i,'#E1DACB'],[/olive|camo/i,'#52583B'],[/navy/i,'#202C45'],
  [/indigo|blue/i,'#405C7A'],[/silver|platinum|steel|grey|gray/i,'#A2A5A8'],
  [/gold|champagne/i,'#C5AC76'],[/taupe|tan|brown/i,'#86735F'],[/white/i,'#F7F5EF'],
];
export function swatchBackground(name:string,fallback:string) {
  const colors=name.split('/').map(part=>tones.find(([pattern])=>pattern.test(part))?.[1]??fallback);
  return colors.length>1?`linear-gradient(135deg, ${colors.map((color,index)=>`${color} ${index*100/colors.length}% ${(index+1)*100/colors.length}%`).join(', ')})`:colors[0];
}
