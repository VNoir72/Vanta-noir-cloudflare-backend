import { ExpoConfig } from "expo/config";
const studio = process.env.APP_VARIANT === "studio";
const config: ExpoConfig = {
  name: studio ? "Vanta Noir Studio" : "Vanta Noir",
  slug: studio ? "vanta-noir-studio" : "vanta",
  owner: "vanta-noir",
  version: "0.1.7",
  // Native fingerprints keep incompatible OTA bundles off installed builds.
  ...(!studio ? {
    runtimeVersion: { policy: "fingerprint" as const },
    updates: {
      url: "https://u.expo.dev/fa2d496b-dfe1-490c-9c6c-c1d961442dd6",
      checkAutomatically: "ON_LOAD" as const,
      fallbackToCacheTimeout: 0,
    },
  } : { updates: { enabled: false } }),
  icon: "./assets/app-icon.png",
  scheme: studio ? "vantanoir-studio" : "vantanoir",
  orientation: "default",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: studio
      ? "store.vantanoir.studio"
      : "store.vantanoir.shop",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    allowBackup: false,
    ...(process.env.GOOGLE_SERVICES_JSON?{googleServicesFile:process.env.GOOGLE_SERVICES_JSON}:{}),
    adaptiveIcon: { foregroundImage: "./assets/app-icon.png", backgroundColor: "#0a0a0a" },
    softwareKeyboardLayoutMode: "resize",
    versionCode: 2,
    package: studio ? "store.vantanoir.studio" : "store.vantanoir.shop",
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_CONTACTS",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ],
  },
  plugins: ["expo-notifications","expo-video", ["expo-image-picker", {photosPermission:"Choose a profile photo for Vanta Noir.", cameraPermission:false, microphonePermission:false}], "expo-router", "expo-secure-store", "expo-web-browser", "expo-font"],
  extra: {
    variant: studio ? "studio" : "customer",
    ...(!studio ? { eas: { projectId: "fa2d496b-dfe1-490c-9c6c-c1d961442dd6" } } : {}),
  },
};
export default config;
