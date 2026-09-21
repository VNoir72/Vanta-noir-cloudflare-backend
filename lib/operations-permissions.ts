export type StaffRole = 'owner'|'catalogue'|'fulfilment'|'support'|'analyst';
export const roleResources: Record<StaffRole,string[]> = {owner:['orders','bulk','inventory','returns','promotions','reports','courier','staff','activity'],catalogue:['bulk','inventory'],fulfilment:['orders','courier'],support:['orders','returns'],analyst:['reports']};
