/** ISO country flag, without network calls or platform-specific assets. */
export function countryFlag(code:string):string {
 const normalized=code.trim().toUpperCase();
 return /^[A-Z]{2}$/.test(normalized)?String.fromCodePoint(...[...normalized].map(c=>127397+c.charCodeAt(0))):'🌐';
}
