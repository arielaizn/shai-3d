"use client";

import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

import { errorHe } from "@/components/admin/messages";
import { ActionButton, Card } from "@/components/admin/ui";

/**
 * The last line of defence, and it exists for one specific failure: a session
 * that is still valid while the `admins` row behind it was disabled. Every query
 * on the screen then throws FORBIDDEN during render, and without a boundary the
 * panel goes blank with an English stack trace in it.
 *
 * A Convex `ConvexError` already carries a Hebrew sentence written by the
 * function that refused, so the boundary prints that.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <div className="a-main">
      <Card title="משהו נתקע">
        <p className="a-muted">{errorHe(error)}</p>
        <div className="a-row" style={{ marginBlockStart: "1rem" }}>
          <ActionButton tone="primary" onClick={reset}>
            לנסות שוב
          </ActionButton>
          <ActionButton
            tone="quiet"
            onClick={() => {
              void signOut().then(() => router.replace("/admin/login"));
            }}
          >
            לצאת ולהיכנס מחדש
          </ActionButton>
        </div>
      </Card>
    </div>
  );
}
