"use client";

/**
 * src/components/generator/StepSize.tsx
 *
 * Step 4 · `גודל`. How big, how many, when, and how it gets there.
 *
 * **The silhouette is the whole point of the size control.** `12×17 ס״מ` means nothing
 * to most people. The same rectangle drawn next to a hand at a fixed scale means
 * something instantly, and it is what stops the message that begins with
 * `לא הבנתי שזה כזה קטן`.
 *
 * **Rush is opt in and it is capped.** RESOLUTIONS §ב.7 dropped `leadTimeDays` from 7
 * to 3 and made the surcharge a choice: the site promises three days as standard, so
 * charging 25% for anything inside seven was charging for what was already promised.
 * The line under the toggle states the surcharge before a date is picked, so the price
 * screen holds no surprises.
 */

import * as React from "react";

import { ChipBadge } from "@/components/ui/ChipBadge";
import { GENERATOR } from "@/content/generator";
import { sizeHintKey } from "@/lib/three/geometry/printTypeDefaults";

import { bpToPercent, daysUntil, discountBpFor, isoDaysFromNow } from "./catalogue";
import { StepNote } from "./StepShell";
import { fill, type PricingRules, type PrintTypeInfo } from "./types";

export type StepSizeProps = {
  printType: PrintTypeInfo | null;
  rules: PricingRules;
  sizeKey: string | null;
  quantity: number;
  rush: boolean;
  neededByIso: string | null;
  delivery: "pickup" | "shipping";
  onSize: (key: string) => void;
  onQuantity: (quantity: number) => void;
  onRush: (rush: boolean) => void;
  onNeededBy: (iso: string | null) => void;
  onDelivery: (delivery: "pickup" | "shipping") => void;
};

export function StepSize({
  printType,
  rules,
  sizeKey,
  quantity,
  rush,
  neededByIso,
  delivery,
  onSize,
  onQuantity,
  onRush,
  onNeededBy,
  onDelivery,
}: StepSizeProps) {
  const sizes = printType?.sizes ?? [];
  const discountBp = discountBpFor(rules, quantity);
  const days = daysUntil(neededByIso);
  const tooSoon = rush && days !== undefined && days < 1;

  return (
    <div className="flex flex-col gap-6 [min-inline-size:0]">
      {/* ---------------------------------------------------------- size */}
      {sizes.length === 0 ? (
        <StepNote tone="play">{GENERATOR.size.empty}</StepNote>
      ) : (
        <fieldset className="flex flex-col gap-3 [min-inline-size:0]">
          <legend
            className="font-[family-name:var(--font-rubik)]"
            style={{ fontSize: "1.0625rem", fontWeight: 800, paddingBlockEnd: "0.25rem" }}
          >
            {GENERATOR.size.label}
          </legend>

          <ul className="grid gap-2.5 sm:grid-cols-3 [min-inline-size:0]">
            {sizes.map((size) => {
              const selected = size.key === sizeKey;
              const hint =
                size.longestEdgeMm !== null
                  ? GENERATOR.size.hint[sizeHintKey(size.longestEdgeMm)]
                  : null;

              return (
                <li key={size.key} className="[min-inline-size:0]">
                  <label
                    className="g-focus flex cursor-pointer items-center gap-3 [min-inline-size:0]"
                    style={{
                      backgroundColor: "var(--color-surface-raised)",
                      borderWidth: "3px",
                      borderStyle: "solid",
                      borderColor: selected ? "var(--color-red-600)" : "var(--color-cream-300)",
                      borderRadius: "var(--radius-lg)",
                      padding: "0.75rem",
                      minBlockSize: "var(--spacing-tap-lg)",
                      transition: "border-color 140ms linear",
                    }}
                  >
                    <input
                      type="radio"
                      name="generator-size"
                      className="sr-only"
                      checked={selected}
                      onChange={() => onSize(size.key)}
                    />

                    <SizeSilhouette longestEdgeMm={size.longestEdgeMm} selected={selected} />

                    <span className="flex flex-col gap-0.5 [min-inline-size:0]">
                      <span
                        className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
                        style={{ fontSize: "1rem", fontWeight: 700 }}
                      >
                        <bdi>{size.labelHe}</bdi>
                      </span>
                      {hint ? (
                        <span
                          style={{
                            fontSize: "0.8125rem",
                            lineHeight: 1.35,
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {hint}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {/* ------------------------------------------------------ quantity */}
      <div className="flex flex-col gap-3 [min-inline-size:0]">
        <p
          className="font-[family-name:var(--font-rubik)]"
          style={{ fontSize: "1.0625rem", fontWeight: 800 }}
          id="generator-quantity-label"
        >
          {GENERATOR.quantity.label}
        </p>

        <div className="flex flex-wrap items-center gap-3 [min-inline-size:0]">
          <div
            className="flex items-center gap-1 [min-inline-size:0]"
            style={{
              backgroundColor: "var(--color-surface-raised)",
              borderRadius: "var(--radius-full)",
              borderWidth: "3px",
              borderStyle: "solid",
              borderColor: "var(--color-cream-300)",
              padding: "0.25rem",
            }}
          >
            <StepperButton
              label={GENERATOR.quantity.decAria}
              disabled={quantity <= 1}
              onClick={() => onQuantity(quantity - 1)}
            >
              <MinusGlyph />
            </StepperButton>

            <input
              type="number"
              inputMode="numeric"
              aria-labelledby="generator-quantity-label"
              min={1}
              max={rules.maxQuantity}
              value={quantity}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(next)) {
                  onQuantity(Math.min(rules.maxQuantity, Math.max(1, next)));
                }
              }}
              className="rounded-sm text-center tabular-nums [min-inline-size:0]"
              style={{
                inlineSize: "3.25rem",
                minBlockSize: "var(--spacing-tap)",
                fontFamily: "var(--font-rubik), system-ui, sans-serif",
                fontSize: "1.25rem",
                fontWeight: 800,
                backgroundColor: "transparent",
                color: "var(--color-ink-900)",
              }}
            />

            <StepperButton
              label={GENERATOR.quantity.incAria}
              disabled={quantity >= rules.maxQuantity}
              onClick={() => onQuantity(quantity + 1)}
            >
              <PlusGlyph />
            </StepperButton>
          </div>

          {discountBp > 0 ? (
            <ChipBadge tone="yellow" size="md" pop>
              {fill(GENERATOR.quantity.discount, {
                n: quantity,
                pct: bpToPercent(discountBp),
              })}
            </ChipBadge>
          ) : null}
        </div>

        {quantity >= rules.maxQuantity ? (
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            {GENERATOR.quantity.max}
          </p>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- rush */}
      {rules.rushEnabled ? (
        <div className="flex flex-col gap-3 [min-inline-size:0]">
          <label
            className="g-focus flex cursor-pointer items-center gap-3 [min-inline-size:0]"
            style={{ minBlockSize: "var(--spacing-tap)" }}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={rush}
              onChange={(event) => onRush(event.target.checked)}
            />
            <Switch on={rush} />
            <span style={{ fontSize: "1rem", fontWeight: 700 }}>{GENERATOR.rush.toggle}</span>
          </label>

          {rush ? (
            <div className="flex flex-col gap-2 [min-inline-size:0]">
              <label
                className="flex flex-col gap-1.5 [min-inline-size:0]"
                style={{ fontSize: "0.9375rem", fontWeight: 700 }}
              >
                {GENERATOR.rush.dateLabel}
                <input
                  type="date"
                  value={neededByIso ?? ""}
                  min={isoDaysFromNow(0)}
                  onChange={(event) => onNeededBy(event.target.value || null)}
                  className="rounded-md [min-inline-size:0]"
                  style={{
                    minBlockSize: "var(--spacing-tap)",
                    maxInlineSize: "12rem",
                    padding: "0 0.75rem",
                    backgroundColor: "var(--color-surface-raised)",
                    borderWidth: "3px",
                    borderStyle: "solid",
                    borderColor: "var(--color-cream-300)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--color-ink-900)",
                  }}
                />
              </label>

              {tooSoon ? (
                <StepNote tone="warning">{GENERATOR.rush.tooSoon}</StepNote>
              ) : (
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                  {GENERATOR.rush.note}
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ------------------------------------------------------ delivery */}
      <fieldset className="flex flex-col gap-3 [min-inline-size:0]">
        <legend
          className="font-[family-name:var(--font-rubik)]"
          style={{ fontSize: "1.0625rem", fontWeight: 800, paddingBlockEnd: "0.25rem" }}
        >
          {GENERATOR.delivery.label}
        </legend>

        <div className="grid gap-2.5 sm:grid-cols-2 [min-inline-size:0]">
          {rules.pickupEnabled ? (
            <DeliveryChoice
              checked={delivery === "pickup"}
              labelHe={GENERATOR.delivery.pickup}
              onSelect={() => onDelivery("pickup")}
            />
          ) : null}
          <DeliveryChoice
            checked={delivery === "shipping"}
            labelHe={GENERATOR.delivery.shipping}
            onSelect={() => onDelivery("shipping")}
          />
        </div>
      </fieldset>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* pieces                                                               */
/* ------------------------------------------------------------------ */

function DeliveryChoice({
  checked,
  labelHe,
  onSelect,
}: {
  checked: boolean;
  labelHe: string;
  onSelect: () => void;
}) {
  return (
    <label
      className="g-focus flex cursor-pointer items-center gap-3 [min-inline-size:0]"
      style={{
        backgroundColor: "var(--color-surface-raised)",
        borderWidth: "3px",
        borderStyle: "solid",
        borderColor: checked ? "var(--color-red-600)" : "var(--color-cream-300)",
        borderRadius: "var(--radius-lg)",
        padding: "0.75rem",
        minBlockSize: "var(--spacing-tap-lg)",
        transition: "border-color 140ms linear",
      }}
    >
      <input
        type="radio"
        name="generator-delivery"
        className="sr-only"
        checked={checked}
        onChange={onSelect}
      />
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center"
        style={{
          inlineSize: "1.375rem",
          blockSize: "1.375rem",
          borderRadius: "var(--radius-full)",
          borderWidth: "3px",
          borderStyle: "solid",
          borderColor: checked ? "var(--color-red-600)" : "var(--color-border-strong)",
        }}
      >
        {checked ? (
          <span
            style={{
              inlineSize: "0.5rem",
              blockSize: "0.5rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-red-600)",
            }}
          />
        ) : null}
      </span>
      <span style={{ fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.4 }}>{labelHe}</span>
    </label>
  );
}

function StepperButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center rounded-full"
      style={{
        inlineSize: "var(--spacing-tap)",
        blockSize: "var(--spacing-tap)",
        backgroundColor: disabled ? "var(--color-cream-200)" : "var(--color-ink-900)",
        color: disabled ? "var(--color-text-disabled)" : "var(--color-cream-50)",
      }}
    >
      {children}
    </button>
  );
}

function MinusGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M4 10h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M4 10h12M10 4v12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative block shrink-0"
      style={{
        inlineSize: "3rem",
        blockSize: "1.75rem",
        borderRadius: "var(--radius-full)",
        backgroundColor: on ? "var(--color-turq-500)" : "var(--color-cream-400)",
        transition: "background-color 140ms linear",
      }}
    >
      <span
        className="absolute top-1/2"
        style={{
          insetInlineStart: on ? "calc(100% - 1.5rem)" : "0.25rem",
          inlineSize: "1.25rem",
          blockSize: "1.25rem",
          marginBlockStart: "-0.625rem",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--color-cream-50)",
          boxShadow: "var(--shadow-sm)",
          transition: "inset-inline-start 160ms var(--ease-toy)",
        }}
      />
    </span>
  );
}

/**
 * The object drawn beside a hand, both at the same scale. 200mm is the longest edge
 * Shai prints, so the hand is fixed at what a 180mm hand looks like against it.
 */
function SizeSilhouette({
  longestEdgeMm,
  selected,
}: {
  longestEdgeMm: number | null;
  selected: boolean;
}) {
  const mm = longestEdgeMm ?? 120;
  const scale = Math.max(0.28, Math.min(1, mm / 200));
  const height = 34 * scale;
  const width = 26 * scale;

  return (
    <svg
      viewBox="0 0 56 40"
      width="52"
      height="38"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {/* the hand, always the same size */}
      <path
        d="M40 38V22c0-2 3-2 3 0v8c1-5 2-9 3-12 .6-1.8 3-1 2.6 1L46 30c2-3 4-5 5-6 1.4-1.4 3 .4 2 1.8-2 2.6-3.4 6-4 8.4-.4 1.6-1 3-2 3.8z"
        fill="var(--color-cream-400)"
      />
      <rect
        x="4"
        y={38 - height}
        width={width}
        height={height}
        rx="2"
        fill={selected ? "var(--color-red-500)" : "var(--color-turq-500)"}
      />
    </svg>
  );
}
