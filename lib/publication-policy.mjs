// Publishing displays a design; only the owner launch action releases it for sale.
export function isLaunched(product) {
  return product?.status === 'published' && product.details?.availability !== 'preview' && product.details?.priceStatus === 'approved';
}
export function detailsForSave(existing, status, details) {
  return isLaunched(existing) && status === 'published'
    ? details
    : {...details, availability: 'preview', priceStatus: 'proposed'};
}
export function publicPricing(priceKobo, details) {
  const preview = details.availability === 'preview' || details.priceStatus !== 'approved';
  return preview
    ? {priceKobo: 0, details: {...details, availability: 'preview', priceStatus: 'proposed', suggestedPriceNgn: 0}}
    : {priceKobo, details};
}
