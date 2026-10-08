import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: process.cwd(),
  publicDir: false,
  resolve: { alias: [
    { find: "next/navigation", replacement: resolve("portable/navigation.ts") },
    { find: "next/link", replacement: resolve("portable/link.tsx") },
    { find: "@", replacement: process.cwd() },
  ] },
  plugins: [react()],
  build: {
    // Lightning CSS can drop the standard backdrop-filter when a WebKit fallback exists.
    cssMinify: "esbuild",
    outDir: "outputs/namecheap", emptyOutDir: true, manifest: true,
    rollupOptions: { input: resolve("portable/entry.tsx") },
  },
});
