"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

import { ADMIN_LOGIN_EMAIL } from "@/app/admin/_lib/account";
import { errorHe } from "@/components/admin/messages";
import { ActionButton, Card, Field, HelpNote } from "@/components/admin/ui";

/**
 * The only door, and it asks for one thing.
 *
 * There is exactly one account on this deployment and it belongs to Shai, so asking
 * him for an email address is asking him to type a fact the server already knows. The
 * Password provider under @convex-dev/auth still keys accounts by email, so the address
 * lives here as a constant and never on the screen. What he sees is a password field.
 *
 * The form does not say which half was wrong, because there is only one half. A
 * refusal is a refusal, and the copy says so plainly.
 */

export default function AdminLoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (password.length < 8) {
      setError("הסיסמה צריכה להיות באורך 8 תווים לפחות");
      return;
    }

    setBusy(true);
    try {
      await signIn("password", { email: ADMIN_LOGIN_EMAIL, password, flow: "signIn" });
      router.replace("/admin");
    } catch (thrown) {
      setError(
        errorHe(thrown) === "השמירה נכשלה. נסה שוב" ? "הסיסמה לא נכונה" : errorHe(thrown),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="a-main"
      style={{ display: "grid", placeItems: "center", minBlockSize: "100dvh" }}
    >
      <div style={{ inlineSize: "min(26rem, 100%)" }}>
        <div className="a-brand" style={{ justifyContent: "center" }}>
          <span className="a-brand-dot" aria-hidden="true" />
          <span>הניהול של שי</span>
        </div>

        <Card title="כניסה" helpHe="המסך הזה פתוח רק לך.">
          <form className="a-stack" onSubmit={submit} noValidate>
            <Field label="סיסמת מנהל" htmlFor="admin-password">
              <input
                id="admin-password"
                className="a-input"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {error ? (
              <p className="a-error" role="alert">
                {error}
              </p>
            ) : null}

            <ActionButton tone="primary" type="submit" disabled={busy}>
              {busy ? "רגע אחד" : "להיכנס"}
            </ActionButton>

            <HelpNote>את הסיסמה מחליפים בפנים, במסך ההגדרות.</HelpNote>
          </form>
        </Card>
      </div>
    </div>
  );
}
