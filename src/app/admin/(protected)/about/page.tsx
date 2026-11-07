"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { api, type Doc, type Id } from "@/app/admin/_lib/convex";
import { DangerDialog } from "@/components/admin/Dialogs";
import { ABOUT_KIND_HE, ACCENT_HE } from "@/components/admin/format";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import { errorHe, V } from "@/components/admin/messages";
import { SortableList, type SortableEntry } from "@/components/admin/SortableList";
import { useToast } from "@/components/admin/Toast";
import {
  ActionButton,
  Card,
  HelpNote,
  LoadingBlock,
  PageHeader,
  Pill,
  SelectField,
  TextAreaField,
  TextField,
  Toggle,
} from "@/components/admin/ui";

/**
 * הסיפור שלי, 06 §C.14, as amended by RESOLUTIONS §19 and §20.
 *
 * The page this screen edits no longer carries a personal story: the Haftarah,
 * the family, the allergy, the nights and the dyslexia came off the site on
 * 07.09.26 and do not come back. What is left is Shai as a maker, and this editor
 * is deliberately neutral about content so it cannot invite any of it back.
 *
 * One sentence is still pinned. `הופך רעיונות לדברים אמיתיים` is the spine of the
 * whole site (DECISIONS), so the section that carries it can be edited and cannot
 * be deleted, and the delete button on that row is replaced by the reason.
 */

type Section = Doc<"aboutSections"> & { imageUrl: string | null };
type Kind = Doc<"aboutSections">["kind"];
type Accent = Doc<"aboutSections">["accent"];

const SPINE = "הופך רעיונות לדברים אמיתיים";

const KINDS: Kind[] = [
  "opener",
  "paragraph",
  "pullQuote",
  "timelineItem",
  "imageFull",
  "twoUp",
  "statement",
];

function isPinned(section: Section): boolean {
  return [section.headingHe, section.bodyHe, section.quoteHe].some((text) =>
    (text ?? "").includes(SPINE),
  );
}

function preview(section: Section): string {
  const text = section.quoteHe ?? section.headingHe ?? section.bodyHe ?? "";
  return text.length > 60 ? `${text.slice(0, 60)}…` : text || "בלי טקסט";
}

export default function AboutEditorPage() {
  const sections = useQuery(api.about.listAll, {});
  const create = useMutation(api.about.create);
  const update = useMutation(api.about.update);
  const reorder = useMutation(api.about.reorder);
  const setActive = useMutation(api.about.setActive);
  const softDelete = useMutation(api.about.softDelete);
  const toast = useToast();

  const [openId, setOpenId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, Partial<Section>>>({});
  const [deleting, setDeleting] = React.useState<Section | null>(null);
  const [newKind, setNewKind] = React.useState<Kind>("paragraph");

  const rows = sections ?? [];

  function draftOf(section: Section): Section {
    return { ...section, ...drafts[section._id] };
  }

  function edit(section: Section, patch: Partial<Section>) {
    setDrafts((current) => ({ ...current, [section._id]: { ...current[section._id], ...patch } }));
  }

  const isDirty = (section: Section) =>
    drafts[section._id] !== undefined &&
    JSON.stringify(draftOf(section)) !== JSON.stringify(section);

  async function save(section: Section) {
    const next = draftOf(section);
    try {
      await update({
        id: section._id,
        patch: {
          kind: next.kind,
          headingHe: next.headingHe ?? "",
          bodyHe: next.bodyHe ?? "",
          quoteHe: next.quoteHe ?? "",
          labelHe: next.labelHe ?? "",
          accent: next.accent,
          ...(next.imageId ? { imageId: next.imageId } : {}),
          ...(next.imageAltHe ? { imageAltHe: next.imageAltHe } : {}),
        },
      });
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[section._id];
        return copy;
      });
      toast.show(V.saved);
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    }
  }

  const entries: SortableEntry[] = rows.map((section) => {
    const draft = draftOf(section);
    const open = openId === section._id;
    const pinned = isPinned(section);

    return {
      id: section._id,
      labelHe: preview(section),
      content: (
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
              onClick={() => setOpenId(open ? null : section._id)}
            >
              {preview(section)}
            </button>
            <Pill tone={section.active ? "done" : "off"}>
              {ABOUT_KIND_HE[section.kind] ?? section.kind}
            </Pill>
            {isDirty(section) ? <span className="a-dirty">לא נשמר</span> : null}
          </div>

          {open ? (
            <div className="a-stack" style={{ marginBlockStart: "0.75rem" }}>
              <SelectField
                label="סוג הבלוק"
                value={draft.kind}
                options={KINDS.map((value) => ({
                  value,
                  labelHe: ABOUT_KIND_HE[value] ?? value,
                }))}
                onChange={(value) => edit(section, { kind: value })}
              />

              {draft.kind === "timelineItem" ? (
                <TextField
                  label="תווית"
                  hint="הכיתוב הקטן שמעל הפסקה"
                  value={draft.labelHe ?? ""}
                  onChange={(value) => edit(section, { labelHe: value })}
                  maxLength={40}
                />
              ) : null}

              {draft.kind === "pullQuote" || draft.kind === "statement" ? (
                <TextField
                  label="המשפט"
                  value={draft.quoteHe ?? ""}
                  onChange={(value) => edit(section, { quoteHe: value })}
                  maxLength={draft.kind === "statement" ? 80 : 160}
                />
              ) : (
                <>
                  <TextField
                    label="כותרת"
                    hint="אפשר להשאיר ריק"
                    value={draft.headingHe ?? ""}
                    onChange={(value) => edit(section, { headingHe: value })}
                    maxLength={80}
                  />
                  <TextAreaField
                    label="הטקסט"
                    value={draft.bodyHe ?? ""}
                    onChange={(value) => edit(section, { bodyHe: value })}
                    rows={5}
                    maxLength={900}
                  />
                </>
              )}

              {draft.kind === "imageFull" || draft.kind === "twoUp" ? (
                <>
                  {draft.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="a-photo" src={draft.imageUrl} alt={draft.imageAltHe ?? ""} />
                  ) : null}
                  <TextField
                    label="מה רואים בתמונה"
                    hint={V.altRequired}
                    value={draft.imageAltHe ?? ""}
                    onChange={(value) => edit(section, { imageAltHe: value })}
                  />
                  <ImageDropzone
                    labelHe="תמונה"
                    onUploaded={async (image) => {
                      await update({
                        id: section._id,
                        patch: { imageId: image.storageId, imageAltHe: image.altHe },
                      });
                      toast.show("התמונה עודכנה");
                    }}
                  />
                </>
              ) : null}

              <SelectField
                label="צבע מלווה"
                value={draft.accent}
                options={(["none", "red", "turquoise", "yellow", "ink"] as Accent[]).map(
                  (value) => ({ value, labelHe: ACCENT_HE[value] }),
                )}
                onChange={(value) => edit(section, { accent: value })}
              />

              <div className="a-row" style={{ flexWrap: "wrap" }}>
                <ActionButton
                  tone="primary"
                  disabled={!isDirty(section)}
                  onClick={() => void save(section)}
                >
                  לשמור
                </ActionButton>
                <Toggle
                  label="מוצג בעמוד"
                  checked={section.active}
                  onChange={(value) => {
                    void setActive({ id: section._id, active: value }).catch((thrown: unknown) =>
                      toast.show(errorHe(thrown), { tone: "error" }),
                    );
                  }}
                />
                <span className="a-grow" />
                {pinned ? (
                  <span className="a-muted">המשפט הזה הוא הבסיס של האתר.</span>
                ) : (
                  <ActionButton tone="danger" size="sm" onClick={() => setDeleting(section)}>
                    למחוק
                  </ActionButton>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ),
    };
  });

  return (
    <>
      <PageHeader title="הסיפור שלי" helpHe="הבלוקים של עמוד הסיפור, לפי הסדר שהם מופיעים בו." />

      <div className="a-stack">
        <HelpNote>
          העמוד הזה מדבר על שי כיוצר: איך הוא עובד, איך התחיל, ומה קורה כשהדפסה יוצאת עקומה.
        </HelpNote>

        {sections === undefined ? <LoadingBlock rows={3} /> : null}

        {entries.length > 0 ? (
          <Card>
            <SortableList
              entries={entries}
              onMove={(id, beforeId, afterId) => {
                void reorder({
                  id: id as Id<"aboutSections">,
                  beforeId: beforeId as Id<"aboutSections"> | undefined,
                  afterId: afterId as Id<"aboutSections"> | undefined,
                }).catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
              }}
            />
          </Card>
        ) : null}

        <Card title="בלוק חדש">
          <div className="a-row" style={{ flexWrap: "wrap" }}>
            <div style={{ inlineSize: "min(14rem, 100%)" }}>
              <SelectField
                label="סוג"
                value={newKind}
                options={KINDS.map((value) => ({
                  value,
                  labelHe: ABOUT_KIND_HE[value] ?? value,
                }))}
                onChange={setNewKind}
              />
            </div>
            <ActionButton
              tone="primary"
              onClick={() => {
                void create({ kind: newKind, accent: "none" })
                  .then((id) => {
                    setOpenId(id as string);
                    toast.show("נוסף בלוק חדש בסוף העמוד");
                  })
                  .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
              }}
            >
              להוסיף
            </ActionButton>
          </div>
        </Card>
      </div>

      <DangerDialog
        open={deleting !== null}
        titleHe="למחוק את הבלוק הזה?"
        bodyHe="אפשר לשחזר מהפח במשך 30 יום."
        confirmHe="למחוק"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const section = deleting;
          setDeleting(null);
          if (!section) return;
          void softDelete({ id: section._id })
            .then(() => toast.show("הבלוק עבר לפח"))
            .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
        }}
      />
    </>
  );
}
