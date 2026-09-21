import { hydrateRoot } from "react-dom/client";
import { App } from "./app";
import "@/app/globals.css";
import "@/app/discovery.css";
import "@/app/commerce.css";

const data = JSON.parse(document.getElementById("store-data")!.textContent!);
hydrateRoot(document.getElementById("root")!, <App path={data.path} products={data.products} />);
