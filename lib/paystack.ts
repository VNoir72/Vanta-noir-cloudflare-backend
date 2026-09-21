import { runtimeEnv } from "@/lib/runtime-env";

type PaystackTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  id?: number;
};

function secretKey() {
  const value = runtimeEnv().PAYSTACK_SECRET_KEY?.trim();
  return value && /^sk_(test|live)_/.test(value) ? value : null;
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
