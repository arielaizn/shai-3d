"use client";

import * as React from "react";
import Image from "next/image";

import { PRODUCT } from "@/content/products";

import { CubeGlyph } from "./glyphs";
import type { ProductImage } from "./model";

/**
 * The thumbnail rail under the media stage, doc 03 §5.2 and §5.4.
 *
 * The first thumb is the 3D cube on a turquoise ground, and it exists only when a
 * `.glb` really is attached. That is the same promise the catalogue badge makes, kept
 * on the page the badge pointed at.
 *
 * It is a real `role="tablist"`: one tab stop for the rail, arrows move between
 * thumbs, `Home` and `End` jump, and **in RTL `ArrowLeft` advances forward** because
 * that is the direction the rail runs. Selection follows focus, which is the right
 * pattern here: switching a picture is instant and reversible, so making the visitor
 * press Enter after arrowing would be ceremony.
 *
 * The rail scrolls on the phone with snap points. Its overflow is deliberate and
 * contained: the strip is `min-inline-size: 0` inside its column, so nothing it holds
 * can push the document sideways.
 */

export const VIEWER_TAB = "viewer";

/**
 * A `tablist` needs a name and 09c gives the rail none, only the label on its first
 * thumb. One noun phrase, flagged in the return for the copy owner.
 */
const RAIL_LABEL = "תצוגות של הדגם";

export type ProductThumbRailProps = {
  images: readonly ProductImage[];
  /** `VIEWER_TAB` or the index of an image, as a string. */
  value: string;
  onChange: (value: string) => void;
  /** False when the product has no model, which removes the 3D thumb entirely. */
  hasViewer: boolean;
  /** Ties the rail to the stage it drives. */
  panelId: string;
};

export function ProductThumbRail({
  images,
  value,
  onChange,
  hasViewer,
  panelId,
}: ProductThumbRailProps) {
  const railRef = React.useRef<HTMLDivElement>(null);

  const tabs = React.useMemo(
    () => [...(hasViewer ? [VIEWER_TAB] : []), ...images.map((_, index) => String(index))],
    [hasViewer, images],
  );

  if (tabs.length <= 1) return null;

  function focusTab(next: string) {
    onChange(next);
    const node = railRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`);
    node?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = tabs.indexOf(value);
    if (current < 0) return;
    let next = current;
    switch (event.key) {
      // RTL: forward is left
      case "ArrowLeft":
        next = (current + 1) % tabs.length;
        break;
      case "ArrowRight":
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusTab(tabs[next]);
  }

  return (
    <div
      ref={railRef}
      role="tablist"
      aria-label={RAIL_LABEL}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className="flex snap-x snap-mandatory items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [min-inline-size:0]"
    >
      {hasViewer ? (
        <Thumb
          tab={VIEWER_TAB}
          selected={value === VIEWER_TAB}
          label={PRODUCT.viewer.thumb3d}
          panelId={panelId}
          onSelect={() => onChange(VIEWER_TAB)}
        >
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: "var(--color-turq-500)", color: "var(--color-ink-900)" }}
          >
            <CubeGlyph size={22} />
          </span>
        </Thumb>
      ) : null}

      {images.map((image, index) => (
        <Thumb
          key={image.url}
          tab={String(index)}
          selected={value === String(index)}
          label={image.altHe}
          panelId={panelId}
          onSelect={() => onChange(String(index))}
        >
          <Image
            src={image.url}
            alt=""
            fill
            sizes="72px"
            style={{ objectFit: "cover" }}
          />
        </Thumb>
      ))}
    </div>
  );
}

function Thumb({
  children,
  tab,
  selected,
  label,
  panelId,
  onSelect,
}: {
  children: React.ReactNode;
  tab: string;
  selected: boolean;
  label: string;
  panelId: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      data-tab={tab}
      aria-selected={selected}
      aria-controls={panelId}
      aria-label={label}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className="relative shrink-0 snap-start overflow-hidden transition duration-140 ease-toy [min-inline-size:0]"
      style={{
        inlineSize: "4rem",
        blockSize: "4rem",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--color-cream-100)",
        boxShadow: selected
          ? "0 0 0 2px var(--color-ink-900)"
          : "inset 0 0 0 1px color-mix(in oklab, var(--color-ink-900) 12%, transparent)",
      }}
    >
      {children}
    </button>
  );
}
