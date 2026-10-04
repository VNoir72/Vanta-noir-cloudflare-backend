// Normalize editable/display wording without changing product IDs or URLs.
export function garmentName(name: string) {
  const clean = catalogueWording(name).replace(/^\d{1,3}[ .—-]+/, '')
    .replace(/\s*\((?:extra\s+)?unlabelled illustration\)/gi, '')
    .replace(/\s+/g, ' ').trim();
  const parts = clean.split(/\s+[—–]\s+/);
  const unique = parts.filter((part, index) => index === 0 || part.toLowerCase() !== parts[index - 1].toLowerCase());
  const label = unique.join(' — ');
  return label ? label[0].toUpperCase() + label.slice(1) : label;
}

// Remove import/batch labels from editable catalogue metadata as well as display labels.
// Audience lives in its own field and is never inferred or changed here.
export function collectionName(value:string){
 return value.replace(/^(?:Noir\s*\/\s*)?(?:Femme|Unisex)\s*\d+\s*[—–-]\s*/i,'')
 .replace(/^Noir\s+\d+\s*[—–-]\s*/i,'')
 .replace(/\b(?:Batch|Season)\s*\d+\s*[—–-]?\s*/gi,'')
 .replace(/\b(?:Art Capsule|Street-Art Capsule)\s+\d+/gi,s=>s.replace(/\s+\d+$/,''))
 .replace(/\bFemme\b/gi,'Women’s').replace(/\bMens\b/g,'Men’s').replace(/\bWomens\b/g,'Women’s')
 .replace(/^\s*[—–-]\s*|\s*[—–-]\s*$/g,'').replace(/\s+/g,' ').trim()
 .replace(/^(?:Men’s|Women’s|Unisex)$/,'');
}
export function catalogueWording(value:string){return value.replace(/(?:01\s+)?Stealth Hoodie \+ Baggy Set/gi,'STEALTH SET');}
