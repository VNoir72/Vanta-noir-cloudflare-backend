import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Preserve standard and WebKit backdrop filters in production glass surfaces.
  build: { cssMinify: "esbuild" },
  plugins: [vinext(), cloudflare({
    configPath: "wrangler.local.jsonc",
    viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    inspectorPort: false,
  })],
});
