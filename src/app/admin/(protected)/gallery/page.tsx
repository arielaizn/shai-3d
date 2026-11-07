"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { api, type Doc, type Id } from "@/app/admin/_lib/convex";
import { DangerDialog } from "@/components/admin/Dialogs";
import { relativeHe } from "@/components/admin/format";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import { errorHe, V } from "@/components/admin/messages";
import { SortableList, type SortableEntry } from "@/components/admin/SortableList";
import { useToast } from "@/components/admin/Toast";
import {
  ActionButton,
  AdminEmpty,
  Card,
  LoadingBlock,
  Note,
  PageHeader,
  Pill,
  TextField,
} from "@/components/admin/ui";

/**
 * גלריה, 06 §C.15.
 *
 * The valuable path here is not the upload button, it is "מהפניות": a photo a
 * customer actually received back. That path goes through
 * `gallery.createFromLead`, which refuses without `photoShareConsent`. The check
 * lives in the mutation and not in this screen, so the rule holds even if the UI
 * is wrong, and the screen shows the consent state before the button is pressed
 * so the refusal is never a surprise.
 */

type Item = Doc<"galleryItems"> & { imageUrl: string | null };

export default function GalleryPage() {
  const items = useQuery(api.gallery.listAll, {});
  const leads = useQuery(api.leads.list, { limit: 40 });
  const create = useMutation(api.gallery.create);
  const createFromLead = useMutation(api.gallery.createFromLead);
  const update = useMutation(api.gallery.update);
  const reorder = useMutation(api.gallery.reorder);
  const setActive = useMutation(api.gallery.setActive);
  const softDelete = useMutation(api.gallery.softDelete);
  const toast = useToast();

  const [title, setTitle] = React.useState("");
  const [fromLeads, setFromLeads] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Id<"leads"> | null>(null);
  const [leadTitle, setLeadTitle] = React.useState("");
  const [leadAlt, setLeadAlt] = React.useState("");
  const [deleting, setDeleting] = React.useState<Item | null>(null);

  const leadDetail = useQuery(api.leads.get, selectedLead ? { id: selectedLead } : "skip");
  const rows = items ?? [];

  const entries: SortableEntry[] = rows.map((item) => ({
    id: item._id,
    labelHe: item.titleHe,
    content: (
      <div style={{ display: "grid", gap: "0.25rem", justifyItems: "center", minInlineSize: 0 }}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            style={{
              inlineSize: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: "0.75rem",
              opacity: item.active ? 1 : 0.45,
              border: item.featured
                ? "3px solid var(--admin-yellow)"
                : "1px solid var(--admin-line)",
            }}
          />
        ) : (
          <span className="a-thumb" aria-hidden="true" />
        )}
        <span style={{ fontSize: "0.75rem", textAlign: "center", minInlineSize: 0 }}>
          {item.titleHe}
        </span>
        <div className="a-row" style={{ gap: "0.25rem" }}>
          <button
            type="button"
            className="a-iconbtn"
            aria-label={`להדגיש את ${item.titleHe}`}
            aria-pressed={item.featured}
            onClick={() => {
              void update({ id: item._id, patch: { featured: !item.featured } }).catch(
                (thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }),
              );
            }}
          >
            {item.featured ? "★︎" : "☆︎"}
          </button>
          <button
            type="button"
            className="a-iconbtn"
            aria-label={`${item.active ? "להסתיר" : "להציג"} את ${item.titleHe}`}
            onClick={() => {
              void setActive({ id: item._id, active: !item.active }).catch((thrown: unknown) =>
                toast.show(errorHe(thrown), { tone: "error" }),
              );
            }}
          >
            {item.active ? "◉︎" : "○︎"}
          </button>
          <button
            type="button"
            className="a-iconbtn"
            aria-label={`למחוק את ${item.titleHe}`}
            onClick={() => setDeleting(item)}
          >
            ✕︎
          </button>
        </div>
      </div>
    ),
  }));

  return (
    <>
      <PageHeader
        title="גלריה"
        helpHe="מה שהודפס באמת. הכוכב מסמן מה עולה לדף הבית."
        actions={
          <ActionButton tone="quiet" onClick={() => setFromLeads((open) => !open)}>
            להוסיף מהפניות
          </ActionButton>
        }
      />

      <div className="a-stack">
        {items === undefined ? <LoadingBlock rows={2} /> : null}

        {items !== undefined && rows.length === 0 ? (
          <AdminEmpty
            titleHe="הגלריה ריקה."
            bodyHe="אפשר להעלות תמונות, או להוסיף מתוך פניות של לקוחות שאישרו."
            illustration="gallery"
          />
        ) : null}

        {entries.length > 0 ? (
          <Card>
            <SortableList
              layout="grid"
              entries={entries}
              onMove={(id, beforeId, afterId) => {
                void reorder({
                  id: id as Id<"galleryItems">,
                  beforeId: beforeId as Id<"galleryItems"> | undefined,
                  afterId: afterId as Id<"galleryItems"> | undefined,
                }).catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
              }}
            />
          </Card>
        ) : null}

        {fromLeads ? (
          <Card
            title="מתוך פניות"
            helpHe="אפשר להוסיף רק תמונה של לקוח שאישר שמותר להציג אותה."
          >
            <div className="a-stack">
              <ul className="a-list">
                {(leads ?? []).map((lead) => (
                  <li key={lead._id} className="a-item">
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
                      aria-pressed={selectedLead === lead._id}
                      onClick={() => {
                        setSelectedLead(lead._id);
                        setLeadTitle(lead.titleHe || "הדפסה");
                        setLeadAlt("");
                      }}
                    >
                      {lead.titleHe || "פנייה"}{" "}
                      <span className="a-muted">{relativeHe(lead.createdAt)}</span>
                    </button>
                    {selectedLead === lead._id ? <Pill tone="work">נבחר</Pill> : null}
                  </li>
                ))}
              </ul>

              {leadDetail && leadDetail.lead ? (
                <div className="a-stack">
                  {leadDetail.previewSnapshotUrl ?? leadDetail.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="a-photo"
                      style={{ maxInlineSize: "18rem" }}
                      src={(leadDetail.previewSnapshotUrl ?? leadDetail.photoUrl) as string}
                      alt=""
                    />
                  ) : null}

                  {leadDetail.lead.photoShareConsent ? (
                    <>
                      <TextField label="כותרת" value={leadTitle} onChange={setLeadTitle} />
                      <TextField
                        label="מה רואים בתמונה"
                        hint={V.altRequired}
                        value={leadAlt}
                        onChange={setLeadAlt}
                      />
                      <ActionButton
                        tone="primary"
                        disabled={leadAlt.trim() === ""}
                        onClick={() => {
                          if (!selectedLead) return;
                          void createFromLead({
                            leadId: selectedLead,
                            titleHe: leadTitle.trim() || "הדפסה",
                            imageAltHe: leadAlt.trim(),
                            width: 1200,
                            height: 1200,
                          })
                            .then(() => {
                              setSelectedLead(null);
                              setLeadAlt("");
                              toast.show("נוסף לגלריה");
                            })
                            .catch((thrown: unknown) =>
                              toast.show(errorHe(thrown), { tone: "error" }),
                            );
                        }}
                      >
                        להוסיף לגלריה
                      </ActionButton>
                    </>
                  ) : (
                    <Note>{V.noConsent}</Note>
                  )}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card title="להעלות תמונה" helpHe="הכותרת היא מה שכתוב מתחת לתמונה בגלריה.">
          <div className="a-stack">
            <TextField label="כותרת" value={title} onChange={setTitle} maxLength={40} />
            <ImageDropzone
              labelHe="תמונה חדשה"
              altHintHe="למשל: מנורת ליתופן דולקת על שידה"
              onUploaded={async (image) => {
                await create({
                  titleHe: title.trim() || image.altHe,
                  imageId: image.storageId,
                  imageAltHe: image.altHe,
                  width: image.width,
                  height: image.height,
                  blurDataUrl: image.blurDataUrl,
                  accent: "none",
                });
                setTitle("");
                toast.show("נוסף לגלריה");
              }}
            />
          </div>
        </Card>
      </div>

      <DangerDialog
        open={deleting !== null}
        titleHe={deleting ? `למחוק את «${deleting.titleHe}»?` : ""}
        bodyHe="אפשר לשחזר מהפח במשך 30 יום."
        confirmHe="למחוק"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const item = deleting;
          setDeleting(null);
          if (!item) return;
          void softDelete({ id: item._id })
            .then(() => toast.show("עבר לפח"))
            .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
        }}
      />
    </>
  );
}
