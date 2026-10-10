import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
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
export async function api<T>(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
  headers: Record<string, string> = {},
): Promise<T> {
  const token = await vault.get("session");
  const response = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "The store could not be reached." }));
  if (!response.ok)
    throw new ApiError(data.error || "Please try again.", response.status);
  return data as T;
}
export const imageUrl = (value: string) =>
  value.startsWith("/api/")
    ? API + value
    : value.startsWith("/")
      ? STORE + value
      : value;
export const money = (kobo: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
