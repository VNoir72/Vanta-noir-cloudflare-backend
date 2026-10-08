// Stitch identities: Coats, Basic Stitch Types. Settings below are Vanta Noir
// sampling proposals, not measured factory approvals or universal standards.
export const MANUFACTURING_FIELDS = ['stitching','threadSpec','seamAllowances','reinforcement','trims','hardware','labels','artworkLock'];
export function constructionProposal(product, details = {}) {
  const style = `${details.garmentType || ''} ${product.name || ''}`.toLowerCase();
  const material = `${details.fabric || ''}`.toLowerCase();
  const specialist = /bra\b|sock|cap\b|hat\b|bag\b|shoe|knitwear|sweater|cardigan|set\b|suit\b/.test(style);
  const stretch = /legging|brief|boxer|compression/.test(style);
  const fleece = /hoodie|sweatshirt|jogger/.test(style);
  const knit = stretch || fleece || /t.?shirt|\btee\b|tank|jersey/.test(style) || /jersey|fleece/.test(material);
  const woven = !knit && /shirt|trouser|cargo|denim|jean|jacket|coat|short|skirt|dress/.test(style);
  const approved = details.stitching?.trim();
  const plan = specialist || (!knit && !woven) ?
    'Specialist construction: submit an operation-by-operation stitch schedule for this exact style. Specify joining, edge finishing, closures and hems, machine/stitch codes, density and settings; do not apply a T-shirt schedule to this item.' : knit ?
    'Join body/panel and sleeve seams: type 514 four-thread overedge, 6 mm finished seam, target 12 stitches/inch. Hem: type 406 two-needle coverseam, 6 mm needle gauge, target 12 stitches/inch. Secure thread tails inside the seam. Retain the seam positions shown in this product’s own views.' :
    'Join structural seams: type 301 lockstitch, target 10 stitches/inch; finish exposed raw edges with type 504 three-thread overedge. Visible topstitching: type 301, target 8 stitches/inch, 2 mm from the folded edge only where the saved design shows it. Backtack concealed seam ends; no added decorative seam lines.';
  return {
    status: approved ? 'Saved style instructions take priority. Physical sample approval is still required.' : 'PROPOSED SAMPLING SCHEDULE — save a reviewed style-specific specification before launch certification.',
    stitching: approved || plan,
    threadSpec: details.threadSpec || (knit && !specialist ? 'Sampling proposal: colour-matched polyester corespun needle thread Tex 24; soft textured polyester loopers Tex 18. Ballpoint needle Nm 75–80, select after fabric sew-out. Confirm no holes, skipped stitches or seam cracking at wear stretch.' : 'Sampling proposal: colour-matched polyester corespun thread Tex 30, needle Nm 80–90 for medium woven fabric. Factory must select thread/needle for the actual fabric weight and submit a sew-out; heavier denim, coatings and specialist fabrics need a separate schedule.'),
    seamAllowances: details.seamAllowances || (specialist ? 'Pattern maker must specify allowances by seam and piece; specialist item — no automatic allowance applied.' : knit ? `Sampling proposal: 6 mm joining allowance; 20 mm turned hem where shown. Rib/cuff attachment follows the approved pattern. Allowances are pattern additions, not extra finished garment ease.` : 'Sampling proposal: 10 mm joining allowance; 30 mm trouser hem or 20 mm shirt hem where shown. Lined/faced edges follow the approved pattern. Keep seam allowance separate from finished garment measurements.'),
    reinforcement: details.reinforcement || 'Sampling proposal: reinforce existing pocket openings, vent tops and closure ends where present. Submit location, length and stitch-count drawing; match fabric colour and conceal where possible. Do not add visible bartacks or hardware absent from the design.',
    artworkLock: details.artworkLock || `STYLE LOCK: ${product.name || product.id}. Follow this product and colourway’s saved front/back/side/detail references and written features. Preserve anime artwork, asymmetric placements and every decorative Vanta Noir lettering treatment. Do not replace garment artwork with a corporate logo. New brand/care labels use the current approved master only. Submit artwork dimensions in mm, offsets from named seams, colour separations and a strike-off before production.`,
  };
}
export function missingManufacturing(details = {}) {
  return MANUFACTURING_FIELDS.filter(key => typeof details[key] !== 'string' || !details[key].trim());
}
