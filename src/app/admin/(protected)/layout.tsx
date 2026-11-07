"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { AdminShell } from "@/app/admin/_components/AdminShell";
import "../admin-screens.css";

/**
 * Layer 2 of the three in 06 §B.6. `src/proxy.ts` already redirects a signed-out
 * visitor before this tree is requested, and `requireAdmin` inside every Convex
 * function is the actual boundary. This layer exists for one reason: the panel's
 * markup must never be handed to a browser that is not signed in, not even for
 * the frame it takes a client-side redirect to run.
 *
 * That is why `children` sits inside `<Authenticated>` and nowhere else. React
 * builds the element, and `Authenticated` never renders it while the session is
 * unknown or absent, so there is no flash of admin content and no query fires
 * from a signed-out tab.
 */
function BackToLogin() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/admin/login");
  }, [router]);

  return (
    <div className="a-main">
      <p className="a-muted">רגע, מעביר אותך למסך הכניסה</p>
    </div>
  );
}

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthLoading>
        <div className="a-main">
          <div className="a-stack" aria-hidden="true">
            <div className="a-skeleton" style={{ blockSize: "2.5rem", inlineSize: "12rem" }} />
            <div className="a-skeleton" style={{ blockSize: "6rem" }} />
            <div className="a-skeleton" style={{ blockSize: "6rem" }} />
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <BackToLogin />
      </Unauthenticated>

      <Authenticated>
        <AdminShell>{children}</AdminShell>
      </Authenticated>
    </>
  );
}
