'use client';
import {useId} from 'react';
/** Filled, folded ribbons from the approved website reference. Web artwork only. */
export function RibbonBackground({theme=0,moving=true}:{theme?:number;moving?:boolean}){
 const id=useId().replace(/[^a-zA-Z0-9]/g,'');
 return <div className="vn-ribbon-background vn-reference-ribbons" aria-hidden="true" data-moving={moving} data-variant={theme}><svg viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><defs>
 <linearGradient id={id+'silk'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f5f5f2"/><stop offset=".43" stopColor="#fff"/><stop offset=".6" stopColor="#e8ebe5"/><stop offset=".75" stopColor="#fff"/><stop offset="1" stopColor="#eff1ec"/></linearGradient>
 <linearGradient id={id+'ribbon'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="color-mix(in srgb,var(--vn-brand-lime,#c8ff65) 24%,#151a17)"/><stop offset=".2" stopColor="var(--vn-brand-lime,#c8ff65)"/><stop offset=".44" stopColor="color-mix(in srgb,var(--vn-brand-lime,#c8ff65) 18%,white)"/><stop offset=".56" stopColor="#ffffff"/><stop offset=".66" stopColor="var(--vn-brand-lime,#c8ff65)"/><stop offset="1" stopColor="color-mix(in srgb,var(--vn-brand-lime,#c8ff65) 52%,#151a17)"/></linearGradient>
 <linearGradient id={id+'silver'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a5b2a0"/><stop offset=".45" stopColor="#fff"/><stop offset=".65" stopColor="#e8f1df"/><stop offset="1" stopColor="#b5c6a6"/></linearGradient>
 </defs><rect width="1440" height="760" fill={'url(#'+id+'silk)'}/><g className="vn-silk-folds" fill="none" stroke="#fff" opacity=".65"><path d="M-120 60 Q360 750 1520 380" strokeWidth="95"/><path d="M-140 120 Q400 810 1520 430" strokeWidth="12"/><path d="M280 -100 Q760 560 1510 520" strokeWidth="56"/></g><g className="vn-ribbon-strands">
 <path d="M-100 490 C210 840 450 245 750 430 S1190 185 1520 70 L1520 103 C1190 235 1040 700 748 474 S245 854 -100 525 Z" fill={'url(#'+id+'ribbon)'}/>
 <path d="M-100 470 C220 770 510 282 780 412 S1150 205 1500 105 L1500 124 C1180 272 1040 650 779 438 S230 800 -100 482 Z" fill={'url(#'+id+'silver)'}/>
 <path d="M-110 220 C175 780 453 395 752 451 S1130 76 1510 199 L1510 219 C1150 106 1100 594 747 477 S185 825 -110 255 Z" fill={'url(#'+id+'ribbon)'}/>
 <path d="M-80 650 C280 549 423 701 670 501 S1100 105 1490 266 L1490 279 C1085 145 964 323 681 527 S310 599 -80 683 Z" fill={'url(#'+id+'silver)'}/>
 </g></svg></div>;
}
