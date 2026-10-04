// Keep source names, IDs and URLs intact; clean only the shopper-facing label.
export function garmentName(name: string) {
  const clean = name.replace(/^\d{1,3}[ .—-]+/, '')
    .replace(/\s*\((?:extra\s+)?unlabelled illustration\)/gi, '')
    .replace(/\s+/g, ' ').trim();
  const parts = clean.split(/\s+[—–]\s+/);
  const unique = parts.filter((part, index) => index === 0 || part.toLowerCase() !== parts[index - 1].toLowerCase());
  const label = unique.join(' — ');
  return label ? label[0].toUpperCase() + label.slice(1) : label;
}
