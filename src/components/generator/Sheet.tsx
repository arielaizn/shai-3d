"use client";

/**
 * src/components/generator/Sheet.tsx
 *
 * The bottom sheet. Two of them exist in the generator: what a print type is
 * (09c §6.4) and the fifth-colour offer (09c §6.6), and both are modal dialogs.
 *
 * What makes it a dialog and not a div:
 *
 *   `role="dialog"` + `aria-modal` + `aria-labelledby`   it is announced as one
 *   focus moves in on open and back to the opener on close
 *   Tab is trapped inside while it is open
 *   Escape closes it
 *   the page behind it stops scrolling, and comes back to the same pixel
 *
 * The scroll lock stores the offset and restores it after the sheet unmounts, because
 * `overflow: hidden` on the body alone loses the position on iOS. Focus is taken with
 * `preventScroll: true` for the same reason: focusing an element inside a fixed layer
 * scrolls the document underneath it on Safari, and the visitor comes back to a page
 * that jumped.
 *
 * Doc 07: the sheet enters on the `sheet` spring, which is 520ms of travel, and under
 * `prefers-reduced-motion` it simply appears.
 */

import * as React from "react";

import { Button } from "@/components/ui/Button";

import { useReducedMotion } from "./hooks";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  titleHe: string;
  closeLabelHe: string;
  children: React.ReactNode;
  /** The row of actions at the bottom of the sheet. */
  footer?: React.ReactNode;
};

export function Sheet({ open, onClose, titleHe, closeLabelHe, children, footer }: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;

    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const scrollY = window.scrollY;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const panel = panelRef.current;
    panel?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      body.style.overflow = previousOverflow;
      window.scrollTo({ top: scrollY });
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* The scrim is not the close control on its own: it carries a button role and
          a name, so a screen reader user has a way out that is not the Escape key. */}
      <button
        type="button"
        aria-label={closeLabelHe}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ backgroundColor: "color-mix(in oklab, var(--color-ink-900) 55%, transparent)" }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex w-full max-w-[34rem] flex-col gap-4 outline-none [min-inline-size:0]"
        style={{
          backgroundColor: "var(--color-surface-raised)",
          borderStartStartRadius: "var(--radius-2xl)",
          borderStartEndRadius: "var(--radius-2xl)",
          borderEndStartRadius: "0",
          borderEndEndRadius: "0",
          borderTop: "3px solid var(--color-ink-900)",
          boxShadow: "var(--shadow-xl)",
          padding: "1.25rem",
          paddingBlockEnd: "calc(1.25rem + env(safe-area-inset-bottom))",
          maxBlockSize: "82dvh",
          overflowY: "auto",
          animation: reduced
            ? undefined
            : "sheet-rise 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <style>{"@keyframes sheet-rise { from { transform: translateY(14%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }"}</style>

        <span
          aria-hidden="true"
          className="mx-auto block"
          style={{
            inlineSize: "3rem",
            blockSize: "0.3125rem",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-cream-400)",
          }}
        />

        <h2
          id={titleId}
          className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
          style={{ fontSize: "1.375rem", fontWeight: 800, lineHeight: 1.2 }}
        >
          {titleHe}
        </h2>

        <div
          className="flex flex-col gap-3 [min-inline-size:0]"
          style={{ fontSize: "1rem", lineHeight: 1.75, color: "var(--color-text-secondary)" }}
        >
          {children}
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse sm:items-center [min-inline-size:0]">
          {footer ?? (
            <Button variant="ink" size="md" fullWidth onClick={onClose}>
              {closeLabelHe}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
