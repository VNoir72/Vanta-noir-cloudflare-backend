import type { ProductDetails } from "@/lib/product-details";

export function ProductReadiness({status,priceNaira,details,variants}:{status:string;priceNaira:string;details:ProductDetails;variants:Array<{color:string;size:string;stock:string}>}) {
  const checks = [
    {ready:status === "published",label:"Store status: Published",help:"Choose Published in Core details to show this product in the store."},
    {ready:details.availability !== "preview",label:"Availability: Ready stock or Preorder",help:"Choose the actual fulfilment mode in Launch review after saving. Publishing keeps the design in preview until you certify and launch."},
    {ready:Number(priceNaira)>0,label:"Selling price entered for launch review",help:"Enter Price (₦) for your review. It stays private until you click Launch this product in Launch review."},
    {ready:variants.some(v=>Number(v.stock)>0 && v.size !== "Size pending"),label:"Stock entered for a sellable colour and size",help:"In Colours, designs & stock, enter the quantity for each exact colour and size you sell. Replace Size pending with a confirmed size (or One size only if accurate). Stock on another colour does not make this colour available."},
  ];
  return <section className="vn-sale-readiness" aria-label="Product purchase checklist">
    <h4>{checks.every(c=>c.ready)?"Product settings ready to save":"What this product needs before it can sell"}</h4>
    <p>Save your specifications and publish to show a price-free preview. Then open Launch review to check missing details, certify this garment and launch it. Saving a preview never enables sales.</p>
    <ul>{checks.map(c=><li key={c.label} data-ready={c.ready}><strong>{c.ready?"✓":"○"} {c.label}</strong>{!c.ready&&<p>{c.help}</p>}</li>)}</ul>
    <p>Still seeing Sold out? Check the selected colour and size, then refresh the storefront after saving. Pending checkout reservations can temporarily reduce available stock. Store-wide order and payment settings must also be enabled.</p>
  </section>;
}

