"use client";

import * as React from "react";

import { Money, DeltaChip } from "./Money";
import {
  SAMPLE_INPUTS,
  percentDelta,
  priceSample,
  type PriceBreakdown,
  type PriceEngineConfig,
  type SampleInput,
} from "@/app/admin/_lib/engine";

/**
 * מעבדת מחיר, 06 §C.12. The panel that makes the pricing screen safe.
 *
 * Two columns, `עכשיו באתר` against `אחרי השינוי`, one row per breakdown line,
 * and a six bar chart underneath so a change that helps one configuration and
 * ruins another is visible in one glance rather than one at a time.
 *
 * Nothing in here writes anything. Both columns are `computePrice` from
 * `convex/lib/priceEngine.ts`, the same module the server runs, called on two
 * configurations: the one that is live and the one being edited.
 */

export type LabProps = {
  beforeConfig: PriceEngineConfig;
  afterConfig: PriceEngineConfig;
  /** the sample pills, the last of which may be a real visitor configuration */
  samples: SampleInput[];
  /** what the server says the live price of the selected sample is, when known */
  serverAgorot?: number | null;
};

type Row = { key: string; labelHe: string; before?: number; after?: number };

function rowsOf(before: PriceBreakdown | null, after: PriceBreakdown | null): Row[] {
  const rows = new Map<string, Row>();
  const add = (breakdown: PriceBreakdown | null, side: "before" | "after") => {
    for (const line of breakdown?.lines ?? []) {
      const key = `${line.key}:${line.id ?? ""}`;
      const row = rows.get(key) ?? { key, labelHe: line.labelHe };
      row[side] = line.displayAgorot;
      rows.set(key, row);
    }
  };
  add(before, "before");
  add(after, "after");
  return [...rows.values()];
}

export function PriceLab({ beforeConfig, afterConfig, samples, serverAgorot }: LabProps) {
  const [index, setIndex] = React.useState(0);
  const sample = samples[Math.min(index, samples.length - 1)];

  const before = sample ? priceSample(sample, beforeConfig) : null;
  const after = sample ? priceSample(sample, afterConfig) : null;
  const beforeBreakdown = before?.ok ? before.breakdown : null;
  const afterBreakdown = after?.ok ? after.breakdown : null;

  const rows = rowsOf(beforeBreakdown, afterBreakdown);
  const delta =
    beforeBreakdown && afterBreakdown
      ? percentDelta(beforeBreakdown.totalAgorot, afterBreakdown.totalAgorot)
      : null;

  const chart = SAMPLE_INPUTS.map((entry) => {
    const a = priceSample(entry, beforeConfig);
    const b = priceSample(entry, afterConfig);
    return {
      labelHe: entry.labelHe,
      before: a.ok ? a.breakdown.totalAgorot : null,
      after: b.ok ? b.breakdown.totalAgorot : null,
    };
  }).filter((entry) => entry.before !== null || entry.after !== null);

  const peak = Math.max(
    1,
    ...chart.map((entry) => Math.max(entry.before ?? 0, entry.after ?? 0)),
  );

  return (
    <div className="a-stack">
      <div className="a-chips" role="group" aria-label="דוגמאות">
        {samples.map((entry, at) => (
          <button
            key={entry.labelHe}
            type="button"
            className="a-chip"
            aria-pressed={at === index}
            onClick={() => setIndex(at)}
          >
            {entry.labelHe}
          </button>
        ))}
      </div>

      {after && !after.ok ? (
        <p className="a-error">{after.messageHe}</p>
      ) : (
        <div className="a-scroll-x">
          <table className="a-table">
            <thead>
              <tr>
                <th scope="col">שורה</th>
                <th scope="col" style={{ textAlign: "end" }}>
                  עכשיו באתר
                </th>
                <th scope="col" style={{ textAlign: "end" }}>
                  אחרי השינוי
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" style={{ fontWeight: 400, color: "var(--admin-ink)" }}>
                    {row.labelHe}
                  </th>
                  <td style={{ textAlign: "end" }}>
                    {row.before === undefined ? (
                      <span className="a-muted">·</span>
                    ) : (
                      <Money agorot={row.before} announce={false} tone="muted" />
                    )}
                  </td>
                  <td style={{ textAlign: "end" }}>
                    {row.after === undefined ? (
                      <span className="a-muted">·</span>
                    ) : (
                      <Money agorot={row.after} announce={false} />
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row" style={{ fontWeight: 700, color: "var(--admin-ink)" }}>
                  סך הכול
                </th>
                <td style={{ textAlign: "end" }}>
                  {beforeBreakdown ? (
                    <Money agorot={beforeBreakdown.totalAgorot} announce={false} tone="muted" />
                  ) : null}
                </td>
                <td style={{ textAlign: "end" }}>
                  {afterBreakdown ? (
                    <Money agorot={afterBreakdown.totalAgorot} strong live />
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="a-row">
        <span className="a-grow" />
        <DeltaChip percent={delta} />
      </div>

      {serverAgorot !== null && serverAgorot !== undefined ? (
        <p className="a-muted">
          מה שהאתר גובה עכשיו על הדוגמה הזאת, לפי השרת:{" "}
          <Money agorot={serverAgorot} strong announce={false} />
        </p>
      ) : null}

      <div className="a-stack" style={{ gap: "0.5rem" }}>
        {chart.map((entry) => (
          <div key={entry.labelHe} className="a-barrow">
            <span style={{ fontSize: "0.8125rem" }}>{entry.labelHe}</span>
            <span style={{ display: "grid", gap: "0.125rem", minInlineSize: 0 }}>
              <span className="a-bar">
                <span
                  style={{
                    inlineSize: `${Math.round(((entry.before ?? 0) / peak) * 100)}%`,
                    backgroundColor: "var(--admin-line-strong)",
                  }}
                />
              </span>
              <span className="a-bar">
                <span
                  style={{ inlineSize: `${Math.round(((entry.after ?? 0) / peak) * 100)}%` }}
                />
              </span>
            </span>
            <DeltaChip percent={percentDelta(entry.before ?? 0, entry.after ?? 0)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The one line the phone bar shows when the lab is collapsed. */
export function labSummary(
  sample: SampleInput | undefined,
  beforeConfig: PriceEngineConfig,
  afterConfig: PriceEngineConfig,
): { labelHe: string; before: number | null; after: number | null; percent: number | null } {
  if (!sample) return { labelHe: "", before: null, after: null, percent: null };
  const before = priceSample(sample, beforeConfig);
  const after = priceSample(sample, afterConfig);
  const beforeTotal = before.ok ? before.breakdown.totalAgorot : null;
  const afterTotal = after.ok ? after.breakdown.totalAgorot : null;
  return {
    labelHe: sample.labelHe,
    before: beforeTotal,
    after: afterTotal,
    percent:
      beforeTotal !== null && afterTotal !== null ? percentDelta(beforeTotal, afterTotal) : null,
  };
}
