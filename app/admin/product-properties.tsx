"use client";
import type { ProductDetails } from "@/lib/product-details";
import { ManufacturerTemplate } from "./manufacturer-template";
import { SizeGuideEditor } from "./size-guide-editor";

export function ProductProperties({ value, onChange, productId, sizes, productName = "" }: { productName?: string; sizes?: string[]; productId?: string; value: ProductDetails; onChange: (value: ProductDetails) => void }) {
  const update=<K extends keyof ProductDetails>(key:K,next:ProductDetails[K])=>onChange({...value,[key]:next});
  const prompts: Partial<Record<keyof ProductDetails,string>> = {
    garmentType: "Confirm the item type: crew socks, adjustable cap, boxer briefs…",
    fit: "Manufacturer-confirmed fit: supported size range, adjustment or stretch",
    fabric: "List each fibre and its percentage from the manufacturer; include lining separately",
    fabricWeight: "Confirmed GSM if relevant; do not enter packed shipping weight here",
    features: "Confirmed construction, closure, cushioning, seams or embroidery; one feature per line",
    care: "Copy the approved care label: wash method/temperature, drying, bleaching and ironing",
    contents: "State the confirmed quantity: one cap, one pair of socks, or the exact multipack count",
    modelSizing: "Only if a model is shown: their confirmed height and the size worn",
    dispatchNote: "Confirmed dispatch timing only; separate this from courier delivery time",
  };
  const fields: Array<[keyof ProductDetails,string,boolean?]> = [["collection","Collection / drop"],["garmentType","Garment type"],["fit","Fit description"],["modelSizing","Model height and size worn"],["fabric","Fabric composition",true],["fabricWeight","Fabric weight (for example, confirmed GSM)"],["features","Construction and technical features",true],["care","Care instructions",true],["contents","What is included in the purchase"],["dispatchNote","Product dispatch / preorder timing"],["seoTitle","Search title"],["seoDescription","Search description",true]];
  return <section className="space-y-5"><div><h4 className="text-lg">Fit, materials &amp; product information</h4><p className="mt-2 text-sm leading-6 text-white/55">Add confirmed specifications. Only published specifications appear on the storefront; missing fabric and care details are clearly marked as pending. Use one key feature per line; do not enter unverified performance claims.</p></div>
    {value.suggestedPriceNgn != null && <p className="text-sm">Spreadsheet suggested price: ₦{value.suggestedPriceNgn.toLocaleString("en-NG")}. Review the selling price above before approving it.</p>}
    <div className="vn-admin-fields"><label>Audience<select value={value.audience} onChange={e=>update("audience",e.target.value as ProductDetails["audience"])}><option value="unisex">Unisex</option><option value="men">Men</option><option value="women">Women</option></select></label><label>Availability<select value={value.availability} onChange={e=>update("availability",e.target.value as ProductDetails["availability"])}><option value="in_stock">Ready stock</option><option value="preorder">Preorder</option><option value="preview">Design preview — cannot be ordered</option></select></label>
      <label>Release date (UTC)<input type="date" value={value.releaseDate??''} onChange={e=>update('releaseDate',e.target.value)}/><small>Controls New Arrivals for 30 days after release. Leave blank for older/imported designs. This does not schedule publishing or email.</small></label>
      <label>Price approval<select value={value.priceStatus} onChange={e=>update("priceStatus",e.target.value as ProductDetails["priceStatus"])}><option value="approved">Approved selling price</option><option value="proposed">Proposed — cannot be ordered</option></select></label>
      {fields.map(([key,label,multiline])=><label key={key}>{label}{multiline?<textarea rows={3} maxLength={key==="seoDescription"?200:key==="features"?2000:1500} placeholder={prompts[key] ? "Awaiting manufacturer confirmation" : undefined} value={String(value[key])} onChange={e=>update(key,e.target.value)}/>:<input placeholder={prompts[key] ? "Awaiting manufacturer confirmation" : undefined} value={String(value[key])} maxLength={key==="seoTitle"?100:240} onChange={e=>update(key,e.target.value)}/>}{prompts[key]&&<small>{prompts[key]}</small>}</label>)}
      <label>Packed weight (grams, optional)<input type="number" min={0} max={100000} placeholder="Packed parcel weight from a scale" value={value.shippingWeightGrams||""} onChange={e=>update("shippingWeightGrams",Number(e.target.value))}/></label>
    </div>
    <ManufacturerTemplate key={productId??"new"} name={`${productName} ${value.garmentType}`} notes={value.sizeNotes} onChange={next=>update("sizeNotes",next)}/>
    <SizeGuideEditor sizes={sizes} productId={productId} value={value} onChange={onChange}/>
    {!!value.sizeChart.length && <details className="vn-product-disclosure"><summary>Previous single-table chart</summary><p>Enter measurements in centimetres. Specify whether they are garment widths, circumferences or body measurements in the notes. Customers can switch between cm and inches.</p>
      <div className="vn-admin-fields"><label>Measurement type<select value={value.measurementType} onChange={e=>update("measurementType",e.target.value as "body"|"garment")}><option value="garment">Garment measurements</option><option value="body">Body measurements</option></select></label><label>Size / measuring notes<textarea rows={3} maxLength={1500} value={value.sizeNotes} onChange={e=>update("sizeNotes",e.target.value)}/></label></div>
      <div className="overflow-x-auto mt-4"><table className="vn-data-table"><thead><tr><th>Size</th>{["Chest","Waist","Hip","Inseam","Length"].map(label=><th key={label}>{label} cm</th>)}<th>Remove</th></tr></thead><tbody>{value.sizeChart.map((row,index)=><tr key={index}><td><input className="w-16 border p-2" aria-label={`Size for row ${index+1}`} value={row.size} maxLength={40} onChange={e=>update("sizeChart",value.sizeChart.map((r,i)=>i===index?{...r,size:e.target.value}:r))}/></td>{(["chest","waist","hip","inseam","length"] as const).map(key=><td key={key}><input className="w-20 border p-2" type="number" min="0.1" max="400" step="0.1" aria-label={`${row.size||index+1} ${key} in centimetres`} value={row[key]??""} onChange={e=>update("sizeChart",value.sizeChart.map((r,i)=>i===index?{...r,[key]:e.target.value?Number(e.target.value):null}:r))}/></td>)}<td><button type="button" onClick={()=>update("sizeChart",value.sizeChart.filter((_,i)=>i!==index))} aria-label={`Remove size row ${index+1}`}>Remove</button></td></tr>)}</tbody></table></div><button className="vn-pill mt-4" type="button" disabled={value.sizeChart.length>=30} onClick={()=>update("sizeChart",[...value.sizeChart,{size:""}])}>Add measurement row</button>
    </details>}
  </section>;
}
