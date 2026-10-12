'use client';
export function MotionValue({value}:{value:string|number}){return <span className="vn-motion-value" style={{fontVariantNumeric:'tabular-nums'}}><span key={value}>{value}</span></span>}
export function BrandLoading({label}:{label:string}){return <div className="vn-brand-loading" role="status"><img src="/images/vanta-spire-light.svg" alt=""/><p>{label}</p><span/><span/></div>}
