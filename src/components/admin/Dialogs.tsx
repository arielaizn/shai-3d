"use client";

import * as React from "react";

import { ActionButton } from "./ui";

/**
 * The two confirmations, decided once in 06 §C.20.
 *
 * Level 2, `DangerDialog`: one red button, and it sits on the LEFT in RTL so the
 * thumb's default landing spot is the safe one. Both buttons are the same size,
 * and the title is the question itself rather than the word "אזהרה".
 *
 * Level 3, `ConfirmTypeToName`: the name has to be typed. Used for a hard delete
 * and for anything that cannot be undone from the trash.
 */

function useDialogFocus(open: boolean, onClose: () => void) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusable = node?.querySelector<HTMLElement>(
      "button, input, [href], select, textarea",
    );
    focusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      /* A dialog that lets Tab wander back into the page behind it is a dialog
         a keyboard user cannot answer. */
      const items = Array.from(
        node.querySelectorAll<HTMLElement>("button, input, [href], select, textarea"),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

export function DangerDialog({
  open,
  titleHe,
  bodyHe,
  confirmHe,
  cancelHe = "ביטול",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  titleHe: string;
  bodyHe?: string;
  confirmHe: string;
  cancelHe?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useDialogFocus(open, onCancel);
  if (!open) return null;

  return (
    <div className="a-dialog-backdrop" onMouseDown={onCancel}>
      <div
        ref={ref}
        className="a-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={titleHe}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{titleHe}</h2>
        {bodyHe ? <p className="a-muted">{bodyHe}</p> : null}
        <div className="a-dialog-actions">
          <ActionButton onClick={onCancel}>{cancelHe}</ActionButton>
          <ActionButton tone="danger" onClick={onConfirm}>
            {confirmHe}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function ConfirmTypeToName({
  open,
  titleHe,
  bodyHe,
  nameHe,
  confirmHe,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  titleHe: string;
  bodyHe?: string;
  /** The exact text that has to be typed back. */
  nameHe: string;
  confirmHe: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useDialogFocus(open, onCancel);
  const [typed, setTyped] = React.useState("");

  React.useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  if (!open) return null;
  const matches = typed.trim() === nameHe.trim();

  return (
    <div className="a-dialog-backdrop" onMouseDown={onCancel}>
      <div
        ref={ref}
        className="a-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={titleHe}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{titleHe}</h2>
        {bodyHe ? <p className="a-muted">{bodyHe}</p> : null}
        <label className="a-field" style={{ marginBlockStart: "0.75rem" }}>
          <span className="a-label">{`כתיבת «${nameHe}» כדי לאשר`}</span>
          <input
            className="a-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </label>
        <div className="a-dialog-actions">
          <ActionButton onClick={onCancel}>ביטול</ActionButton>
          <ActionButton tone="danger" disabled={!matches} onClick={onConfirm}>
            {confirmHe}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
