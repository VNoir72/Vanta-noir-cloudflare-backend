// Normalize presentation only; inventory IDs and image associations stay intact.
export function colourLabel(value:string) {
  return value.trim().replace(/\s+/g,' ').replace(/\s*\/\s*/g,' / ').toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
}
