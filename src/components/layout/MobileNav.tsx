"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LinkButton } from "@/components/ui/LinkButton";
import { DURATION, EASE, STAGGER } from "@/lib/design/motion";
import { HEADER, MOBILE_NAV, NAV } from "@/content/site";

import { CloseGlyph } from "./Glyphs";
import { WhatsAppGlyph, WhatsAppLink } from "./WhatsAppLink";

/**
 * The mobile navigation sheet, doc 03 §2.4.
 *
 * It slides in from the **end (left) edge**, the same edge the hamburger sits on, so
 * the panel visibly comes out from under the finger that opened it. Lateral motion is
 * `translateX(calc(var(--flow) * …))` per doc 07 §14.3, and `--flow` is declared here
 * because this site has one direction: 1 is RTL.
 *
 * Mechanics, all of them load bearing:
 *   · `inert` on `<main>` while open, so the page behind is neither clickable nor
 *     reachable by a screen reader's virtual cursor
 *   · `overflow: hidden` plus `scrollbar-gutter: stable` on `<html>`, so closing the
 *     sheet does not shift the page sideways by the width of a scrollbar
 *   · a focus trap, `Escape` to close, and the trigger regains focus on close
 *   · a route change closes it, via `usePathname()`
 */

type CssVars = React.CSSProperties & Record<string, string | number | undefined>;

/**
 * The sheet is a modal dialog and a dialog has to carry an accessible name, which
 * 09c §2.4 does not supply: it gives the trigger's label (`לפתוח תפריט`) and the close
 * label, and neither is a name for the panel itself. One noun, flagged in the return
 * so the copy owner can approve or replace it.
 */
const SHEET_LABEL = "תפריט";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export type MobileNavProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = React.useState(false);

  /* the sheet is kept in the tree for one exit transition, then unmounted */
  const [present, setPresent] = React.useState(open);
  React.useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = window.requestAnimationFrame(() => setMounted(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setMounted(false);
    const timer = window.setTimeout(() => setPresent(false), DURATION.d4);
    return () => window.clearTimeout(timer);
  }, [open]);

  /* page state: scroll lock, inert main, focus.
     `present` is in the deps because the panel is mounted by the effect above, one
     render later than `open` flips: without it `closeRef` is still null here and the
     sheet opens with focus left behind on the trigger. */
  React.useEffect(() => {
    if (!open || !present) return;
    const html = document.documentElement;
    const main = document.querySelector<HTMLElement>("main");
    const previousOverflow = html.style.overflow;
    const previousGutter = html.style.scrollbarGutter;

    html.style.overflow = "hidden";
    html.style.scrollbarGutter = "stable";
    if (main) main.inert = true;
    closeRef.current?.focus();

    return () => {
      html.style.overflow = previousOverflow;
      html.style.scrollbarGutter = previousGutter;
      if (main) main.inert = false;
    };
  }, [open, present]);

  /* Escape and the focus trap */
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  /* a route change closes the sheet */
  const closeRef2 = React.useRef(onClose);
  closeRef2.current = onClose;
  React.useEffect(() => {
    closeRef2.current();
  }, [pathname]);

  if (!present) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      style={{ "--flow": 1 } as CssVars}
      role="dialog"
      aria-modal="true"
      aria-label={SHEET_LABEL}
    >
      <button
        type="button"
        aria-label={HEADER.menuCloseAria}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-ink-900) 45%, transparent)",
          opacity: mounted ? 1 : 0,
          transition: `opacity ${DURATION.d3}ms ${EASE.outSoft}`,
        }}
      />

      <div
        ref={panelRef}
        className="absolute inset-y-0 end-0 flex w-[min(20rem,88vw)] flex-col [min-inline-size:0]"
        style={{
          backgroundColor: "var(--color-surface)",
          boxShadow: "var(--shadow-xl)",
          // slide-flow, doc 07 §5.3: the offset mirrors through --flow and nothing else
          transform: mounted
            ? "translateX(0)"
            : "translateX(calc(var(--flow) * -100%))",
          transition: `transform ${DURATION.d4}ms ${EASE.toyBig}`,
          paddingBlockEnd: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex h-14 items-center px-5">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={HEADER.menuCloseAria}
            className="inline-flex size-11 items-center justify-center rounded-full"
            style={{ color: "var(--color-ink-900)" }}
          >
            <CloseGlyph />
          </button>
        </div>

        <nav className="flex flex-col px-5">
          {NAV.items.map((item, index) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className="flex h-14 items-center justify-end text-end font-[family-name:var(--font-rubik)] [min-inline-size:0]"
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: active ? "var(--color-turq-800)" : "var(--color-ink-900)",
                  transform: mounted ? "translateX(0)" : "translateX(calc(var(--flow) * 24px))",
                  opacity: mounted ? 1 : 0,
                  transition: `transform ${DURATION.d4}ms ${EASE.toyBig} ${index * STAGGER.editorial + 30}ms, opacity ${DURATION.d3}ms ${EASE.outSoft} ${index * STAGGER.editorial + 30}ms`,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-5 pt-8">
          <LinkButton href={HEADER.ctaHref} variant="accent" size="lg" fullWidth onClick={onClose}>
            {MOBILE_NAV.primaryCta}
          </LinkButton>

          <WhatsAppLink
            config={{ kind: "generic" }}
            source="nav"
            variant="play"
            size="lg"
            fullWidth
            iconStart={<WhatsAppGlyph />}
            onClick={onClose}
          >
            {MOBILE_NAV.secondaryCta}
          </WhatsAppLink>

          <p
            className="pt-2 text-center"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            {MOBILE_NAV.socialLine}
          </p>
        </div>
      </div>
    </div>
  );
}
