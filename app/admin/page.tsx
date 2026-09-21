import {OperationsPanel} from "./operations-panel";
import Link from "next/link";
import { headers } from "next/headers";
import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { runtimeEnv } from "@/lib/runtime-env";
import { AdminDashboardLoader } from "./admin-dashboard-loader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Store admin",
  description: "Private Vanta Noir store administration.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const requestHeaders = await headers();
  const access = await adminAuthStateFromRequest(new Request("https://api.vantanoir.store/admin", { headers: requestHeaders }));
  const user = { email: access.ok ? access.email : "", displayName: access.ok ? access.email : "Administrator" };
  const signOutPath = "/cdn-cgi/access/logout";
  const configuredEmail = runtimeEnv().ADMIN_EMAIL?.trim();

  const role = access.ok ? access.role : null;
  if (!configuredEmail || !role) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090909] px-5 text-[#f4f1ea]">
        <section className="w-full max-w-xl border border-white/12 bg-[#101010] p-8 sm:p-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Vanta Noir · Admin</p>
          <h1 className="mt-5 font-sans text-4xl">Private access is locked.</h1>
          <p className="mt-5 text-sm leading-7 text-white/55">
            {configuredEmail
              ? "This account is not authorised to manage the store. Sign in using the approved administrator email."
              : "The store is secure, but the administrator email still needs to be connected before this dashboard can open."}
          </p>
          <p className="mt-4 border border-white/10 bg-black/30 p-4 text-xs text-white/45">
            Signed in as {user.email}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-none bg-white text-black hover:bg-white/80">
              <Link href="/">Return to store</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-none border-white/15 bg-transparent text-white hover:bg-white hover:text-black">
              <a href={signOutPath}>Use another account</a>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if(role!=="owner") return <main className="min-h-screen bg-[#090909] p-5 text-white"><h1 className="text-3xl">Vanta Noir operations</h1><p>{user.email} · {role}</p><OperationsPanel role={role}/><a href={signOutPath}>Sign out</a></main>;
  return <AdminDashboardLoader adminName={user.displayName} signOutPath={signOutPath} />;
}
