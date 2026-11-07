"use client";

import * as React from "react";

/**
 * Drag to reorder, in a panel whose document direction is RTL.
 *
 * THE RTL TRAP, and how this avoids it: the usual implementation measures a
 * horizontal delta and turns it into an index shift, and in a mirrored layout
 * that arithmetic runs backwards, so a drag to the right moves the row the wrong
 * way. Nothing here measures a delta. The pointer's position is handed to
 * `document.elementFromPoint`, which answers with the row that is physically
 * under the finger, whichever way the page is laid out. Mirroring cannot break a
 * hit test.
 *
 * Keyboard reordering is the mirrored case that must be written down: in RTL the
 * item to the visual RIGHT is the EARLIER one, so `ArrowRight` moves an item
 * towards the start of the list and `ArrowLeft` towards the end. Every move is
 * announced in Hebrew through an `aria-live` region (06 §C.23).
 *
 * The result is reported as neighbours rather than an index, because that is what
 * every `reorder` mutation in this backend takes: `sortBetween(before, after)`
 * writes one fractional index and rewrites exactly one row.
 */

export type SortableEntry = {
  id: string;
  content: React.ReactNode;
  /** Shown in the live announcement, e.g. the colour's Hebrew name. */
  labelHe: string;
};

export function SortableList({
  entries,
  onMove,
  layout = "list",
  disabled = false,
}: {
  entries: SortableEntry[];
  /** `beforeId` is the neighbour that ends up above it, `afterId` the one below. */
  onMove: (id: string, beforeId: string | undefined, afterId: string | undefined) => void;
  layout?: "list" | "grid";
  disabled?: boolean;
}) {
  const ids = React.useMemo(() => entries.map((entry) => entry.id), [entries]);
  const [preview, setPreview] = React.useState<string[] | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  const order = preview ?? ids;
  const byId = React.useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries],
  );

  function commit(next: string[], id: string) {
    const index = next.indexOf(id);
    onMove(id, next[index - 1], next[index + 1]);
  }

  function moveBy(id: string, delta: number) {
    const current = [...order];
    const from = current.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= current.length) return;
    current.splice(to, 0, current.splice(from, 1)[0]);
    setPreview(current);
    commit(current, id);
    const entry = byId.get(id);
    setAnnouncement(`${entry?.labelHe ?? ""} עבר למקום ${to + 1} מתוך ${current.length}`);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (disabled) return;
    event.preventDefault();
    /* preventDefault also cancels the focus a press would have moved, and a
       handle you cannot then drive with the arrow keys is half a control. */
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setPreview([...order]);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (draggingId !== id) return;
    const under = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-sortable-id]") as HTMLElement | null;
    const overId = under?.dataset.sortableId;
    if (!overId || overId === id) return;
    const current = [...(preview ?? order)];
    const from = current.indexOf(id);
    const to = current.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return;
    current.splice(to, 0, current.splice(from, 1)[0]);
    setPreview(current);
  }

  function onPointerUp(id: string) {
    if (draggingId !== id) return;
    const current = preview ?? order;
    setDraggingId(null);
    if (current.join("|") !== ids.join("|")) {
      commit(current, id);
      const entry = byId.get(id);
      setAnnouncement(
        `${entry?.labelHe ?? ""} עבר למקום ${current.indexOf(id) + 1} מתוך ${current.length}`,
      );
    }
    setPreview(null);
  }

  return (
    <>
      <ul className={layout === "grid" ? "a-tiles" : "a-list"} style={{ listStyle: "none" }}>
        {order.map((id) => {
          const entry = byId.get(id);
          if (!entry) return null;
          return (
            <li
              key={id}
              data-sortable-id={id}
              data-dragging={draggingId === id ? "true" : undefined}
              className={layout === "grid" ? undefined : "a-item"}
              style={
                layout === "grid"
                  ? {
                      minInlineSize: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                    }
                  : undefined
              }
            >
              {/* The handle takes the start edge, which in RTL is the right edge
                  of the row, exactly where 06 §C.2 puts it. */}
              <button
                type="button"
                className="a-handle"
                aria-label={`שינוי סדר: ${entry.labelHe}`}
                disabled={disabled}
                onPointerDown={(event) => onPointerDown(event, id)}
                onPointerMove={(event) => onPointerMove(event, id)}
                onPointerUp={() => onPointerUp(id)}
                onPointerCancel={() => onPointerUp(id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowRight") {
                    event.preventDefault();
                    moveBy(id, -1);
                  } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveBy(id, 1);
                  }
                }}
              >
                <span aria-hidden="true">⠿</span>
              </button>
              {entry.content}
            </li>
          );
        })}
      </ul>
      <p className="a-sr" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
