import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
// Studio reuses the protected admin UI and Cloudflare Access session. It does
// not embed an admin credential, inject login scripts or weaken backend roles.
const ADMIN = "https://api.vantanoir.store/admin";
export default function Studio() {
  const dark = useColorScheme() === "dark",
    web = useRef<WebView>(null);
  const [error, setError] = useState(false),
    [loading, setLoading] = useState(true);
  const allowed = (raw: string) => {
    try {
      const u = new URL(raw);
      return (
        u.protocol === "https:" &&
        (u.hostname === "api.vantanoir.store" ||
          u.hostname.endsWith(".cloudflareaccess.com"))
      );
    } catch {
      return false;
    }
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: dark ? "#233127" : "#eff2ec" }}
      >
        <View style={styles.header}>
          <Text
            style={{
              fontWeight: "700",
              letterSpacing: 2,
              color: dark ? "#f1f6ee" : "#203123",
            }}
          >
            VANTA NOIR STUDIO
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setError(false);
              web.current?.reload();
            }}
          >
            <Text style={{ color: dark ? "#d0f194" : "#34522e" }}>Refresh</Text>
          </Pressable>
        </View>
        {Platform.OS === "web" ? (
          <View style={styles.center}>
            <Text>Studio uses your protected administrator account.</Text>
            <Pressable onPress={() => void WebBrowser.openBrowserAsync(ADMIN)}>
              <Text>Open secure admin</Text>
            </Pressable>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ color: dark ? "white" : "black" }}>
              The admin could not be loaded. Check your connection.
            </Text>
            <Pressable
              onPress={() => {
                setError(false);
                setLoading(true);
              }}
            >
              <Text style={{ color: dark ? "#d0f194" : "#34522e" }}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            ref={web}
            source={{ uri: ADMIN }}
            originWhitelist={["https://*"]}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={false}
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setError(true);
              setLoading(false);
            }}
            onHttpError={(e) => {
              if (e.nativeEvent.statusCode >= 500) setError(true);
            }}
            onShouldStartLoadWithRequest={(req) => {
              if (allowed(req.url)) return true;
              if (req.url.startsWith("https://"))
                void WebBrowser.openBrowserAsync(req.url);
              return false;
            }}
          />
        )}
        {loading && Platform.OS !== "web" && (
          <ActivityIndicator
            accessibilityLabel="Loading Studio"
            color={dark ? "#c8f174" : "#34522e"}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  header: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  center: { flex: 1, justifyContent: "center", padding: 30, gap: 20 },
});
