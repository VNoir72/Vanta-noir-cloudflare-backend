export type StaffRole = 'owner'|'sales'|'catalogue'|'fulfilment'|'support'|'analyst';
export const roleResources: Record<StaffRole,string[]> = {owner:['sales','orders','bulk','inventory','returns','promotions','reports','courier','staff','activity'],sales:['sales'],catalogue:['bulk','inventory'],fulfilment:['orders','courier'],support:['orders','returns'],analyst:['reports']};
