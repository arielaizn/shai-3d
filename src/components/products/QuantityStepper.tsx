"use client";

import * as React from "react";

import { PRODUCT } from "@/content/products";

import { MinusGlyph, PlusGlyph } from "./glyphs";

/**
 * Doc 03 §5.4. Minimum one, maximum 25, and above 25 the control stops pretending.
 *
 * The ceiling is not a validation rule, it is an honest one: 26 identical prints is a
 * production run for a boy with one printer, and it needs a conversation and a
 * different price rather than a number in a field. So at the top of the range the line
 * `לכמות גדולה יותר כותבים לי ואני בונה מחיר.` appears under the stepper and the plus
 * button is genuinely unavailable, with the reason stated in text beside it rather
 * than left to a disabled cursor.
 *
 * The value is a `<output>` and the group carries `aria-live="polite"`, so pressing
 * plus announces the new number. `tabular-nums` keeps 9 and 10 the same width, or the
 * two buttons shuffle sideways under the thumb that is pressing them.
 */

export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 25;

export type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  labelId: string;
};

export function QuantityStepper({ value, onChange, labelId }: QuantityStepperProps) {
  const atMin = value <= QUANTITY_MIN;
  const atMax = value >= QUANTITY_MAX;

  return (
    <div className="flex flex-col gap-2 [min-inline-size:0]">
      <div
        className="inline-flex items-center gap-1 self-start rounded-full p-1 [min-inline-size:0]"
        style={{
          borderWidth: "3px",
          borderColor: "var(--color-cream-400)",
          backgroundColor: "var(--color-cream-50)",
        }}
      >
        <StepButton
          label={PRODUCT.quantity.decAria}
          disabled={atMin}
          onPress={() => onChange(Math.max(QUANTITY_MIN, value - 1))}
        >
          <MinusGlyph size={18} />
        </StepButton>

        <output
          aria-labelledby={labelId}
          aria-live="polite"
          className="inline-flex min-w-10 justify-center tabular-nums"
          style={{
            fontFamily: "var(--font-rubik), system-ui, sans-serif",
            fontSize: "1.125rem",
            fontWeight: 800,
            color: "var(--color-ink-900)",
          }}
        >
          {value}
        </output>

        <StepButton
          label={PRODUCT.quantity.incAria}
          disabled={atMax}
          onPress={() => onChange(Math.min(QUANTITY_MAX, value + 1))}
        >
          <PlusGlyph size={18} />
        </StepButton>
      </div>

      {atMax ? (
        <p
          className="[min-inline-size:0]"
          style={{
            fontFamily: "var(--font-assistant), system-ui, sans-serif",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            color: "var(--color-text-muted)",
            maxInlineSize: "32ch",
          }}
        >
          {PRODUCT.quantity.max}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Doc 07 §8.1: an unavailable control does not shake, wobble or flash when pressed. It
 * simply stops responding, and the reason is written next to it. Half the visitors here
 * are children and a shake reads as a scolding.
 */
function StepButton({
  children,
  label,
  disabled,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full transition duration-140 ease-toy disabled:cursor-not-allowed"
      style={{
        backgroundColor: disabled ? "transparent" : "var(--color-cream-200)",
        color: disabled ? "var(--color-text-disabled)" : "var(--color-ink-900)",
      }}
    >
      {children}
    </button>
  );
}
