import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

import { AdminProviders } from "./AdminProviders";
import "./admin-theme.css";

/**
 * The panel's outer wrapper: the auth cookie bridge, the Convex client, the
 * admin palette, and the class that hides the shop's header and footer while an
 * admin route is mounted (they live in the root layout and there is exactly one
 * root layout in an App Router tree).
 *
 * `force-dynamic` because every screen reads a cookie and a live query. It also
 * keeps `next build` from trying to prerender a page whose whole job is to be
 * personal.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ניהול",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider storageNamespace="shai-admin">
      <div className="admin-root" dir="rtl">
        <AdminProviders>{children}</AdminProviders>
      </div>
    </ConvexAuthNextjsServerProvider>
  );
}
