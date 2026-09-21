import { spawnSync } from "node:child_process";
import { readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const pkg = JSON.parse(await readFile("node_modules/vinext/package.json", "utf8"));
const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.vinext;
const result = spawnSync(process.execPath, [resolve("node_modules/vinext", bin), "build"], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// Deploy with the owner's explicit bindings, never generated local placeholders.
await rm(".wrangler/deploy/config.json", { force: true });
await rm("dist/server/wrangler.json", { force: true });
for (const name of await readdir("dist/client")) {
  if (/^qa-/.test(name)) await rm(`dist/client/${name}`, { recursive: true, force: true });
}
const images = JSON.parse(await readFile("lib/image-assets.json", "utf8"));
for (const path of Object.keys(images)) {
  if (!["/images/vanta-hero.png", "/images/vanta-noir-header-logo.png"].includes(path)) {
    await rm(`dist/client${path}`, { force: true });
  }
}

const optimized = spawnSync(process.execPath, ["scripts/optimize-images.mjs", "dist/client"], { stdio: "inherit" });
if (optimized.error) throw optimized.error;
if (optimized.status !== 0) process.exit(optimized.status ?? 1);
