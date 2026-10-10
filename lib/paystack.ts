import { runtimeEnv } from "@/lib/runtime-env";

type PaystackTransaction = {
  customer?: {email?: string};
  authorization?: {authorization_code:string;signature:string;reusable:boolean;channel:string;last4:string;brand:string;exp_month:string;exp_year:string};
  domain?: 'test' | 'live';
  status: string;
  reference: string;
  amount: number;
  requested_amount?: number | string | null;
  fees?: number | null;
  currency: string;
  id?: number;
};

function secretKey() {
  const value = runtimeEnv().PAYSTACK_SECRET_KEY?.trim();
  return value && /^sk_(test|live)_/.test(value) ? value : null;
}

export function paymentMode(): 'live' | 'test' | 'unconfigured' {
  const key=secretKey();return key?.startsWith('sk_live_')?'live':key?'test':'unconfigured';
}

export function isPaystackConfigured() {
  return Boolean(secretKey());
}

async function paystackRequest<T>(path: string, init?: RequestInit) {
  const secret = secretKey();
  if (!secret) throw new Error("PAYSTACK_NOT_CONFIGURED");
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as {
    status: boolean;
    message: string;
    data: T;
  };
  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Paystack request failed.");
  }
  return payload.data;
}

export async function initializePaystackTransaction(args: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  customerName: string;
}) {
  return paystackRequest<{ authorization_url: string; access_code: string; reference: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: args.email,
        amount: args.amountKobo,
        currency: "NGN",
        reference: args.reference,
        callback_url: args.callbackUrl,
        metadata: {
          brand: "Vanta Noir",
          customer_name: args.customerName,
        },
      }),
    },
  );
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

function hexToBytes(hex: string) {
  if (!/^[a-f\d]{128}$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

export async function verifyPaystackWebhook(rawBody: string, signature: string | null) {
  const secret = secretKey();
  const signatureBytes = signature ? hexToBytes(signature) : null;
  if (!secret || !signatureBytes) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(rawBody),
  );
}

export async function createTransferCharge(args:{reference:string;email:string;amountKobo:number}){
 return paystackRequest<{reference:string;status:string;account_number:string;account_name:string;bank:{name:string};account_expires_at:string}>('/charge',{
  method:'POST',body:JSON.stringify({email:args.email,amount:args.amountKobo,currency:'NGN',reference:args.reference,bank_transfer:{account_expires_at:new Date(Date.now()+15*60000).toISOString()}})
 });
}

export async function chargeSavedAuthorization(args:{reference:string;email:string;amountKobo:number;authorizationCode:string}) {
  return paystackRequest<{reference:string;status:string}>('/transaction/charge_authorization', {
    method:'POST', body:JSON.stringify({reference:args.reference,email:args.email,amount:args.amountKobo,currency:'NGN',authorization_code:args.authorizationCode})
  });
}
