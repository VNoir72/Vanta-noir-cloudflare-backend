export type Product = {
  featured?: boolean;
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  priceKobo: number;
  imageUrl: string;
  images?: { imageUrl: string; imageAlt: string; color: string }[];
  colorways: {
    name: string;
    sourceProductId?: string;
    hex: string;
    imageUrl: string;
    stock: Record<string, number>;
    variantIds?: Record<string, string>;
  }[];
  details?: {
    availability?: string;
    priceStatus?: string;
    audience?: string;
    fabric?: string;
    care?: string;
    fit?: string;
    sizeChart?: Record<string, string | number>[];
  };
};
export type CartItem = {
  variantId: string;
  productId: string;
  name: string;
  color: string;
  size: string;
  imageUrl: string;
  priceKobo: number;
  quantity: number;
};
export type Address = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
};
export type Customer = {
  email: string;
  name: string;
  addresses: Address[];
  favourites: string[];
};
export type Rate = {
  rateId: string;
  provider: "shipbubble" | "terminal_africa";
  carrier: string;
  amountKobo: number;
  delivery: string;
};
export type Quotes = { quoteId: string; expiresAt: number; rates: Rate[] };
export type Reward = {
  subtotalKobo: number;
  discountKobo: number;
  shippingKobo: number | null;
  totalKobo: number | null;
  signature: string;
  shippingSavingsKobo: number;
  gift?: { productName: string } | null;
};
export type SavedCard = {id:string;brand:string;last4:string;expiryMonth:number;expiryYear:number;expired:boolean};
export type Payment = {
  channel?: "saved_card" | "bank_transfer" | "hosted";
  accessCode?: string;
  amountKobo?: number;
  reference: string;
  receiptToken: string;
  complete?: boolean;
  checking?: boolean;
  expired?: boolean;
  transfer?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    expiresAt: string;
    amountKobo: number;
  };
};
export type Order = {
  createdAt?: string;
  canSaveCard?: boolean;
  discountKobo?: number;
  reference: string;
  paymentStatus: string;
  status: string;
  totalKobo: number;
  subtotalKobo?: number;
  shippingKobo?: number;
  paymentFeeKobo?: number;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  deliveryEstimate?: string;
  items?: {
    variantId: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    unitPriceKobo: number;
  }[];
};
export const emptyAddress: Address = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "NG",
};
