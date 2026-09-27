export const NEWSLETTER_DELAY_MS=30_000;
export const NEWSLETTER_DISMISS_MS=7*24*60*60*1000;
export function newsletterPage(pathname:string){return pathname==='/' || pathname.startsWith('/products/');}
export function newsletterDue(now:number,started:number,dismissed:string|null,subscribed:string|null,hasBrowsed:boolean){
  const timestamp=Number(dismissed);
  return subscribed!=='1' && hasBrowsed && now-started>=NEWSLETTER_DELAY_MS && (!dismissed||!Number.isFinite(timestamp)||now-timestamp>=NEWSLETTER_DISMISS_MS);
}
