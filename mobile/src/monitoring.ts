export type MonitoringChoice={analytics:boolean;diagnostics:boolean};
export async function monitoringChoice():Promise<MonitoringChoice>{return {analytics:false,diagnostics:false};}
export async function saveMonitoring(_next:MonitoringChoice){}
export async function initializeMonitoring(){}
export async function trackScreen(_screen:string){}
export function reportScreenFailure(){}
