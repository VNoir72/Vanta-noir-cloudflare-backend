import type { CatalogProduct, CatalogColorway } from './catalog';

// Match complete words (with common plural forms), not substrings such as
// "cap" inside "capsule". Keep source/import collection names out of search.
function words(value: string) {
  return value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]+/g) ?? [];
}
function singular(word: string) {
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}
export function catalogSearchScore(product: CatalogProduct, color: CatalogColorway, query: string) {
  const queryWords = words(query).map(singular);
  if (!queryWords.length) return 1;
  const primary = new Set(words(`${product.name} ${product.category} ${product.details?.garmentType ?? ''} ${color.name}`).map(singular));
  const secondary = new Set(words(`${product.description} ${product.details?.features ?? ''} ${product.details?.fabric ?? ''} ${product.details?.fit ?? ''}`).map(singular));
  if (!queryWords.every(word => primary.has(word) || secondary.has(word))) return 0;
  return queryWords.reduce((score, word) => score + (primary.has(word) ? 10 : 1), 0);
}

export function shopperCollectionLabel(value: string, labels: Array<{source:string;label:string}>=[]) {
  const renamed=labels.find(row=>row.source===value)?.label;
  if(renamed)return renamed;
  return value.replace(/\b(?:Mens|Womens)\b/g, word => word === 'Mens' ? 'Men’s' : 'Women’s')
    .replace(/\bBatch\s*\d+\s*[—–-]?\s*/gi, '')
    .replace(/\s*[—–-]\s*$/, '').replace(/\s+/g, ' ').trim() || 'Collection';
}
