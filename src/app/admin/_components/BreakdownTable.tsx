"use client";

import type { PriceBreakdown } from "@/app/admin/_lib/engine";
import { Money, MoneySigned } from "./Money";

/**
 * The arithmetic behind one price, exactly as the customer saw it.
 *
 * It reads `displayAgorot` and not `amountAgorot`: the engine rounds each row to
 * whole shekels for the screen and lets the `rounding` row absorb the remainder,
 * so the printed column adds up to the printed total. Reading the exact amounts
 * here would print a column that does not sum, which is the one thing a price
 * breakdown must never do.
 */
export function BreakdownTable({
  breakdown,
  caption,
}: {
  breakdown: PriceBreakdown;
  caption?: string;
}) {
  return (
    <div className="a-scroll-x">
      <table className="a-table">
        {caption ? <caption className="a-muted" style={{ textAlign: "start", paddingBlockEnd: "0.5rem" }}>{caption}</caption> : null}
        <tbody>
          {breakdown.lines.map((line, index) => (
            <tr key={`${line.key}-${line.id ?? index}`}>
              <th scope="row" style={{ fontWeight: 400, color: "var(--admin-ink)" }}>
                {line.labelHe}
                {line.hintHe ? (
                  <span className="a-hint" style={{ display: "block" }}>
                    {line.hintHe}
                  </span>
                ) : null}
              </th>
              <td style={{ textAlign: "end" }}>
                {line.displayAgorot < 0 ? (
                  <MoneySigned agorot={line.displayAgorot} />
                ) : (
                  <Money agorot={line.displayAgorot} announce={false} />
                )}
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row" style={{ fontWeight: 700, color: "var(--admin-ink)" }}>
              סך הכול
            </th>
            <td style={{ textAlign: "end" }}>
              <Money agorot={breakdown.totalAgorot} strong />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** The grams and hours line under a breakdown. Shai's numbers, not the customer's. */
export function BreakdownFacts({ breakdown }: { breakdown: PriceBreakdown }) {
  return (
    <p className="a-muted a-num">
      חומר <bdi dir="ltr">{Math.round(breakdown.grams)}</bdi> גרם · הדפסה{" "}
      <bdi dir="ltr">{breakdown.hours.toFixed(1)}</bdi> שעות · גרסת מחירון{" "}
      <bdi dir="ltr">{breakdown.configVersion}</bdi>
    </p>
  );
}
