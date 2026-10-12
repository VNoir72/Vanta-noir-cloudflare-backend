import {requireOptionalNativeModule} from "expo";
import variants from "./image-variants.json";
import {preferenceSnapshot} from "./preferences";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
let wifi=false;
void Network.getNetworkStateAsync().then(n=>{wifi=n.type===Network.NetworkStateType.WIFI;}).catch(()=>{});
Network.addNetworkStateListener(n=>{wifi=n.type===Network.NetworkStateType.WIFI;});
export const API = (
  process.env.EXPO_PUBLIC_API_URL || "https://api.vantanoir.store"
).replace(/\/$/, "");
if (!/^https:\/\//.test(API)) throw new Error("The app API must use HTTPS.");
export const STORE = "https://vantanoir.store";
let webSecrets: Record<string, string> = {};
export const vault = {
  get: (key: string) =>
    Platform.OS === "web"
      ? Promise.resolve(webSecrets[key] || null)
      : SecureStore.getItemAsync(key),
  set: async (key: string, value: string) => {
    if (Platform.OS === "web") webSecrets[key] = value;
    else await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string) => {
    if (Platform.OS === "web") delete webSecrets[key];
    else await SecureStore.deleteItemAsync(key);
  },
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let appCheckCache:{token:string|null;until:number}|null=null;
let appCheckPending:Promise<string|null>|null=null;
async function appCheckToken(){
 if(appCheckCache&&appCheckCache.until>Date.now())return appCheckCache.token;
 if(appCheckPending)return appCheckPending;
 const native=requireOptionalNativeModule<{appCheckToken?:()=>Promise<string>}>('VantaPaystack');
 if(!native?.appCheckToken)return null;
 appCheckPending=(async()=>{let timer:ReturnType<typeof setTimeout>|undefined;let token:string|null=null;try{token=await Promise.race([native.appCheckToken!(),new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),2500);})]);}catch{/* Exclusive access is unavailable; ordinary shopping is unaffected. */}finally{if(timer)clearTimeout(timer);}appCheckCache={token,until:Date.now()+(token?180000:60000)};return token;})();
 try{return await appCheckPending;}finally{appCheckPending=null;}
}
export async function api<T>(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
  headers: Record<string, string> = {},
): Promise<T> {
  const token = await vault.get("session");
  let appCheck:string|null=null;
  if(token&&Platform.OS==='android'&&(/^\/api\/(catalog|checkout|shipping\/quotes|rewards|promotions|customer\/(benefit|circle))/.test(path)))appCheck=await appCheckToken();
  let response:Response;
  try {response = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(appCheck?{"X-Firebase-AppCheck":appCheck}:{}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(preferenceSnapshot().acceleration&&method==="GET"&&["/api/catalog","/health"].includes(path)?8000:20000),
  });
  } catch(error){
    if(preferenceSnapshot().acceleration&&Platform.OS==='android'&&method==='GET'&&['/api/catalog','/health'].includes(path)){
      const network=requireOptionalNativeModule<{fetchPublicOverCellular:(path:string)=>Promise<string>}>('VantaPaystack');
      if(network){try{return JSON.parse(await network.fetchPublicOverCellular(path)) as T;}catch{/* Preserve the initial request error. */}}
    }
    throw error;
  }
  const data = await response
    .json()
    .catch(() => ({ error: "The store could not be reached." }));
  if (!response.ok)
    throw new ApiError(data.error || "Please try again.", response.status);
  return data as T;
}
export const imageUrl = (value:string) => {
  const quality=preferenceSnapshot().imageQuality;
  const target=quality==='high'?1600:quality==='smart'&&wifi?960:480;
  const path=value.startsWith(STORE)?value.slice(STORE.length):value;
  const sizes=(variants as Record<string,{src:string;width:number}[]>)[path];
  const sorted=sizes?.slice().sort((a,b)=>a.width-b.width);
  const selected=sorted?.find(v=>v.width>=target)||sorted?.at(-1);
  const result=selected?.src||value;
  return result.startsWith('/api/')?API+result:result.startsWith('/')?STORE+result:result;
};
export const money = (kobo: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
