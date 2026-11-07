"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DangerDialog } from "./Dialogs";
import { V } from "./messages";
import { ActionButton } from "./ui";

/**
 * Explicit save, 06 §C.19. Anything that touches money or public text waits for
 * a press; only a lead's internal note and a bulk stock pass save on their own.
 *
 * The bar exists only while the form is dirty, so a clean screen has nothing
 * covering its bottom edge, and the yellow dot is the single indicator that
 * something is unsaved.
 */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onReset,
  blockedReasonHe,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onReset: () => void;
  /** When set the save is refused and this sentence sits next to the button. */
  blockedReasonHe?: string;
}) {
  if (!dirty) return null;
  return (
    <div className="a-savebar" role="region" aria-label="שינויים שלא נשמרו">
      <span className="a-dirty">{blockedReasonHe ?? "יש שינויים שלא נשמרו"}</span>
      <div className="a-row" style={{ marginInlineStart: "auto" }}>
        <ActionButton onClick={onReset} tone="quiet">
          בטל שינויים
        </ActionButton>
        <ActionButton
          tone="primary"
          onClick={onSave}
          disabled={saving === true || blockedReasonHe !== undefined}
        >
          {saving ? "רגע אחד" : "שמור"}
        </ActionButton>
      </div>
    </div>
  );
}

/**
 * The leave guard, one hook for every explicit-save screen (06 §C.19).
 *
 * Two exits have to be covered and they are covered differently. Closing the tab
 * is the browser's own `beforeunload` prompt, which no site is allowed to word
 * for itself. A link inside the panel is caught in the capture phase before the
 * router sees it, and asked in Hebrew.
 */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      event.preventDefault();
      setPendingHref(url.pathname + url.search);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const guard = (
    <DangerDialog
      open={pendingHref !== null}
      titleHe={V.leaveDirtyTitle}
      confirmHe={V.leaveDirtyGo}
      cancelHe={V.leaveDirtyStay}
      onCancel={() => setPendingHref(null)}
      onConfirm={() => {
        const href = pendingHref;
        setPendingHref(null);
        if (href) router.push(href);
      }}
    />
  );

  return { guard };
}
