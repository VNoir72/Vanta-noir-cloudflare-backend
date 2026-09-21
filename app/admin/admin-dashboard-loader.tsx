"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { AdminDashboard } from "./admin-dashboard";

type DashboardProps = ComponentProps<typeof AdminDashboard>;
type DashboardData = Pick<DashboardProps, "initialOrders" | "initialInventory" | "initialAnalytics" | "initialProducts">;

// Keep catalogue-sized objects out of the server-rendered HTML/RSC response.
// Every endpoint verifies the Access JWT and staff permissions independently.
export function AdminDashboardLoader({ adminName, signOutPath }: Pick<DashboardProps, "adminName" | "signOutPath">) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setError("");
      try {
        const read = async <T,>(path: string): Promise<T> => {
          const response = await fetch(path, { signal: controller.signal, credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
          if (response.status === 401 || response.status === 403 || response.redirected) {
            throw new Error("Your session has expired. Sign in again to open the dashboard.");
          }
          if (!response.ok) throw new Error("The dashboard could not load. Please retry.");
          return response.json() as Promise<T>;
        };
        const [orders, inventory, analytics, products] = await Promise.all([
          read<{ orders: DashboardData["initialOrders"] }>("/api/admin/orders"), read<{ inventory: DashboardData["initialInventory"] }>("/api/admin/inventory"),
          read<{ analytics: DashboardData["initialAnalytics"] }>("/api/admin/analytics"), read<{ products: DashboardData["initialProducts"] }>("/api/admin/products"),
        ]);
        if (!Array.isArray(orders.orders) || !Array.isArray(inventory.inventory) || !Array.isArray(products.products) || !analytics.analytics) {
          throw new Error("The dashboard returned incomplete data. Please retry.");
        }
        if (!controller.signal.aborted) setData({ initialOrders: orders.orders, initialInventory: inventory.inventory, initialAnalytics: analytics.analytics, initialProducts: products.products });
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "The dashboard could not load. Please retry.");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  if (data) return <AdminDashboard adminName={adminName} signOutPath={signOutPath} {...data} />;
  return (
    <main className="grid min-h-screen place-items-center bg-[#090909] px-5 text-[#f4f1ea]">
      <section className="w-full max-w-xl border border-white/12 bg-[#101010] p-8 sm:p-12" aria-busy={!error}>
        <p className="text-xs uppercase tracking-widest text-white/50">Vanta Noir · Admin</p>
        <h1 className="mt-5 text-3xl">Store administration</h1>
        <p className="mt-5 text-sm text-white/70" role={error ? "alert" : "status"}>{error || "Loading your dashboard…"}</p>
        {error && <button type="button" className="mt-6 border border-white/30 px-5 py-3" onClick={() => setAttempt(value => value + 1)}>Retry</button>}
        <a className="mt-6 block text-sm underline" href={signOutPath}>Sign out / use another account</a>
        <p className="mt-8 text-xs text-white/40">Presence. Power. Precision.</p>
      </section>
    </main>
  );
}
