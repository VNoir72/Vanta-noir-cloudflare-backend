export type MonitoringChoice={analytics:boolean;diagnostics:boolean};
export async function monitoringChoice():Promise<MonitoringChoice>{return {analytics:false,diagnostics:false};}
export async function saveMonitoring(_next:MonitoringChoice){}
export async function initializeMonitoring(){}
export async function trackScreen(_screen:string){}
export async function trackShopping(_event:import('./commerce-events').ShoppingEvent,_items:Pick<import('./types').CartItem,'productId'|'name'|'priceKobo'|'quantity'>[]){}
export async function trackPaidOrder(_order:import('./types').Order){}
export function reportScreenFailure(){}

export async function trackAuth(_event:'sign_up'|'login',_method:'email'|'google'|'apple'){}
