import * as React from "react";

import { CONTACT } from "@/content/contact";

import { Card, CardHeading } from "./Card";

/**
 * When Shai is actually at the printer, 09c §9.6.
 *
 * These are a thirteen year old's hours after school, which is the whole reason the
 * response line sits directly under them: a visitor who writes at 21:40 on a Tuesday
 * should already know why the answer arrives in the morning, instead of deciding for
 * themselves that nobody is reading.
 *
 * [`שבת סגור` is specified as ink at 50 percent. It ships in `--color-text-muted`
 * instead: ink at 50 percent over cream measures about 3.6:1, and this is 17px body
 * text that has to clear 4.5:1. The line still steps back from the two above it,
 * which is what the spec was buying. Flagged in the return.]
 *
 * [אריאל: לאשר את השעות מול ההורים. אלה שעות של ילד אחרי בית ספר, והן חייבות להיות אמיתיות]
 */

const CLOSED_LINE_INDEX = 2;

export function HoursCard() {
  return (
    <Card className="gap-4">
      <CardHeading>{CONTACT.hours.heading}</CardHeading>

      <ul className="flex flex-col gap-1.5 [min-inline-size:0]">
        {CONTACT.hours.lines.map((line, index) => (
          <li
            key={line}
            className="[min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              color:
                index === CLOSED_LINE_INDEX
                  ? "var(--color-text-muted)"
                  : "var(--color-text-primary)",
            }}
          >
            {line}
          </li>
        ))}
      </ul>

      <span
        aria-hidden="true"
        className="block"
        style={{
          inlineSize: "4rem",
          blockSize: "3px",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--color-turq-500)",
        }}
      />

      <p
        className="[min-inline-size:0]"
        style={{
          fontFamily: "var(--font-assistant), system-ui, sans-serif",
          fontSize: "1rem",
          lineHeight: 1.7,
          color: "var(--color-text-secondary)",
          maxInlineSize: "38ch",
        }}
      >
        {CONTACT.hours.response}
      </p>
    </Card>
  );
}
