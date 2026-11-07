"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api, type Doc, type Id } from "@/app/admin/_lib/convex";
import { CONTACT_STATUS_HE, dateHe, relativeHe, type ContactStatus } from "@/components/admin/format";
import { errorHe, V } from "@/components/admin/messages";
import { useToast } from "@/components/admin/Toast";
import { customerWaUrl } from "@/components/admin/waOut";
import {
  ActionButton,
  AdminEmpty,
  Card,
  LoadingBlock,
  PageHeader,
  Pill,
  TextAreaField,
} from "@/components/admin/ui";

/**
 * הודעות, 06 §C.16.
 *
 * Opening a message marks it read after a second and a half on screen, which is
 * long enough that scrolling past a card does not count as reading it.
 *
 * "הפוך לפנייה" exists so a conversation that started as a question lands in the
 * same pipeline as everything else instead of living in a second inbox.
 */

type Message = Doc<"contactMessages">;

const OPENER_HE = "היי, זה שי. קיבלתי את ההודעה שלך מהאתר.";

function MessageCard({ message }: { message: Message }) {
  const router = useRouter();
  const toast = useToast();
  const setStatus = useMutation(api.contact.setStatus);
  const setNotes = useMutation(api.contact.setNotes);
  const convert = useMutation(api.contact.convertToLead);

  const [open, setOpen] = React.useState(false);
  const [notes, setNotesValue] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  /* 06 §C.16: read after 1.5 seconds on screen, not on the tap itself */
  React.useEffect(() => {
    if (!open || message.status !== "new") return;
    const timer = window.setTimeout(() => {
      void setStatus({ id: message._id, status: "read" }).catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [open, message.status, message._id, setStatus]);

  React.useEffect(() => {
    if (notes === null) return;
    if (notes === (message.internalNotesHe ?? "")) return;
    const timer = window.setTimeout(() => {
      void setNotes({ id: message._id, internalNotesHe: notes })
        .then(() => setSaved(true))
        .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [notes, message, setNotes, toast]);

  const waUrl = customerWaUrl(message.phone, OPENER_HE);

  return (
    <li className="a-item" style={{ alignItems: "flex-start" }}>
      <div className="a-grow" style={{ minInlineSize: 0 }}>
        <div className="a-row" style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className="a-grow"
            style={{
              textAlign: "start",
              border: 0,
              background: "none",
              font: "inherit",
              color: "inherit",
              minBlockSize: "var(--admin-tap)",
              cursor: "pointer",
              minInlineSize: 0,
            }}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <strong>{message.name}</strong>
            <span className="a-muted"> · {relativeHe(message.createdAt)}</span>
          </button>
          <Pill
            tone={
              message.status === "new"
                ? "new"
                : message.status === "replied"
                  ? "done"
                  : message.status === "spam"
                    ? "off"
                    : "work"
            }
          >
            {CONTACT_STATUS_HE[message.status]}
          </Pill>
        </div>

        {!open ? (
          <p className="a-muted" style={{ overflowWrap: "anywhere" }}>
            {message.bodyHe.slice(0, 90)}
            {message.bodyHe.length > 90 ? "…" : ""}
          </p>
        ) : (
          <div className="a-stack" style={{ marginBlockStart: "0.5rem" }}>
            {message.subjectHe ? <strong>{message.subjectHe}</strong> : null}
            <blockquote className="a-quote">{message.bodyHe}</blockquote>

            <dl className="a-kv">
              <dt>טלפון</dt>
              <dd>
                <a href={`tel:${message.phone}`} className="a-num">
                  <bdi dir="ltr">{message.phone}</bdi>
                </a>
              </dd>
              {message.email ? (
                <>
                  <dt>מייל</dt>
                  <dd>
                    <a href={`mailto:${message.email}`}>
                      <bdi dir="ltr">{message.email}</bdi>
                    </a>
                  </dd>
                </>
              ) : null}
              <dt>הגיע</dt>
              <dd>{dateHe(message.createdAt)}</dd>
            </dl>

            <TextAreaField
              label="הערות לעצמך"
              value={notes ?? message.internalNotesHe ?? ""}
              onChange={(value) => {
                setSaved(false);
                setNotesValue(value);
              }}
              rows={3}
            />
            {saved ? (
              <p role="status" style={{ color: "var(--admin-turquoise-ink)" }}>
                {V.saved}
              </p>
            ) : null}

            <div className="a-row" style={{ flexWrap: "wrap" }}>
              {waUrl ? (
                <a className="a-btn" data-tone="primary" data-size="sm" href={waUrl} target="_blank" rel="noreferrer">
                  לפתוח וואטסאפ
                </a>
              ) : null}
              <ActionButton
                size="sm"
                tone="quiet"
                onClick={() => {
                  void setStatus({ id: message._id, status: "replied" })
                    .then(() => toast.show("סומן שענית"))
                    .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
                }}
              >
                לסמן שעניתי
              </ActionButton>
              <ActionButton
                size="sm"
                tone="quiet"
                onClick={() => {
                  void convert({ id: message._id })
                    .then((leadId) => {
                      toast.show("נפתחה פנייה");
                      router.push(`/admin/leads/${leadId as Id<"leads">}`);
                    })
                    .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
                }}
              >
                להפוך לפנייה
              </ActionButton>
              <ActionButton
                size="sm"
                tone="danger"
                onClick={() => {
                  const previous = message.status;
                  void setStatus({ id: message._id, status: "spam" })
                    .then(() =>
                      toast.show("סומן כספאם", {
                        undo: async () => {
                          await setStatus({ id: message._id, status: previous });
                        },
                      }),
                    )
                    .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
                }}
              >
                ספאם
              </ActionButton>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export default function MessagesPage() {
  const [status, setStatus] = React.useState<ContactStatus | "all">("all");
  const messages = useQuery(api.contact.list, {
    status: status === "all" ? undefined : status,
    limit: 60,
  });
  const counts = useQuery(api.contact.counts, {});

  const chips: { value: ContactStatus | "all"; labelHe: string; count?: number }[] = [
    { value: "all", labelHe: "הכל" },
    { value: "new", labelHe: CONTACT_STATUS_HE.new, count: counts?.new },
    { value: "read", labelHe: CONTACT_STATUS_HE.read, count: counts?.read },
    { value: "replied", labelHe: CONTACT_STATUS_HE.replied, count: counts?.replied },
    { value: "spam", labelHe: CONTACT_STATUS_HE.spam, count: counts?.spam },
  ];

  return (
    <>
      <PageHeader title="הודעות" helpHe="מה שנשלח מטופס יצירת הקשר באתר." />

      <div className="a-stack">
        <div className="a-chips" role="group" aria-label="סינון לפי מצב">
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className="a-chip"
              aria-pressed={status === chip.value}
              onClick={() => setStatus(chip.value)}
            >
              {chip.labelHe}
              {chip.count !== undefined && chip.count > 0 ? (
                <span className="a-chip-count">
                  <bdi dir="ltr">{chip.count}</bdi>
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {messages === undefined ? <LoadingBlock rows={3} /> : null}

        {messages !== undefined && messages.length === 0 ? (
          <AdminEmpty
            titleHe="אין הודעות."
            bodyHe="כל מי שימלא את הטופס בעמוד יצירת קשר יופיע כאן."
            illustration="leads"
          />
        ) : null}

        {messages !== undefined && messages.length > 0 ? (
          <Card>
            <ul className="a-list">
              {messages.map((message) => (
                <MessageCard key={message._id} message={message} />
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
