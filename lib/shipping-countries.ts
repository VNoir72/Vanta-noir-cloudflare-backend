// Destinations offered by this version. Nothing is enabled until an owner adds a rate.
export const SHIPPING_COUNTRIES = [
  ['NG','Nigeria'],['AU','Australia'],['BE','Belgium'],['CA','Canada'],['CN','China'],['FR','France'],['DE','Germany'],['GH','Ghana'],['IE','Ireland'],['IT','Italy'],['KE','Kenya'],['NL','Netherlands'],['NZ','New Zealand'],['PT','Portugal'],['QA','Qatar'],['SA','Saudi Arabia'],['SG','Singapore'],['ZA','South Africa'],['ES','Spain'],['SE','Sweden'],['CH','Switzerland'],['AE','United Arab Emirates'],['GB','United Kingdom'],['US','United States'],
] as const;
export function shippingCountryName(code:string='NG') { return SHIPPING_COUNTRIES.find(c=>c[0]===code)?.[1] ?? ''; }
export function postalCodeRequired(code:string) { return ['AU','BE','CA','CN','FR','DE','IE','IT','KE','NL','NZ','PT','SA','SG','ZA','ES','SE','CH','GB','US'].includes(code); }
