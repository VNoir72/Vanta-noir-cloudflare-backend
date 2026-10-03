'use client';
import { useRef, useState } from 'react';
import type { CommerceSettings } from '@/lib/commerce-config';
import { SHIPPING_COUNTRIES } from '@/lib/shipping-countries';
import { CollectionNameEditor } from './collection-name-editor';

type Props={settings:CommerceSettings;onChange:(settings:CommerceSettings)=>void;busy:boolean;onUploadChange?:(value:boolean)=>void};
export function StoreDesignFields({settings,onChange,busy,onUploadChange}:Props) {
  const [uploading,setUploading]=useState(false),[error,setError]=useState('');
  const hero=settings.hero;
  const latestSettings=useRef(settings);latestSettings.current=settings;
  async function upload(file:File|undefined,key:'image'|'mobileImage'|'aboutImage') {
    if(!file)return;setUploading(true);onUploadChange?.(true);setError('');
    try {
      const form=new FormData();form.set('file',file);
      const response=await fetch('/api/admin/uploads',{method:'POST',body:form,signal:AbortSignal.timeout(60000)});
      const result=await response.json() as {url?:string;error?:string};
      if(!response.ok||!result.url)throw new Error(result.error||'Image upload failed.');
      onChange(key==='aboutImage'?{...latestSettings.current,aboutImage:{...latestSettings.current.aboutImage,image:result.url}}:{...latestSettings.current,hero:{...latestSettings.current.hero,[key]:result.url}});
    }catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setUploading(false);onUploadChange?.(false);}
  }
  return <fieldset disabled={busy||uploading} className="vn-product-disclosure"><legend>Store images &amp; collection names</legend>
    <p>Upload campaign artwork, edit the wording and choose its destination. Changes go live after Save settings. Use landscape artwork for desktop; an optional mobile image can use a tighter crop. Images are public: never upload customer documents.</p>
    <div className="vn-admin-fields">{(['image','mobileImage'] as const).map(key=><div key={key}><label>{key==='image'?'Main hero image':'Mobile image (optional)'}<input value={hero[key]} maxLength={500} onChange={e=>onChange({...settings,hero:{...hero,[key]:e.target.value}})}/></label><label>Upload {key==='image'?'main':'mobile'} artwork<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>void upload(e.target.files?.[0],key)}/></label>{hero[key]&&<img src={hero[key]} alt={`${key} preview`} style={{width:'100%',maxHeight:240,objectFit:'contain'}}/>}</div>)}</div>
    {uploading&&<p role="status">Uploading image…</p>}{error&&<p role="alert">{error}</p>}
    <div className="vn-admin-fields"><label>Image description<input maxLength={240} value={hero.alt} onChange={e=>onChange({...settings,hero:{...hero,alt:e.target.value}})}/></label><label>Image focal point<select value={hero.focus} onChange={e=>onChange({...settings,hero:{...hero,focus:e.target.value as typeof hero.focus}})}><option>left</option><option>center</option><option>right</option></select></label>
      {(['kicker','title','body','buttonText','buttonLink'] as const).map(key=><label key={key}>{{kicker:'Small heading',title:'Headline',body:'Description',buttonText:'Button / image link label',buttonLink:'Store link (for example /#collection)'}[key]}<textarea value={hero[key]} maxLength={{kicker:100,title:120,body:300,buttonText:50,buttonLink:500}[key]} onChange={e=>onChange({...settings,hero:{...hero,[key]:e.target.value}})}/></label>)}
    </div><label className="vn-launch-check"><input type="checkbox" checked={hero.showText} onChange={e=>onChange({...settings,hero:{...hero,showText:e.target.checked}})}/>Show text and button over the image (turn off for artwork that already includes text).</label>
    <h3>About / Our Identity photo</h3>
    <p>Replace the photo beside your brand story. This is separate from the homepage hero. Upload an image, then select Save settings.</p>
    <div className="vn-admin-fields"><label>About photo URL<input value={settings.aboutImage.image} maxLength={500} onChange={e=>onChange({...settings,aboutImage:{...settings.aboutImage,image:e.target.value}})}/></label><label>Upload About photo<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>void upload(e.target.files?.[0],'aboutImage')}/></label><label>About photo description<input value={settings.aboutImage.alt} maxLength={240} onChange={e=>onChange({...settings,aboutImage:{...settings.aboutImage,alt:e.target.value}})}/></label><label>About photo focal point<select value={settings.aboutImage.focus} onChange={e=>onChange({...settings,aboutImage:{...settings.aboutImage,focus:e.target.value as typeof settings.aboutImage.focus}})}><option>left</option><option>center</option><option>right</option></select></label></div>
    <img src={settings.aboutImage.image} alt="About photo preview" style={{width:'100%',maxHeight:280,objectFit:'contain'}}/>
    <CollectionNameEditor settings={settings} onChange={onChange} busy={busy||uploading}/>
  </fieldset>;
}
export function InternationalShippingFields({settings,onChange,busy}:Props) {
  return <fieldset disabled={busy} className="vn-product-disclosure"><legend>International shipping — staged rollout</legend>
    <p>Off by default. While off, these countries, rates and customs notes are not published, and international checkout is rejected. Rates are flat fees per order, charged in NGN; confirm courier pricing, package limits and import requirements before enabling.</p>
    <label className="vn-launch-check"><input type="checkbox" checked={settings.internationalEnabled} onChange={e=>onChange({...settings,internationalEnabled:e.target.checked})}/>Show international shipping on the website and allow checkout to the configured countries</label>
    {settings.internationalZones.map((zone,i)=><div className="vn-admin-fields" key={i}><label>Destination<select value={zone.countryCode} onChange={e=>onChange({...settings,internationalZones:settings.internationalZones.map((z,n)=>n===i?{...z,countryCode:e.target.value}:z)})}>{SHIPPING_COUNTRIES.filter(c=>c[0]!=='NG').map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label><label>Flat delivery fee (₦)<input type="number" min={0} max={1000000} step="0.01" value={zone.feeKobo/100} onChange={e=>onChange({...settings,internationalZones:settings.internationalZones.map((z,n)=>n===i?{...z,feeKobo:Math.round(Number(e.target.value)*100)}:z)})}/></label><label>Full estimated delivery window<input maxLength={160} value={zone.estimate} onChange={e=>onChange({...settings,internationalZones:settings.internationalZones.map((z,n)=>n===i?{...z,estimate:e.target.value}:z)})}/></label><button type="button" onClick={()=>onChange({...settings,internationalZones:settings.internationalZones.filter((_,n)=>n!==i)})}>Remove destination</button></div>)}
    <button type="button" className="vn-pill" disabled={settings.internationalZones.length>=23} onClick={()=>{const country=SHIPPING_COUNTRIES.find(c=>c[0]!=='NG'&&!settings.internationalZones.some(z=>z.countryCode===c[0]));if(country)onChange({...settings,internationalZones:[...settings.internationalZones,{countryCode:country[0],feeKobo:0,estimate:''}]});}}>Add destination</button>
    <div className="vn-admin-fields"><label>Customs duties, import taxes and charges<textarea maxLength={600} value={settings.internationalDutiesNote} placeholder="State clearly who pays import charges and whether they are included. Confirm this with your courier." onChange={e=>onChange({...settings,internationalDutiesNote:e.target.value})}/></label></div>
  </fieldset>;
}
