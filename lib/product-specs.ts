import { productDetails, type ProductDetails } from './product-details';

export function resolvedProductDetails(product: {name:string;category:string;details?:unknown}): ProductDetails {
  const details=productDetails(product.details);
  const name=product.name.replace(/^\d+\s+/, '');
  const fit=/oversized/i.test(name)?'Oversized silhouette':/wide[- ]leg/i.test(name)?'Wide-leg silhouette':/baggy/i.test(name)?'Baggy silhouette':/relaxed/i.test(name)?'Relaxed silhouette':/straight/i.test(name)?'Straight silhouette':/fitted/i.test(name)?'Fitted silhouette':'';
  const features=details.features.split(/\n/).map(s=>s.trim()).filter(s=>s && s!==details.collection && !/^front,? back and side (design )?views/i.test(s));
  return {...details,garmentType:details.garmentType||name,fit:details.fit||fit,
    features:features.length?features.join('\n'):[name,fit].filter(Boolean).join('\n')};
}

export function shopperDescription(description:string) {
  return description.replace(/\s*Based on [^.]*supplied VD\.pdf reference[^.]*\.\s*/gi,' ').replace(/\s*Front, back and side design views shown\./gi,'').trim();
}
