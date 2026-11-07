"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api, type Id } from "@/app/admin/_lib/convex";
import { BreakdownFacts, BreakdownTable } from "@/app/admin/_components/BreakdownTable";
import { Money } from "@/app/admin/_components/Money";
import { DangerDialog } from "@/components/admin/Dialogs";
import { DRAFT_STATUS_HE, dateHe, relativeHe } from "@/components/admin/format";
import { errorHe } from "@/components/admin/messages";
import { useToast } from "@/components/admin/Toast";
import { DRAFT_NUDGE_HE, customerWaUrl } from "@/components/admin/waOut";
import { ActionButton, Card, LoadingBlock, PageHeader, Pill } from "@/components/admin/ui";

/**
 * תצורה אחת, 06 §C.7.
 *
 * The lead detail without the customer block: what they built, what it would have
 * cost, and when they stopped. The delete here is a real delete, files and all,
 * and 06 says why that is fine on this one screen: nothing here is a customer
 * record. A draft is somebody's unfinished sentence, and RESOLUTIONS §4 promises
 * it disappears after seven days anyway.
 */
export default function DraftDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"generatorDrafts">;
  const router = useRouter();
  const toast = useToast();

  const data = useQuery(api.drafts.getAdmin, { id });
  const remove = useMutation(api.drafts.deleteDraft);
  const [confirming, setConfirming] = React.useState(false);

  if (data === undefined) return <LoadingBlock rows={4} />;
  if (data === null) {
    return (
      <>
        <PageHeader title="לא מצאתי את התצורה" backHref="/admin/drafts" backLabelHe="לרשימה" />
        <Card>
          <p className="a-muted">
            תצורות נטושות נמחקות אחרי שבעה ימים, יחד עם התמונה. יכול להיות שזאת כבר נמחקה.
          </p>
        </Card>
      </>
    );
  }

  const draft = data.draft;
  const phone = draft.contactPhone ?? "";
  const waUrl = phone ? customerWaUrl(phone, DRAFT_NUDGE_HE) : null;

  return (
    <>
      <PageHeader
        title={data.printTypeNameHe ?? "תצורה בלי סוג הדפסה"}
        helpHe={`${DRAFT_STATUS_HE[draft.status]} · ${relativeHe(draft.updatedAt)}`}
        backHref="/admin/drafts"
        backLabelHe="לכל התצורות"
      />

      <div className="a-two" data-weight="wide-start">
        <div className="a-col">
          <Card title="איפה הוא עצר">
            <div className="a-row" style={{ flexWrap: "wrap" }}>
              <Pill tone={draft.status === "abandoned" ? "off" : "work"}>
                {`שלב ${draft.furthestStep} מתוך 6`}
              </Pill>
              {draft.leadId ? <Pill tone="done">הפך לפנייה</Pill> : null}
            </div>
            <span className="a-bar" style={{ marginBlockStart: "0.75rem" }}>
              <span style={{ inlineSize: `${Math.round((draft.furthestStep / 6) * 100)}%` }} />
            </span>

            {waUrl ? (
              <div className="a-stack" style={{ marginBlockStart: "1rem" }}>
                <a className="a-btn" data-tone="primary" href={waUrl} target="_blank" rel="noreferrer">
                  לשלוח לו הודעה
                </a>
                <p className="a-muted">{DRAFT_NUDGE_HE}</p>
              </div>
            ) : (
              <p className="a-muted" style={{ marginBlockStart: "1rem" }}>
                אין דרך ליצור קשר. זה עדיין עוזר להבין איפה אנשים נתקעים.
              </p>
            )}
          </Card>

          {data.photoUrl ? (
            <Card title="התמונה שהועלתה" helpHe="נמחקת אוטומטית שבעה ימים אחרי שהתצורה נעזבה.">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="a-photo" src={data.photoUrl} alt="התמונה שהועלתה למחולל" />
            </Card>
          ) : null}

          {data.previewSnapshotUrl ? (
            <Card title="התצוגה שהוא ראה">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="a-photo"
                src={data.previewSnapshotUrl}
                alt="תצוגה מקדימה של ההדפסה כפי שנראתה במחולל"
              />
            </Card>
          ) : null}
        </div>

        <div className="a-col">
          <Card title="מה הוא בנה">
            <dl className="a-kv">
              <dt>סוג</dt>
              <dd>{data.printTypeNameHe ?? "עוד לא נבחר"}</dd>
              <dt>חומר</dt>
              <dd>{data.materialNameHe ?? "עוד לא נבחר"}</dd>
              <dt>גודל</dt>
              <dd>{draft.sizeKey ?? "עוד לא נבחר"}</dd>
              <dt>צבעים</dt>
              <dd>{data.colorNames.length > 0 ? data.colorNames.join(", ") : "עוד לא נבחרו"}</dd>
              <dt>כמות</dt>
              <dd>
                <bdi dir="ltr">{draft.quantity}</bdi>
              </dd>
              <dt>מסירה</dt>
              <dd>{draft.deliveryMethod === "pickup" ? "איסוף עצמי" : "משלוח"}</dd>
              <dt>דחוף</dt>
              <dd>{draft.rush ? "כן" : "לא"}</dd>
            </dl>

            {draft.noteHe ? (
              <blockquote className="a-quote" style={{ marginBlockStart: "0.75rem" }}>
                {draft.noteHe}
              </blockquote>
            ) : null}
          </Card>

          <Card title="המחיר שהוא ראה">
            {draft.breakdown ? (
              <>
                <div style={{ marginBlockEnd: "0.75rem" }}>
                  <Money agorot={draft.breakdown.totalAgorot} big />
                </div>
                <BreakdownTable breakdown={draft.breakdown} />
                <BreakdownFacts breakdown={draft.breakdown} />
              </>
            ) : (
              <p className="a-muted">הוא עזב לפני שהמחיר חושב.</p>
            )}
          </Card>

          <Card title="מתי">
            <dl className="a-kv">
              <dt>נפתח</dt>
              <dd>{dateHe(draft.createdAt)}</dd>
              <dt>שינוי אחרון</dt>
              <dd>{relativeHe(draft.updatedAt)}</dd>
              <dt>נראה לאחרונה</dt>
              <dd>{relativeHe(draft.lastSeenAt)}</dd>
              {draft.referrer ? (
                <>
                  <dt>הגיע מ</dt>
                  <dd>
                    <bdi dir="ltr">{draft.referrer}</bdi>
                  </dd>
                </>
              ) : null}
              {draft.utm?.source ? (
                <>
                  <dt>קמפיין</dt>
                  <dd>
                    <bdi dir="ltr">
                      {[draft.utm.source, draft.utm.medium, draft.utm.campaign]
                        .filter(Boolean)
                        .join(" / ")}
                    </bdi>
                  </dd>
                </>
              ) : null}
              {draft.userAgent ? (
                <>
                  <dt>מכשיר</dt>
                  <dd>
                    <bdi dir="ltr">{draft.userAgent}</bdi>
                  </dd>
                </>
              ) : null}
            </dl>
          </Card>

          <Card title="מחיקה" helpHe="מוחק את השורה ואת הקבצים שלה מיד, בלי פח.">
            <ActionButton tone="danger" onClick={() => setConfirming(true)}>
              למחוק תצורה
            </ActionButton>
          </Card>
        </div>
      </div>

      <DangerDialog
        open={confirming}
        titleHe="למחוק את התצורה הזאת?"
        bodyHe="התמונה והתצוגה נמחקות איתה, ואי אפשר לשחזר."
        confirmHe="למחוק"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void remove({ id })
            .then(() => {
              toast.show("נמחק");
              router.push("/admin/drafts");
            })
            .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
        }}
      />
    </>
  );
}
