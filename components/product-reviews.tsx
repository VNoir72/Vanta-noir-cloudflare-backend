"use client";
import { useEffect, useState, type FormEvent } from "react";
import { apiUrl } from "@/lib/api-client";

type Review = { id: string; displayName: string; rating: number; fit: string; body: string; productName: string; createdAt: string };
export function ProductReviews({ productId }: { productId?: string }) {
  const [reviews, setReviews] = useState<Review[]>([]); const [loadError, setLoadError] = useState(false); const [loading,setLoading]=useState(true);
  const [busy, setBusy] = useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(false);
  const [page,setPage]=useState(1); const [hasMore,setHasMore]=useState(false);
  useEffect(() => { let active=true; setLoading(true); setLoadError(false); fetch(apiUrl(`/api/reviews?${new URLSearchParams({ ...(productId ? {productId} : {}), page: String(page) })}`)).then(async r => { if(!r.ok) throw new Error(); const p=await r.json() as {reviews:Review[];hasMore:boolean}; if(active){setReviews(p.reviews);setHasMore(p.hasMore);} }).catch(()=>{if(active)setLoadError(true);}).finally(()=>{if(active)setLoading(false);}); return()=>{active=false;}; },[productId,page]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true);setMessage("");setError(false);
    try {const r=await fetch(apiUrl("/api/reviews"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...Object.fromEntries(data),productId,rating:Number(data.get("rating"))})});const p=await r.json() as {error?:string};if(!r.ok)throw new Error(p.error||"Your review could not be saved.");setMessage("Thank you. Your verified-order review is awaiting moderation.");form.reset();}catch(e){setError(true);setMessage(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}
  }
  return <section className="vn-reviews" id="reviews"><h2>Customer reviews</h2>
    {loading ? <p role="status">Loading reviews…</p> : loadError ? <p role="alert">Reviews couldn’t load. Please refresh to try again.</p> : reviews.length ? <div className="vn-review-list">{reviews.map(review=><article key={review.id}><div className="flex flex-wrap justify-between gap-3"><strong>{review.displayName}</strong><span aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span></div>{!productId&&<p>{review.productName}</p>}<p className="vn-detail-note">Verified purchase · Fit: {review.fit.replaceAll("_"," ")}</p><p>{review.body}</p></article>)}</div> : <p>No customer reviews yet. Share your experience after your order arrives.</p>}
    {(page>1||hasMore)&&<div className="flex gap-4"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button disabled={!hasMore} onClick={()=>setPage(p=>p+1)}>Next</button></div>}
    {productId ? <details className="vn-product-disclosure"><summary>Write a review</summary><p>Use the reference and email for your delivered order. Your email and order reference stay private.</p><form className="vn-commerce-form" onSubmit={submit}>
      <div className="vn-form-grid"><label>Order reference<input name="reference" required maxLength={120} /></label><label>Order email<input type="email" name="email" required maxLength={200}/></label><label>Display name<input name="displayName" required minLength={2} maxLength={60}/></label><label>Rating<select name="rating" defaultValue="5">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} out of 5</option>)}</select></label></div>
      <label>How did it fit?<select name="fit" defaultValue="true_to_size"><option value="true_to_size">True to size</option><option value="small">Runs small</option><option value="large">Runs large</option></select></label><label>Your review<textarea name="body" required minLength={10} maxLength={2000} rows={4}/></label><button className="vn-pill" disabled={busy}>{busy?"Submitting…":"Submit review"}</button>{message&&<p role={error?"alert":"status"}>{message}</p>}
    </form></details> : <a className="vn-text-link" href="/#collection">Choose a product to review</a>}
  </section>;
}
