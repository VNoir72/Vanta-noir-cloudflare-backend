declare global {
  interface Window {
    VANTA_NOIR_CONFIG?: { apiBaseUrl?: string };
  }
}

export function apiUrl(path: string) {
  if (!path.startsWith("/api/")) throw new Error("Invalid store API path.");
  const base = typeof window !== "undefined" ? window.VANTA_NOIR_CONFIG?.apiBaseUrl : "";
  if (!base) return path;
  const url = new URL(base);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("The store API must use HTTPS.");
  }
  return `${url.origin}${path}`;
}

export type CheckoutSettings = import("./commerce-config").CommerceSettings & {
  shippingFeeKobo: number | null;
  paymentsEnabled: boolean;
  shippingCountry: string;
  checkoutReady: boolean;
  shippingZones?: import("./commerce-config").CommerceSettings["shippingZones"];
  dispatchNote?: string;
  deliveryNote?: string;
  supportEmail?: string;
};
