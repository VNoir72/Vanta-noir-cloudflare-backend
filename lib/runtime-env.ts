type RuntimeEnvironment = {
  DB?: D1Database;
  COURIER_WEBHOOK_SECRET?: string;
  BUCKET?: R2Bucket;
  PAYSTACK_SECRET_KEY?: string;
  ADMIN_EMAIL?: string;
  STANDARD_SHIPPING_FEE_KOBO?: string;
  STOREFRONT_URL?: string;
  ALLOWED_ORIGINS?: string;
  AUTH_PROVIDER?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
};

const workersEnv = await import("cloudflare:workers")
  .then(({ env }) => env as unknown as RuntimeEnvironment)
  .catch(() => ({} as RuntimeEnvironment));

export function runtimeEnv(): RuntimeEnvironment {
  return workersEnv;
}

export function getDbBinding(): D1Database {
  const db = runtimeEnv().DB;
  if (!db) {
    throw new Error("Store database is unavailable.");
  }
  return db;
}

export function configuredShippingFeeKobo() {
  const raw = runtimeEnv().STANDARD_SHIPPING_FEE_KOBO;
  if (!raw?.trim()) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 && value <= 10_000_000
    ? value
    : null;
}

export function storefrontOrigin(request: Request) {
  const value = runtimeEnv().STOREFRONT_URL;
  if (!value) return new URL(request.url).origin;
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Invalid storefront configuration.");
  return url.origin;
}

export function isAdminEmail(email: string) {
  const configured = runtimeEnv().ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configured && configured === email.trim().toLowerCase());
}
