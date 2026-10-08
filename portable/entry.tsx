import { hydrateRoot } from "react-dom/client";
import { App } from "./app";
import "@/app/globals.css";
import "@/app/discovery.css";
import "@/app/commerce.css";
import "@/app/checkout-experience.css";

const data = JSON.parse(document.getElementById("store-data")!.textContent!);
hydrateRoot(document.getElementById("root")!, <App path={data.path} products={data.products} />);

import "@/app/approved-storefront.css";
import "@/app/liquid-glass.css";

import "@/app/campaign-2026.css";
import "@/app/brand-palette.css";

