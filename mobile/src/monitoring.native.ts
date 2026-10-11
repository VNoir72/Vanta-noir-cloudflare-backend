import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAnalytics,setAnalyticsCollectionEnabled,logScreenView} from '@react-native-firebase/analytics';
import {getCrashlytics,setCrashlyticsCollectionEnabled,recordError,deleteUnsentReports} from '@react-native-firebase/crashlytics';
export type MonitoringChoice={analytics:boolean;diagnostics:boolean};
let choice:MonitoringChoice={analytics:false,diagnostics:false};
export async function monitoringChoice(){try{const v=JSON.parse(await AsyncStorage.getItem('vanta-monitoring')||'{}');return {analytics:v.analytics===true,diagnostics:v.diagnostics===true};}catch{return {analytics:false,diagnostics:false};}}
export async function applyMonitoring(next:MonitoringChoice){choice=next;await setAnalyticsCollectionEnabled(getAnalytics(),next.analytics);await setCrashlyticsCollectionEnabled(getCrashlytics(),next.diagnostics);if(!next.diagnostics)await deleteUnsentReports(getCrashlytics());}
export async function saveMonitoring(next:MonitoringChoice){await AsyncStorage.setItem('vanta-monitoring',JSON.stringify(next));await applyMonitoring(next);}
export async function initializeMonitoring(){try{await applyMonitoring(await monitoringChoice());}catch{/* Monitoring must never block shopping. */}}
export async function trackScreen(screen:string){if(!choice.analytics)return;try{await logScreenView(getAnalytics(),{screen_name:screen,screen_class:'StoreScreen'});}catch{}}
export function reportScreenFailure(){if(!choice.diagnostics)return;try{recordError(getCrashlytics(),new Error('Store screen rendering failed'),'StoreScreenRecovery');}catch{}}
