// Kept in localStorage so returning from Paystack, refreshes and other tabs can
// resume the same attempt. Only a digest and random capability are stored.
export async function checkoutAttempt(payload:unknown):Promise<string>{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const key='vn-checkout-attempt:'+hash;
 const get=()=>{const old=localStorage.getItem(key);if(old&&/^[-a-f0-9]{73}$/.test(old))return old;const token=crypto.randomUUID()+'-'+crypto.randomUUID();localStorage.setItem(key,token);return token;};
 try{return navigator.locks?await navigator.locks.request(key,get):get();}catch{throw new Error('Allow browser storage before starting payment so your checkout can be safely resumed.');}
}
