"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

import { api } from "@/app/admin/_lib/convex";
import { NAV, TAB_ITEMS, isCurrent, type NavItem } from "@/app/admin/_lib/nav";

/**
 * The frame around every screen. 06 §C.3.
 *
 * On a phone: a top bar with the two counts that matter and a five item tab bar
 * at the bottom, the fifth being "עוד", which opens the full list as a sheet. On
 * a desktop, the sidebar on the RIGHT, because that is the start edge in RTL.
 *
 * The badges are live queries rather than props, so a lead that lands while Shai
 * is editing a colour shows up on the tab bar without a navigation.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const leadCounts = useQuery(api.leads.counts, {});
  const messageCounts = useQuery(api.contact.counts, {});

  const badgeValue = React.useCallback(
    (item: NavItem): number => {
      if (item.badge === "leads") return leadCounts?.new ?? 0;
      if (item.badge === "messages") return messageCounts?.new ?? 0;
      return 0;
    },
    [leadCounts, messageCounts],
  );

  React.useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  async function leave() {
    await signOut();
    router.replace("/admin/login");
  }

  return (
    <div className="a-shell">
      <nav className="a-side" aria-label="ניווט ראשי">
        <div className="a-brand">
          <span className="a-brand-dot" aria-hidden="true" />
          <span>הניהול של שי</span>
        </div>

        {NAV.map((group, index) => (
          <div key={index} className={index === 0 ? undefined : "a-navgroup"}>
            {group.labelHe ? <p className="a-navlabel">{group.labelHe}</p> : null}
            {group.items.map((item) => {
              const count = badgeValue(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={item.sub ? "a-navlink a-navlink-sub" : "a-navlink"}
                  aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                >
                  <span aria-hidden="true">{item.glyph}</span>
                  <span className="a-grow">{item.labelHe}</span>
                  {count > 0 ? (
                    <span className="a-badge" data-tone={item.badge === "messages" ? "yellow" : undefined}>
                      <bdi dir="ltr">{count}</bdi>
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="a-navgroup">
          <button type="button" className="a-navlink" onClick={() => void leave()}>
            <span aria-hidden="true">⏻︎</span>
            <span className="a-grow">יציאה</span>
          </button>
        </div>
      </nav>

      <main className="a-main" id="admin-main">
        <div className="a-topbar">
          <span className="a-brand-dot" aria-hidden="true" />
          <strong className="a-grow">הניהול של שי</strong>
          {(leadCounts?.new ?? 0) > 0 ? (
            <Link href="/admin/leads" className="a-pill" data-tone="new">
              <bdi dir="ltr">{leadCounts?.new}</bdi> חדשות
            </Link>
          ) : null}
        </div>
        {children}
      </main>

      <nav className="a-tabbar" aria-label="ניווט מהיר">
        {TAB_ITEMS.map((item) => {
          const count = badgeValue(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="a-tab"
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
            >
              <span aria-hidden="true" style={{ fontSize: "1.125rem", position: "relative" }}>
                {item.glyph}
                {count > 0 ? (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      insetBlockStart: "-0.25rem",
                      insetInlineEnd: "-0.5rem",
                      inlineSize: "0.5rem",
                      blockSize: "0.5rem",
                      borderRadius: "999px",
                      backgroundColor: "var(--admin-red)",
                    }}
                  />
                ) : null}
              </span>
              <span>
                {item.labelHe}
                {count > 0 ? <span className="a-sr">, {count} חדשות</span> : null}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          className="a-tab"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span aria-hidden="true" style={{ fontSize: "1.125rem" }}>
            ⋯︎
          </span>
          <span>עוד</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="a-sheet" onMouseDown={() => setMoreOpen(false)}>
          <div
            className="a-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="כל המסכים"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="a-row" style={{ marginBlockEnd: "0.5rem" }}>
              <strong className="a-grow">כל המסכים</strong>
              <button
                type="button"
                className="a-iconbtn"
                aria-label="סגירת התפריט"
                onClick={() => setMoreOpen(false)}
              >
                ✕︎
              </button>
            </div>
            {NAV.flatMap((group) => group.items).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="a-navlink"
                aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              >
                <span aria-hidden="true">{item.glyph}</span>
                <span className="a-grow">{item.labelHe}</span>
                {badgeValue(item) > 0 ? (
                  <span className="a-badge">
                    <bdi dir="ltr">{badgeValue(item)}</bdi>
                  </span>
                ) : null}
              </Link>
            ))}
            <button type="button" className="a-navlink" onClick={() => void leave()}>
              <span aria-hidden="true">⏻︎</span>
              <span className="a-grow">יציאה</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
