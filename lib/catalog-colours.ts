// Normalize presentation only; inventory IDs and image associations stay intact.
export function colourLabel(value:string) {
  return value.trim().replace(/\s+/g,' ').replace(/\s*\/\s*/g,' / ').toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
}

// Broad browse filters; colourway names, photographs and inventory stay exact.
export function colourFamily(value: string) {
  const primary = value.toLowerCase().split('/')[0];
  const families: Array<[RegExp,string]> = [
    [/burgundy|maroon/, 'Burgundy'], [/charcoal|grey|gray|silver|platinum/, 'Grey'],
    [/olive|green|sage|camo/, 'Green'], [/navy|blue|indigo|denim/, 'Blue'],
    [/bone|ivory|cream|white/, 'White & cream'], [/brown|chocolate|camel/, 'Brown'],
    [/sand|beige|taupe/, 'Beige'], [/black|noir|obsidian/, 'Black'],
    [/pink|rose/, 'Pink'], [/purple|lavender|lilac/, 'Purple'],
    [/red/, 'Red'], [/orange|rust/, 'Orange'], [/yellow|gold|champagne/, 'Yellow & gold'],
  ];
  return families.find(([pattern])=>pattern.test(primary))?.[1] ?? colourLabel(value);
}
export function matchesColour(name: string, filter: string) {
  return filter === 'All' || colourLabel(name) === colourLabel(filter) || colourFamily(name) === filter;
}
