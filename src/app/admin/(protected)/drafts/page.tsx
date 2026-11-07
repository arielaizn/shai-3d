"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/app/admin/_lib/convex";
import { Money } from "@/app/admin/_components/Money";
import {
  DRAFT_STATUS_HE,
  GENERATOR_STEPS_HE,
  relativeHe,
  type DraftStatus,
} from "@/components/admin/format";
import { AdminEmpty, Card, LinkAction, LoadingBlock, PageHeader, Pill } from "@/components/admin/ui";

/**
 * תצורות שנעזבו, 06 §C.7.
 *
 * The drafts table records every configuration anybody built, including the ones
 * that never became a message, so this is the only honest picture of what people
 * actually want. Sorting is "closest to finishing" rather than newest: somebody
 * who reached the price screen and stopped is worth more attention than somebody
 * who picked a print type and left.
 *
 * The cards show the RENDER and never the customer's own photo. The photo belongs
 * to a person who did not send it anywhere, and a wall of strangers' family
 * pictures is not what this screen is for.
 */
export default function DraftsPage() {
  const [status, setStatus] = React.useState<DraftStatus | "all">("all");
  const drafts = useQuery(api.drafts.listAdmin, {
    status: status === "all" ? undefined : status,
    limit: 100,
  });
  const funnel = useQuery(api.drafts.funnel, { days: 30 });

  const rows = React.useMemo(
    () =>
      [...(drafts ?? [])].sort(
        (a, b) => b.furthestStep - a.furthestStep || b.updatedAt - a.updatedAt,
      ),
    [drafts],
  );

  /* the biggest drop between two steps, which is the sentence under the bars */
  const steps = funnel ?? [];
  const top = steps[0]?.reached ?? 0;
  let worstIndex = -1;
  let worstDrop = 0;
  for (let index = 1; index < steps.length; index += 1) {
    const drop = steps[index - 1].reached - steps[index].reached;
    if (drop > worstDrop) {
      worstDrop = drop;
      worstIndex = index;
    }
  }

  return (
    <>
      <PageHeader
        title="תצורות שנעזבו"
        helpHe="כל מי שהתחיל להרכיב משהו במחולל, גם מי שלא סיים."
      />

      <div className="a-stack">
        {steps.length > 0 && top > 0 ? (
          <Card title="איפה אנשים עוצרים" helpHe="30 הימים האחרונים">
            <div className="a-stack" style={{ gap: "0.5rem" }}>
              {steps.map((step, index) => (
                <div key={step.step} className="a-barrow">
                  <span>{`${step.step}. ${GENERATOR_STEPS_HE[index] ?? ""}`}</span>
                  <span className="a-bar" data-tone={index === worstIndex ? "red" : undefined}>
                    <span style={{ inlineSize: `${Math.round((step.reached / top) * 100)}%` }} />
                  </span>
                  <span className="a-num">
                    <bdi dir="ltr">{step.reached}</bdi>
                  </span>
                </div>
              ))}
            </div>
            {worstIndex > 0 ? (
              <p className="a-muted" style={{ marginBlockStart: "0.75rem" }}>
                {`הכי הרבה אנשים עוזבים בשלב ${GENERATOR_STEPS_HE[worstIndex] ?? ""}.`}
              </p>
            ) : null}
          </Card>
        ) : null}

        <div className="a-chips" role="group" aria-label="סינון לפי מצב">
          {(
            [
              ["all", "הכל"],
              ["building", DRAFT_STATUS_HE.building],
              ["previewed", DRAFT_STATUS_HE.previewed],
              ["abandoned", DRAFT_STATUS_HE.abandoned],
              ["submitted", DRAFT_STATUS_HE.submitted],
            ] as [DraftStatus | "all", string][]
          ).map(([value, labelHe]) => (
            <button
              key={value}
              type="button"
              className="a-chip"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {labelHe}
            </button>
          ))}
        </div>

        {drafts === undefined ? <LoadingBlock rows={3} /> : null}

        {drafts !== undefined && rows.length === 0 ? (
          <AdminEmpty
            titleHe="אף אחד לא בנה כלום ב-30 הימים האחרונים."
            bodyHe="ברגע שמישהו יתחיל להרכיב משהו, התצורה שלו תופיע כאן גם אם לא סיים."
            illustration="leads"
            action={
              <LinkAction href="/" tone="quiet" external>
                לפתוח את האתר
              </LinkAction>
            }
          />
        ) : null}

        <ul className="a-list">
          {rows.map((draft) => (
            <li key={draft._id} className="a-item" style={{ alignItems: "flex-start" }}>
              {draft.previewSnapshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="a-thumb" src={draft.previewSnapshotUrl} alt="" />
              ) : (
                <span className="a-thumb" aria-hidden="true" />
              )}

              <div className="a-grow" style={{ minInlineSize: 0 }}>
                <div className="a-row">
                  <Link href={`/admin/drafts/${draft._id}`} className="a-grow">
                    {draft.printTypeNameHe ?? "עוד בלי סוג הדפסה"}
                  </Link>
                  {draft.leadId ? (
                    <Pill tone="done">שלח הודעה</Pill>
                  ) : (
                    <Pill tone={draft.status === "abandoned" ? "off" : "work"}>
                      {DRAFT_STATUS_HE[draft.status]}
                    </Pill>
                  )}
                </div>

                <p className="a-muted">
                  {`הגיע לשלב ${draft.furthestStep} מתוך 6`}
                  {draft.hasPhoto ? " · עם תמונה" : ""}
                  {` · ${relativeHe(draft.updatedAt)}`}
                </p>

                <span className="a-bar" style={{ maxInlineSize: "14rem" }}>
                  <span style={{ inlineSize: `${Math.round((draft.furthestStep / 6) * 100)}%` }} />
                </span>

                {draft.priceAgorot !== null ? (
                  <div style={{ marginBlockStart: "0.375rem" }}>
                    <Money agorot={draft.priceAgorot} strong announce={false} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
