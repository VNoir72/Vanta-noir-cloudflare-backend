import { ExpoConfig } from "expo/config";
const studio = process.env.APP_VARIANT === "studio";
const config: ExpoConfig = {
  name: studio ? "Vanta Noir Studio" : "Vanta Noir",
  slug: studio ? "vanta-noir-studio" : "vanta",
  owner: "vanta-noir",
  version: "0.1.0",
  scheme: studio ? "vantanoir-studio" : "vantanoir",
  orientation: "default",
  userInterfaceStyle: studio ? "automatic" : "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: studio
      ? "store.vantanoir.studio"
      : "store.vantanoir.shop",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: studio ? "store.vantanoir.studio" : "store.vantanoir.shop",
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_CONTACTS",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ],
  },
  plugins: ["expo-router", "expo-secure-store", "expo-web-browser"],
  extra: {
    variant: studio ? "studio" : "customer",
    ...(!studio ? { eas: { projectId: "fa2d496b-dfe1-490c-9c6c-c1d961442dd6" } } : {}),
  },
};
export default config;
