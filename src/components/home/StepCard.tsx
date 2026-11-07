import * as React from "react";
import Image from "next/image";

/**
 * One step of doc 03 §3.3, with the spot art amendment from doc 08 A04-A06.
 *
 * The numeral is a **graphic and not a string** (09c §3.3): it is `aria-hidden`, it
 * carries no meaning a screen reader needs, and the reading order of the three cards
 * already says which comes first. What a screen reader gets is the title and the body.
 *
 * The spot art appears at 1024px and up only. Doc 08's reasoning is worth keeping:
 * three equal numerals with no object is the one band on the home page that reads
 * like a corporate process diagram, and one small printed object per step fixes it
 * without adding a word of copy.
 */

export type StepCardProps = {
  index: number;
  title: string;
  body: string;
  spotSrc?: string;
  spotAlt?: string;
};

export function StepCard({ index, title, body, spotSrc, spotAlt }: StepCardProps) {
  return (
    <div className="relative flex flex-col items-start gap-2 [min-inline-size:0]">
      {spotSrc ? (
        <div className="relative mb-1 hidden size-28 lg:block [min-inline-size:0]">
          <Image src={spotSrc} alt={spotAlt ?? ""} fill sizes="112px" style={{ objectFit: "contain" }} />
        </div>
      ) : null}

      <span
        aria-hidden="true"
        className="font-[family-name:var(--font-rubik)] leading-none"
        style={{
          fontSize: "3.5rem",
          fontWeight: 900,
          color: "var(--color-yellow-400)",
          // yellow on cream is 1.49:1 and carries no meaning, which is exactly why the
          // numeral is decorative and the step is named in the h3 underneath it
          letterSpacing: "-0.02em",
        }}
      >
        {index}
      </span>

      <h3
        className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "1.375rem",
          fontWeight: 700,
          lineHeight: 1.2,
          color: "var(--color-text-primary)",
        }}
      >
        {title}
      </h3>

      <p
        className="[min-inline-size:0]"
        style={{
          fontFamily: "var(--font-assistant), system-ui, sans-serif",
          fontSize: "0.9375rem",
          lineHeight: 1.7,
          color: "var(--color-text-secondary)",
          maxInlineSize: "28ch",
        }}
      >
        {body}
      </p>
    </div>
  );
}
