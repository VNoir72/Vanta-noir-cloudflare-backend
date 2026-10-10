import {getDbBinding, runtimeEnv} from './runtime-env';
import {chargeSavedAuthorization, paymentMode, verifyPaystackTransaction} from './paystack';
import {getOrderByReference} from './store-db';

export function savedCardsEnabled() {
  return runtimeEnv().SAVED_CARDS_ENABLED === 'true' && /^[a-f0-9]{64}$/i.test(runtimeEnv().APP_CARD_ENCRYPTION_KEY || '') && paymentMode() !== 'unconfigured';
}
const encoder = new TextEncoder();
async function encryptionKey() {
  const hex = runtimeEnv().APP_CARD_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(hex)) throw Error('Card storage unavailable.');
  return crypto.subtle.importKey('raw', Uint8Array.from(hex.match(/../g)!, s => parseInt(s, 16)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(value: string, owner: string, id: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:encoder.encode(owner+':'+id)}, await encryptionKey(), encoder.encode(value));
  return JSON.stringify({v:1, iv:Array.from(iv), data:Array.from(new Uint8Array(cipher))});
}
async function decrypt(value: string, owner: string, id: string) {
  const envelope = JSON.parse(value);
  if (envelope.v !== 1) throw Error('Card storage unavailable.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:new Uint8Array(envelope.iv), additionalData:encoder.encode(owner+':'+id)}, await encryptionKey(), new Uint8Array(envelope.data)));
}
type Card = {id:string; brand:string; last4:string; expiryMonth:number; expiryYear:number};
function expired(card: Pick<Card,'expiryMonth'|'expiryYear'>) {
  return Date.UTC(card.expiryYear, card.expiryMonth, 1) <= Date.now();
}
export async function listCustomerCards(owner: string) {
  const enabled=savedCardsEnabled();
  // Keep removal available during a payment outage or key-maintenance window.
  if (!await getDbBinding().prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_customer_cards'").first()) return {enabled:false,cards:[]};
  const rows = await getDbBinding().prepare('SELECT id,brand,last4,expiry_month AS expiryMonth,expiry_year AS expiryYear FROM app_customer_cards WHERE customer_id=? AND mode=? ORDER BY consent_at DESC').bind(owner,paymentMode()).all<Card>();
  return {enabled, cards:rows.results.map(card=>({...card,expired:expired(card)}))};
}
export async function ownedCard(owner:string,id:string) {
  if (!savedCardsEnabled()) return null;
  const card = await getDbBinding().prepare('SELECT id,brand,last4,expiry_month AS expiryMonth,expiry_year AS expiryYear,email,authorization_cipher FROM app_customer_cards WHERE customer_id=? AND id=? AND mode=?').bind(owner,id,paymentMode()).first<Card & {email:string;authorization_cipher:string}>();
  return card && !expired(card) ? card : null;
}
async function eligibleAuthorization(owner:string,email:string,reference:string) {
  if (!savedCardsEnabled()) return null;
  const db = getDbBinding();
  const link = await db.prepare('SELECT reference FROM app_customer_orders WHERE customer_id=? AND reference=?').bind(owner,reference).first();
  if (!link) return null;
  const order = await getOrderByReference(reference);
  if (!order || order.paymentStatus !== 'paid' || order.email.toLowerCase() !== email) return null;
  const transaction = await verifyPaystackTransaction(reference);
  const auth = transaction.authorization;
  if (transaction.status !== 'success' || transaction.reference !== reference || transaction.currency !== 'NGN' || transaction.domain !== paymentMode() || transaction.amount !== order.totalKobo || transaction.customer?.email?.toLowerCase() !== email || !auth || auth.channel !== 'card' || auth.reusable !== true || !/^AUTH_[a-zA-Z0-9]+$/.test(auth.authorization_code) || !auth.signature || auth.signature.length>200 || !/^\d{4}$/.test(auth.last4)) return null;
  const month = Number(auth.exp_month), year = Number(auth.exp_year);
  if (!Number.isInteger(month) || month<1 || month>12 || !Number.isInteger(year) || year<2000 || year>2200 || expired({expiryMonth:month,expiryYear:year})) return null;
  return {...auth,month,year};
}
export async function canSaveCard(owner:string,email:string,reference:string) {
  try {return !!await eligibleAuthorization(owner,email,reference);} catch {return false;}
}
export async function saveCustomerCard(owner:string,email:string,reference:string) {
  const auth = await eligibleAuthorization(owner,email,reference);
  if (!auth) throw Error('This payment has no reusable card.');
  const db = getDbBinding(), mode = paymentMode();
  // Deterministic per-owner identity makes concurrent saves a single row, with
  // the same encryption AAD. No provider token or signature leaves the server.
  const digest = await crypto.subtle.digest('SHA-256',encoder.encode(owner+':'+mode+':'+auth.signature));
  const id = Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const cipher = await encrypt(auth.authorization_code,owner,id);
  await db.prepare(`INSERT INTO app_customer_cards(id,customer_id,signature,mode,authorization_cipher,email,brand,last4,expiry_month,expiry_year,consent_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(customer_id,mode,signature) DO UPDATE SET authorization_cipher=excluded.authorization_cipher,email=excluded.email,brand=excluded.brand,last4=excluded.last4,expiry_month=excluded.expiry_month,expiry_year=excluded.expiry_year,consent_at=excluded.consent_at`).bind(id,owner,auth.signature,mode,cipher,email,(auth.brand || 'Card').trim().slice(0,40),auth.last4,auth.month,auth.year,Date.now()).run();
  return listCustomerCards(owner);
}
export async function removeCustomerCard(owner:string,id:string) {
  // Removal still works if payments have been disabled, including after key rotation.
  const db=getDbBinding();
  if (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_customer_cards'").first()) await db.prepare('DELETE FROM app_customer_cards WHERE customer_id=? AND id=?').bind(owner,id).run();
}
export async function startSavedCardPayment(reference:string,receiptToken:string,owner:string,id:string) {
  const db=getDbBinding(), card=await ownedCard(owner,id);
  const link=await db.prepare('SELECT reference FROM app_customer_orders WHERE customer_id=? AND reference=?').bind(owner,reference).first();
  const order=await getOrderByReference(reference);
  if (!card || !link || !order || card.email!==order.email.toLowerCase()) throw Error('Saved card unavailable.');
  const base={reference,receiptToken,amountKobo:order.totalKobo,channel:'saved_card' as const};
  if (order.paymentStatus==='paid') return {...base,complete:true};
  if (order.status==='cancelled') return {...base,checking:true};
  const token=await decrypt(card.authorization_cipher,owner,id);
  // Shared across ALL payment channels. Ambiguous requests must never retry a charge.
  const key='checkout-payment:'+reference;
  const claim=await db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind(key,JSON.stringify({state:'initializing',channel:'saved_card',at:new Date().toISOString()})).run();
  if (!claim.meta.changes) return {...base,checking:true};
  try {
    await chargeSavedAuthorization({reference,email:card.email,amountKobo:order.totalKobo,authorizationCode:token});
  } catch { /* Verification/webhooks reconcile uncertain or declined requests. */ }
  // Never trust a client callback or charge response to fulfil an order.
  return {...base,checking:true};
}
