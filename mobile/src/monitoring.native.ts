import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAnalytics,setAnalyticsCollectionEnabled,logScreenView,logEvent} from '@react-native-firebase/analytics';
import {shoppingPayload,purchasePayload,type ShoppingEvent} from './commerce-events';
import type {CartItem,Order} from './types';
import {getCrashlytics,setCrashlyticsCollectionEnabled,recordError,deleteUnsentReports} from '@react-native-firebase/crashlytics';
export type MonitoringChoice={analytics:boolean;diagnostics:boolean};
let choice:MonitoringChoice={analytics:false,diagnostics:false};
export async function monitoringChoice(){try{const v=JSON.parse(await AsyncStorage.getItem('vanta-monitoring')||'{}');return {analytics:v.analytics===true,diagnostics:v.diagnostics===true};}catch{return {analytics:false,diagnostics:false};}}
export async function applyMonitoring(next:MonitoringChoice){choice=next;await setAnalyticsCollectionEnabled(getAnalytics(),next.analytics);await setCrashlyticsCollectionEnabled(getCrashlytics(),next.diagnostics);if(!next.diagnostics)await deleteUnsentReports(getCrashlytics());}
export async function saveMonitoring(next:MonitoringChoice){await AsyncStorage.setItem('vanta-monitoring',JSON.stringify(next));await applyMonitoring(next);}
export async function initializeMonitoring(){try{await applyMonitoring(await monitoringChoice());}catch{/* Monitoring must never block shopping. */}}
export async function trackScreen(screen:string){if(!choice.analytics)return;try{await logScreenView(getAnalytics(),{screen_name:screen,screen_class:'StoreScreen'});}catch{}}
export async function trackShopping(event:ShoppingEvent,items:Pick<CartItem,'productId'|'name'|'priceKobo'|'quantity'>[]){if(!choice.analytics)return;try{const payload=shoppingPayload(items);switch(event){case 'view_item':await logEvent(getAnalytics(),'view_item',payload);break;case 'add_to_cart':await logEvent(getAnalytics(),'add_to_cart',payload);break;case 'begin_checkout':await logEvent(getAnalytics(),'begin_checkout',payload);break;case 'add_payment_info':await logEvent(getAnalytics(),'add_payment_info',payload);break;}}catch{/* Analytics never blocks checkout. */}}
const purchasesInFlight=new Set<string>();
export async function trackPaidOrder(order:Order){
 const payload=purchasePayload(order);if(!choice.analytics||!payload||purchasesInFlight.has(order.reference))return;
 purchasesInFlight.add(order.reference);
 try{const key='vanta-analytics-purchase:'+order.reference;if(await AsyncStorage.getItem(key))return;if(!choice.analytics)return;await logEvent(getAnalytics(),'purchase',payload);await AsyncStorage.setItem(key,'1');}catch{/* A later verified receipt can retry. */}finally{purchasesInFlight.delete(order.reference);}
}
export function reportScreenFailure(){if(!choice.diagnostics)return;try{recordError(getCrashlytics(),new Error('Store screen rendering failed'),'StoreScreenRecovery');}catch{}}
