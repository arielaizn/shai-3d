"use client";

import * as React from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";

import { ToastHost } from "@/components/admin/Toast";

/**
 * The Convex client for the panel, and nothing else on the site.
 *
 * The shop is static and reads no live data yet, so the client is mounted here
 * rather than in the root layout: a visitor from Instagram should not download
 * and open a websocket for a screen only Shai ever sees.
 *
 * The client is built inside `useMemo` rather than at module scope on purpose.
 * `new ConvexReactClient(undefined!)` throws, and at module scope that throw
 * happens while the module is evaluated, which turns a missing deployment
 * variable into a build failure instead of a sentence somebody can read.
 */
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const client = React.useMemo(
    () => (CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null),
    [],
  );

  if (!client) {
    return (
      <div className="a-main">
        <div className="a-card a-stack">
          <h1 className="a-card-title">הניהול עוד לא מחובר לשרת</h1>
          <p className="a-muted">
            חסר משתנה הסביבה NEXT_PUBLIC_CONVEX_URL. אחרי שהוא מוגדר, רענון של העמוד פותח את
            הניהול.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConvexAuthNextjsProvider client={client}>
      <ToastHost>{children}</ToastHost>
    </ConvexAuthNextjsProvider>
  );
}
