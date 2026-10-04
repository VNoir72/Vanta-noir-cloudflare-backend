"use client";
import { useState } from "react";

const templates = {
  socks: { name: "Socks", fields: ["Shoe size range and system", "Foot length, laid flat (cm)", "Leg height, heel to cuff (cm)", "Cuff width, relaxed and laid flat (cm)", "Fit / stretch notes"], tip: "Ask for the supported EU/UK shoe-size range and the measuring method. A sock's flat foot length is not the wearer's foot length. Do not assume One size fits everyone." },
  cap: { name: "Caps / hats / beanies", fields: ["Head circumference range (cm)", "Crown height (cm)", "Brim / peak length (cm)", "Adjustment / closure", "Fit / stretch notes"], tip: "Head circumference goes all the way around the head; do not divide it by two. Confirm whether the item is adjustable, fitted or stretch-fit. Leave brim length blank for a beanie." },
  underwear: { name: "Boxers / underwear", fields: ["Size label", "Waist width, relaxed and laid flat (cm)", "Waist width, stretched and laid flat (cm)", "Hip width, laid flat (cm)", "Inseam (cm)", "Outer length (cm)", "Fit / stretch notes"], tip: "Use a separate chart row for each actual size in Size & fit charts → Add bottom chart. These notes are useful for a single-size item or extra fit information; do not combine different sizes into one set of measurements." },
  bag: { name: "Bags / backpacks", fields: ["Height (cm)", "Width (cm)", "Depth (cm)", "Strap length range (cm)", "Capacity (litres, if confirmed)"], tip: "State whether dimensions are external or internal. Capacity must come from the manufacturer; do not infer it from external dimensions." },
  belt: { name: "Belts", fields: ["Size label", "Wearable waist range (cm)", "Belt width (cm)", "Total length (cm)", "Buckle dimensions (cm)"], tip: "A belt's total length is not its wearable waist range. Ask how the manufacturer measures from the buckle to the fastening holes." },
  gloves: { name: "Gloves", fields: ["Size label", "Hand circumference range (cm)", "Hand length range (cm)", "Glove length (cm)", "Fit / stretch notes"], tip: "Separate body measurements (the hand) from the glove's dimensions. Ask which points the manufacturer uses and whether the thumb is excluded from circumference." },
  scarf: { name: "Scarves", fields: ["Length excluding fringe (cm)", "Width (cm)", "Fringe length (cm)"], tip: "Confirm whether the supplied length includes fringe. Describe the fabric composition separately." },
  eyewear: { name: "Sunglasses", fields: ["Lens width (mm)", "Bridge width (mm)", "Temple length (mm)", "Frame width (mm)"], tip: "Eyewear dimensions here use millimetres, not centimetres. Do not add UV-protection or safety claims without supporting manufacturer documentation." },
} as const;
type Template = keyof typeof templates;
function suggestedTemplate(name:string):Template {
  if (/sock/i.test(name)) return "socks";
  if (/boxer|underwear|brief/i.test(name)) return "underwear";
  if (/backpack|bag/i.test(name)) return "bag";
  if (/belt/i.test(name)) return "belt";
  if (/glove/i.test(name)) return "gloves";
  if (/scarf|scarves/i.test(name)) return "scarf";
  if (/sunglass|eyewear/i.test(name)) return "eyewear";
  return "cap";
}
export function ManufacturerTemplate({name,notes,onChange}:{name:string;notes:string;onChange:(notes:string)=>void}) {
  const [selected,setSelected]=useState<Template>(()=>suggestedTemplate(name));
  const template=templates[selected];
  const read=(label:string)=>notes.split("\n").find(line=>line.startsWith(label+": "))?.slice(label.length+2)??"";
  const update=(label:string,value:string)=>{
    const lines=(notes ? notes.split("\n") : []).filter(line=>!line.startsWith(label+": "));
    if(value.trim()) lines.push(`${label}: ${value}`);
    onChange(lines.join("\n"));
  };
  return <details className="vn-product-disclosure" open={/sock|cap|hat|beanie|boxer|underwear|brief|bag|belt|glove|scarf|sunglass/i.test(name)}>
    <summary>Manufacturer measurements · accessories &amp; underwear</summary>
    <p>Blank fields are a template, not confirmed specifications. Enter only the manufacturer's figures and units, then use Save changes on the product. Completed entries appear under Sizing &amp; fit. Nothing here changes stock, prices or publishing status.</p>
    <label>Measurement template<select aria-label="Measurement template" className="vn-option-select" value={selected} onChange={e=>setSelected(e.target.value as Template)}>{Object.entries(templates).map(([key,t])=><option key={key} value={key}>{t.name}</option>)}</select></label>
    <p>{template.tip}</p>
    <div className="vn-admin-fields">{template.fields.map(label=><label key={label}>{label}<input aria-label={label} value={read(label)} maxLength={120} placeholder="Awaiting manufacturer confirmation" onChange={e=>update(label,e.target.value)}/></label>)}</div>
    <p>Use the same confirmed size labels in Colours, designs &amp; stock. Leave Size pending in place until your manufacturer confirms the size or size range. For multiple sizes, label each line clearly in the notes below.</p>
    <label>Saved sizing &amp; fit notes<textarea aria-label="Saved sizing & fit notes" rows={6} maxLength={1500} value={notes} onChange={e=>onChange(e.target.value)} placeholder="Completed template entries appear here. You can add size-specific notes or the manufacturer's measurement method."/></label>
    {notes.length>1500&&<p role="alert">Keep saved sizing notes within 1,500 characters before saving the product.</p>}
    <p>Switching templates keeps saved notes. Review this text before saving; it is customer-facing. Leave unknown measurements blank and remove an old line only when you intend to replace it.</p>
  </details>;
}
