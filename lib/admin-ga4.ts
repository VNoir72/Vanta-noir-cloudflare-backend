import {importPKCS8,SignJWT} from 'jose';
import {runtimeEnv} from './runtime-env';
import type {ReportRange} from './admin-reporting';
export type ConversionReport={status:'connected'|'not_configured'|'unavailable';message:string;current:number|null;previous:number|null;sessions:number;previousSessions:number;daily:Record<string,number>;timeZone?:string};
const cache=new Map<string,{until:number;value:ConversionReport}>();
let tokenCache:{email:string;token:string;until:number}|undefined;
export async function conversionReport(range:ReportRange):Promise<ConversionReport>{
 const env=runtimeEnv(),property=env.GA4_PROPERTY_ID?.trim(),credentials=env.GA4_SERVICE_ACCOUNT_JSON;
 const empty={current:null,previous:null,sessions:0,previousSessions:0,daily:{}};
 if(!property||!credentials)return {...empty,status:'not_configured',message:'Connect GA4 reporting in Settings to show measured purchase conversion.'};
 const key=`${property}:${range.from}:${range.to}`,cached=cache.get(key);if(cached&&cached.until>Date.now())return cached.value;
 try{
  if(!/^\d+$/.test(property))throw new Error('Invalid property');
  const account=JSON.parse(credentials) as {client_email:string;private_key:string};
  let token=tokenCache?.email===account.client_email&&tokenCache.until>Date.now()?tokenCache.token:'';
  if(!token){const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/analytics.readonly'}).setProtectedHeader({alg:'RS256'}).setIssuer(account.client_email).setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('5m').sign(await importPKCS8(account.private_key,'RS256'));
   const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error('Authentication failed');const payload=await response.json() as {access_token:string};if(!payload.access_token)throw new Error('Token missing');token=payload.access_token;tokenCache={email:account.client_email,token,until:Date.now()+50*60_000};
  }
  const response=await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({dateRanges:[{startDate:range.previousFrom,endDate:range.to}],dimensions:[{name:'date'}],metrics:[{name:'sessions'},{name:'sessionKeyEventRate:purchase'}],limit:1000}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Report unavailable');
  const payload=await response.json() as {rows?:Array<{dimensionValues:Array<{value:string}>;metricValues:Array<{value:string}>}>;metadata?:{timeZone?:string}};
  let sessions=0,converted=0,previousSessions=0,previousConverted=0;const daily:Record<string,number>={};
  for(const row of payload.rows||[]){const raw=row.dimensionValues[0].value,day=`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`,count=Number(row.metricValues[0].value),rate=Number(row.metricValues[1].value);if(!Number.isFinite(count)||!Number.isFinite(rate))continue;daily[day]=rate*100;if(day>=range.from){sessions+=count;converted+=count*rate;}else{previousSessions+=count;previousConverted+=count*rate;}}
  const value:ConversionReport={status:'connected',message:'Sessions with a purchase, measured by GA4. Consent choices and reporting delays affect coverage.',current:sessions?converted/sessions*100:null,previous:previousSessions?previousConverted/previousSessions*100:null,sessions,previousSessions,daily,timeZone:payload.metadata?.timeZone};
  if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+5*60_000,value});return value;
 }catch{const value:ConversionReport={...empty,status:'unavailable',message:'GA4 report unavailable. Check property access, API enablement and the purchase key event in Settings.'};if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+60_000,value});return value;}
}
