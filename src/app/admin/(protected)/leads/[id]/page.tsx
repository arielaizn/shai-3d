"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api, type Id } from "@/app/admin/_lib/convex";
import { BreakdownFacts, BreakdownTable } from "@/app/admin/_components/BreakdownTable";
import { Money } from "@/app/admin/_components/Money";
import { DangerDialog } from "@/components/admin/Dialogs";
import {
  LEAD_FLOW,
  LEAD_STATUS_HE,
  dateHe,
  fromDateInput,
  leadStatusTone,
  relativeHe,
  toDateInput,
  type LeadStatus,
} from "@/components/admin/format";
import { errorHe, V } from "@/components/admin/messages";
import { useToast } from "@/components/admin/Toast";
import { customerWaUrl, leadOpenerHe } from "@/components/admin/waOut";
import {
  ActionButton,
  Card,
  Field,
  HelpNote,
  LoadingBlock,
  MoneyField,
  PageHeader,
  Pill,
  TextAreaField,
  TextField,
} from "@/components/admin/ui";

/**
 * פנייה אחת, 06 §C.6.
 *
 * Right column is the story, left column is the work. On a phone they stack in
 * that order, which is the order a phone call goes in: who it is, what they
 * wanted, then what it costs and what happens next.
 *
 * Two things this screen does NOT do, on purpose:
 *   it never edits `priceAgorot`. The engine's answer is the record of what the
 *   site promised; a corrected price is a second field with a reason beside it.
 *   it never deletes. A customer record is archived, never erased (06 §A.3).
 */
/** `12 × 17 × 0.6 ס״מ`, which is how Shai thinks about a piece on the shelf. */
function formatMm(mm: { x: number; y: number; z: number }): string {
  const cm = (value: number) => (value / 10).toFixed(1).replace(/\.0$/, "");
  return `${cm(mm.x)} × ${cm(mm.y)} × ${cm(mm.z)} ס״מ`;
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"leads">;
  const toast = useToast();

  const data = useQuery(api.leads.get, { id });
  const setStatus = useMutation(api.leads.setStatus);
  const setNotes = useMutation(api.leads.setNotes);
  const setOverride = useMutation(api.leads.setOverridePrice);
  const setDueDate = useMutation(api.leads.setDueDate);
  const setPinned = useMutation(api.leads.setPinned);
  const archive = useMutation(api.leads.archive);
  const unarchive = useMutation(api.leads.unarchive);
  const addToGallery = useMutation(api.gallery.createFromLead);

  const lead = data?.lead;

  /* --- internal notes autosave, 800ms (06 §C.19) --- */
  const [notes, setNotes_] = React.useState<string | null>(null);
  const [notesSaved, setNotesSaved] = React.useState(false);
  const notesValue = notes ?? lead?.internalNotesHe ?? "";

  React.useEffect(() => {
    if (notes === null || !lead) return;
    if (notes === (lead.internalNotesHe ?? "")) return;
    const timer = window.setTimeout(() => {
      void setNotes({ id, internalNotesHe: notes })
        .then(() => setNotesSaved(true))
        .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [notes, lead, id, setNotes, toast]);

  /* --- corrected price --- */
  const [override, setOverrideAgorot] = React.useState<number | null>(null);
  const [reason, setReason] = React.useState("");

  /* --- lost --- */
  const [lostOpen, setLostOpen] = React.useState(false);
  const [lostReason, setLostReason] = React.useState("");

  /* --- gallery --- */
  const [galleryAlt, setGalleryAlt] = React.useState("");
  const imageRef = React.useRef<HTMLImageElement | null>(null);

  if (data === undefined) return <LoadingBlock rows={4} />;
  if (data === null || !lead) {
    return (
      <>
        <PageHeader title="לא מצאתי את הפנייה" backHref="/admin/leads" backLabelHe="לרשימה" />
        <Card>
          <p className="a-muted">אולי הקישור ישן. הרשימה עצמה תמיד מעודכנת.</p>
        </Card>
      </>
    );
  }

  const snapshot = lead.configSnapshot;
  const phone = lead.phone ?? "";
  const waUrl = phone ? customerWaUrl(phone, leadOpenerHe(lead.publicCode)) : null;
  const shownAgorot = lead.priceOverrideAgorot ?? lead.priceAgorot;

  async function moveTo(next: LeadStatus, noteHe?: string) {
    const from = lead!.status;
    try {
      await setStatus({ id, status: next, noteHe });
      toast.show(`עבר ל${LEAD_STATUS_HE[next]}`, {
        undo: async () => {
          await setStatus({ id, status: from });
        },
      });
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    }
  }

  return (
    <>
      <PageHeader
        title={snapshot?.printTypeLabelHe || "פנייה"}
        helpHe={`${relativeHe(lead.createdAt)} · קוד ${lead.publicCode}`}
        backHref="/admin/leads"
        backLabelHe="לכל הפניות"
        actions={
          <>
            <ActionButton
              size="sm"
              tone="quiet"
              onClick={() => void setPinned({ id, pinned: !lead.pinned })}
            >
              {lead.pinned ? "לבטל הצמדה" : "להצמיד"}
            </ActionButton>
            <ActionButton
              size="sm"
              tone="quiet"
              onClick={() => {
                void (lead.archivedAt ? unarchive({ id }) : archive({ id }));
              }}
            >
              {lead.archivedAt ? "להחזיר מהארכיון" : "לארכיון"}
            </ActionButton>
          </>
        }
      />

      <div className="a-two" data-weight="wide-start">
        {/* ---------------------------------------------------- the story */}
        <div className="a-col">
          <Card title="מי זה">
            <div className="a-stack">
              <div className="a-row" style={{ flexWrap: "wrap" }}>
                <Pill tone={leadStatusTone(lead.status)}>{LEAD_STATUS_HE[lead.status]}</Pill>
                {lead.name ? <strong>{lead.name}</strong> : null}
                {phone ? (
                  <a href={`tel:${phone}`} className="a-num">
                    <bdi dir="ltr">{phone}</bdi>
                  </a>
                ) : null}
              </div>

              {waUrl ? (
                <a className="a-btn" data-tone="primary" href={waUrl} target="_blank" rel="noreferrer">
                  לפתוח וואטסאפ
                </a>
              ) : (
                <p className="a-muted">
                  אין מספר שמור. הפנייה הגיעה מהאתר, והשיחה נפתחה אצלך בוואטסאפ מהמכשיר של הלקוח.
                </p>
              )}
            </div>
          </Card>

          {data.photoUrl ? (
            <Card title="התמונה שהלקוח העלה">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                className="a-photo"
                src={data.photoUrl}
                alt="התמונה שהלקוח העלה להזמנה"
              />
            </Card>
          ) : null}

          {data.previewSnapshotUrl ? (
            <Card
              title="התצוגה שהלקוח ראה"
              helpHe="הצילום של התצוגה התלת ממדית ברגע ששלח את ההודעה."
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="a-photo"
                src={data.previewSnapshotUrl}
                alt="תצוגה מקדימה של ההדפסה כפי שהלקוח ראה אותה"
              />
            </Card>
          ) : null}

          {data.modelFileUrls.length > 0 ? (
            <Card
              title="הקובץ להדפסה"
              helpHe="נבנה מהתמונה של הלקוח בדפדפן שלו, במילימטרים, מוכן לסלייסר."
            >
              <div className="a-stack">
                {data.modelFileUrls.map((file) =>
                  file.url ? (
                    <a
                      key={file.format}
                      className="a-file"
                      href={file.url}
                      download={`shai-3d-${lead.publicCode}.${file.format}`}
                    >
                      <span className="a-file-name">
                        {file.format === "stl" ? "STL להדפסה" : "PLY עם הצבעים"}
                      </span>
                      <span className="a-num">
                        {formatMm(file.boundingMm)} · {file.triangles.toLocaleString("he-IL")}{" "}
                        משולשים · {Math.round(file.bytes / 1024).toLocaleString("he-IL")}KB
                      </span>
                    </a>
                  ) : null,
                )}
              </div>
              <HelpNote>
                ה-STL הוא מה שנכנס לסלייסר. ה-PLY נושא את הצבע של כל נקודה, וטוב לראות בו
                איפה עוברות שכבות הצבע לפני שמגדירים החלפות.
              </HelpNote>
            </Card>
          ) : null}

          {snapshot ? (
            <Card title="מה הוא ביקש">
              <dl className="a-kv">
                <dt>סוג</dt>
                <dd>{snapshot.printTypeLabelHe}</dd>
                <dt>גודל</dt>
                <dd>
                  {snapshot.sizeLabelHe}
                  {snapshot.sizeMm ? (
                    <span className="a-muted"> · <bdi dir="ltr">{snapshot.sizeMm}</bdi></span>
                  ) : null}
                </dd>
                <dt>חומר</dt>
                <dd>{snapshot.materialLabelHe}</dd>
                <dt>צבעים</dt>
                <dd>
                  <div className="a-row" style={{ flexWrap: "wrap", gap: "0.375rem" }}>
                    {snapshot.colors.map((color, index) => (
                      <span key={index} className="a-pill">
                        <span
                          aria-hidden="true"
                          className="a-dot"
                          style={{ backgroundColor: color.hex }}
                        />
                        {color.nameHe}
                      </span>
                    ))}
                    {snapshot.colors.length === 0 ? <span className="a-muted">בלי בחירה</span> : null}
                  </div>
                </dd>
                <dt>כמות</dt>
                <dd>
                  <bdi dir="ltr">{snapshot.quantity}</bdi>
                </dd>
                <dt>מסירה</dt>
                <dd>{snapshot.deliveryLabelHe}</dd>
                {snapshot.neededByHe ? (
                  <>
                    <dt>עד מתי</dt>
                    <dd>
                      <bdi dir="ltr">{snapshot.neededByHe}</bdi>
                    </dd>
                  </>
                ) : null}
                {snapshot.addonLabelsHe.length > 0 ? (
                  <>
                    <dt>תוספות</dt>
                    <dd>{snapshot.addonLabelsHe.join(", ")}</dd>
                  </>
                ) : null}
              </dl>

              {snapshot.noteHe ? (
                <blockquote className="a-quote" style={{ marginBlockStart: "0.75rem" }}>
                  {snapshot.noteHe}
                </blockquote>
              ) : null}
            </Card>
          ) : null}

          <Card
            title="להוסיף לגלריה"
            helpHe={
              lead.photoShareConsent
                ? "הלקוח אישר להציג את התמונה באתר."
                : V.noConsent
            }
          >
            {lead.photoShareConsent ? (
              <div className="a-stack">
                <TextField
                  label="מה רואים בתמונה"
                  hint="המשפט הזה הוא מה שקורא המסך יקריא"
                  value={galleryAlt}
                  onChange={setGalleryAlt}
                />
                <ActionButton
                  tone="primary"
                  disabled={galleryAlt.trim() === ""}
                  onClick={() => {
                    const node = imageRef.current;
                    void addToGallery({
                      leadId: id,
                      titleHe: snapshot?.printTypeLabelHe ?? "הדפסה",
                      imageAltHe: galleryAlt.trim(),
                      width: node?.naturalWidth ?? 1200,
                      height: node?.naturalHeight ?? 1200,
                    })
                      .then(() => {
                        setGalleryAlt("");
                        toast.show("נוסף לגלריה");
                      })
                      .catch((thrown: unknown) =>
                        toast.show(errorHe(thrown), { tone: "error" }),
                      );
                  }}
                >
                  להוסיף לגלריה
                </ActionButton>
              </div>
            ) : null}
          </Card>
        </div>

        {/* ----------------------------------------------------- the work */}
        <div className="a-col">
          <Card title="המחיר">
            <div className="a-row" style={{ marginBlockEnd: "0.75rem", flexWrap: "wrap" }}>
              <Money agorot={shownAgorot} big />
              {lead.priceOverrideAgorot !== undefined ? (
                <span className="a-muted">
                  <s>
                    <Money agorot={lead.priceAgorot} announce={false} tone="muted" />
                  </s>
                </span>
              ) : null}
            </div>

            {lead.breakdown ? (
              <>
                <BreakdownTable breakdown={lead.breakdown} />
                <BreakdownFacts breakdown={lead.breakdown} />
              </>
            ) : (
              <p className="a-muted">אין פירוט מחיר לפנייה הזאת. היא נפתחה ידנית.</p>
            )}
          </Card>

          <Card
            title="מחיר מתוקן"
            helpHe="מה שבאמת סיכמתם. המחיר שהאתר חישב נשאר רשום מתחת."
          >
            <div className="a-stack">
              <MoneyField
                label="הסכום שסיכמת"
                agorot={override ?? lead.priceOverrideAgorot ?? lead.priceAgorot}
                onChange={setOverrideAgorot}
              />
              <TextField
                label="למה"
                hint="שורה קצרה שתזכיר לך בעוד חודש"
                value={reason || lead.overrideReasonHe || ""}
                onChange={setReason}
              />
              <ActionButton
                tone="primary"
                disabled={override === null || reason.trim() === ""}
                onClick={() => {
                  if (override === null) return;
                  void setOverride({
                    id,
                    priceOverrideAgorot: override,
                    overrideReasonHe: reason.trim(),
                  })
                    .then(() => toast.show(V.saved))
                    .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
                }}
              >
                לשמור מחיר מתוקן
              </ActionButton>
            </div>
          </Card>

          <Card title="איפה זה עומד">
            <div className="a-chips" role="group" aria-label="מצב הפנייה">
              {LEAD_FLOW.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="a-chip"
                  aria-pressed={lead.status === status}
                  onClick={() => void moveTo(status)}
                >
                  {LEAD_STATUS_HE[status]}
                </button>
              ))}
            </div>
            <div className="a-row" style={{ marginBlockStart: "0.75rem" }}>
              <ActionButton tone="danger" size="sm" onClick={() => setLostOpen(true)}>
                לסמן שלא יצא
              </ActionButton>
            </div>

            {lead.statusHistory.length > 0 ? (
              <ul className="a-list" style={{ marginBlockStart: "1rem" }}>
                {[...lead.statusHistory].reverse().slice(0, 6).map((entry, index) => (
                  <li key={index} className="a-muted">
                    {LEAD_STATUS_HE[entry.status as LeadStatus] ?? entry.status} ·{" "}
                    {relativeHe(entry.at)}
                    {entry.noteHe ? ` · ${entry.noteHe}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card title="תאריך יעד">
            <Field label="עד מתי צריך להיות מוכן" htmlFor="lead-due">
              <input
                id="lead-due"
                className="a-input"
                type="date"
                dir="ltr"
                value={toDateInput(lead.dueDate)}
                onChange={(event) => {
                  void setDueDate({ id, dueDate: fromDateInput(event.target.value) }).catch(
                    (thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }),
                  );
                }}
              />
            </Field>
            {lead.dueDate ? <p className="a-muted">{dateHe(lead.dueDate)}</p> : null}
          </Card>

          <Card title="הערות לעצמך" helpHe="נשמר לבד תוך כדי כתיבה. הלקוח לא רואה את זה.">
            <TextAreaField
              label="הערות"
              value={notesValue}
              onChange={(value) => {
                setNotesSaved(false);
                setNotes_(value);
              }}
              rows={4}
            />
            {notesSaved ? (
              <p style={{ color: "var(--admin-turquoise-ink)" }} role="status">
                {V.saved}
              </p>
            ) : null}
          </Card>
        </div>
      </div>

      <DangerDialog
        open={lostOpen}
        titleHe="לסמן שההזמנה הזאת לא יצאה?"
        bodyHe="היא תישאר ברשימה עם הסימון הזה, ואפשר להחזיר אותה בכל רגע."
        confirmHe="לסמן שלא יצא"
        onCancel={() => setLostOpen(false)}
        onConfirm={() => {
          setLostOpen(false);
          void moveTo("lost", lostReason.trim() || undefined);
          setLostReason("");
        }}
      />
    </>
  );
}
