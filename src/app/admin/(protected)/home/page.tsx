"use client";

import * as React from "react";

import { useOptionalMutation, useOptionalQuery } from "@/app/admin/_lib/optional";
import { errorHe, V } from "@/components/admin/messages";
import { useToast } from "@/components/admin/Toast";
import {
  ActionButton,
  Card,
  HelpNote,
  LoadingBlock,
  Note,
  PageHeader,
  Pill,
  TextAreaField,
  TextField,
  Toggle,
} from "@/components/admin/ui";

/**
 * דף הבית, 06 §C.13.
 *
 * A list of the eight sections, each collapsed to its headline, each opening only
 * the fields its own kind uses. The hero gets the extra treatment, because it
 * carries the site's central device: one word of the headline sits inside a red
 * marker box, and the preview here draws it exactly where the page will.
 *
 * `convex/home.ts` (06 §A.4) is not on the deployment yet, so the module is
 * addressed by name and the screen degrades honestly: the fields render, they say
 * plainly that the home text still lives in the code, and nothing pretends to
 * save. The day that module lands this screen starts writing with no edit.
 */

type HomeKind =
  | "hero"
  | "howItWorks"
  | "featuredProducts"
  | "generatorTeaser"
  | "gallery"
  | "storyTeaser"
  | "faq"
  | "finalCta";

type HomeSection = {
  _id: string;
  kind: HomeKind;
  enabled: boolean;
  sortOrder: number;
  eyebrowHe?: string;
  headlineHe?: string;
  headlineAccentWord?: string;
  subHe?: string;
  bodyHe?: string;
  primaryCtaLabelHe?: string;
  primaryCtaHref?: string;
  secondaryCtaLabelHe?: string;
  secondaryCtaHref?: string;
  imageAltHe?: string;
};

const KIND_HE: Record<HomeKind, string> = {
  hero: "הפתיחה",
  howItWorks: "איך זה עובד",
  featuredProducts: "מוצרים נבחרים",
  generatorTeaser: "הזמנה למחולל",
  gallery: "גלריה",
  storyTeaser: "טעימה מהסיפור",
  faq: "שאלות ותשובות",
  finalCta: "הקריאה האחרונה",
};

const ORDER: HomeKind[] = [
  "hero",
  "howItWorks",
  "featuredProducts",
  "generatorTeaser",
  "gallery",
  "storyTeaser",
  "faq",
  "finalCta",
];

type FieldKey =
  | "eyebrowHe"
  | "headlineHe"
  | "headlineAccentWord"
  | "subHe"
  | "bodyHe"
  | "primaryCtaLabelHe"
  | "primaryCtaHref"
  | "secondaryCtaLabelHe"
  | "secondaryCtaHref";

const FIELDS: Record<HomeKind, FieldKey[]> = {
  hero: [
    "eyebrowHe",
    "headlineHe",
    "headlineAccentWord",
    "subHe",
    "primaryCtaLabelHe",
    "primaryCtaHref",
    "secondaryCtaLabelHe",
    "secondaryCtaHref",
  ],
  howItWorks: ["headlineHe", "subHe"],
  featuredProducts: ["headlineHe", "subHe", "primaryCtaLabelHe", "primaryCtaHref"],
  generatorTeaser: ["headlineHe", "headlineAccentWord", "subHe", "primaryCtaLabelHe", "primaryCtaHref"],
  gallery: ["headlineHe", "subHe"],
  storyTeaser: ["headlineHe", "bodyHe", "primaryCtaLabelHe", "primaryCtaHref"],
  faq: ["headlineHe", "subHe"],
  finalCta: ["headlineHe", "subHe", "primaryCtaLabelHe", "primaryCtaHref"],
};

const LABEL_HE: Record<FieldKey, string> = {
  eyebrowHe: "שורה קטנה מעל הכותרת",
  headlineHe: "כותרת",
  headlineAccentWord: "המילה שתקבל הדגשה אדומה",
  subHe: "שורה מתחת לכותרת",
  bodyHe: "טקסט",
  primaryCtaLabelHe: "כפתור ראשי",
  primaryCtaHref: "לאן הכפתור הראשי מוביל",
  secondaryCtaLabelHe: "כפתור משני",
  secondaryCtaHref: "לאן הכפתור המשני מוביל",
};

/** The site's central device: one word of the headline inside a red marker box. */
function HeadlinePreview({ headline, word }: { headline: string; word: string }) {
  if (!headline) return null;
  const index = word ? headline.indexOf(word) : -1;
  return (
    <p
      style={{
        fontFamily: "var(--font-rubik), system-ui, sans-serif",
        fontWeight: 800,
        fontSize: "1.375rem",
        lineHeight: 1.25,
      }}
    >
      {index === -1 ? (
        headline
      ) : (
        <>
          {headline.slice(0, index)}
          <span
            style={{
              backgroundColor: "#f5333f",
              color: "#fffcf7",
              padding: "0 0.25rem",
              borderRadius: "0.25rem",
            }}
          >
            {word}
          </span>
          {headline.slice(index + word.length)}
        </>
      )}
    </p>
  );
}

export default function HomeEditorPage() {
  const toast = useToast();
  const [state, reload] = useOptionalQuery<HomeSection[]>("home:listAll", {});
  const update = useOptionalMutation(
    "home:update",
    "עריכת דף הבית מהניהול עוד לא פתוחה בשרת.",
  );
  const setEnabled = useOptionalMutation(
    "home:setActive",
    "עריכת דף הבית מהניהול עוד לא פתוחה בשרת.",
  );

  const [drafts, setDrafts] = React.useState<Record<string, Partial<HomeSection>>>({});
  const [openId, setOpenId] = React.useState<string | null>(null);

  const live = state.status === "ready" ? state.data : null;
  const offline = state.status === "absent";

  const sections: HomeSection[] = React.useMemo(() => {
    if (live) return [...live].sort((a, b) => a.sortOrder - b.sortOrder);
    return ORDER.map((kind, index) => ({
      _id: kind,
      kind,
      enabled: true,
      sortOrder: index,
    }));
  }, [live]);

  function draftOf(section: HomeSection): HomeSection {
    return { ...section, ...drafts[section._id] };
  }

  function edit(section: HomeSection, patch: Partial<HomeSection>) {
    setDrafts((current) => ({ ...current, [section._id]: { ...current[section._id], ...patch } }));
  }

  const dirty = (section: HomeSection) =>
    drafts[section._id] !== undefined &&
    JSON.stringify(draftOf(section)) !== JSON.stringify(section);

  async function save(section: HomeSection) {
    const next = draftOf(section);
    const patch: Record<string, unknown> = {};
    for (const key of FIELDS[section.kind]) patch[key] = next[key] ?? "";
    try {
      await update({ id: section._id, patch });
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[section._id];
        return copy;
      });
      reload();
      toast.show(V.saved);
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    }
  }

  return (
    <>
      <PageHeader title="דף הבית" helpHe="הבלוקים של העמוד הראשי, לפי הסדר שהם מופיעים בו." />

      <div className="a-stack">
        {state.status === "loading" ? <LoadingBlock rows={3} /> : null}

        {offline ? (
          <Note>
            הטקסטים של דף הבית יושבים כרגע בקוד של האתר. המסך הזה כבר בנוי לשדות שלהם, והוא
            יתחיל לשמור ברגע שהפונקציות של דף הבית יעלו לשרת.
          </Note>
        ) : null}

        {state.status === "failed" ? <Note tone="danger">{state.messageHe}</Note> : null}

        {sections.map((section) => {
          const draft = draftOf(section);
          const open = openId === section._id;

          return (
            <Card key={section._id}>
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
                  <strong>{KIND_HE[section.kind]}</strong>
                  {draft.headlineHe ? (
                    <span className="a-muted"> · {draft.headlineHe.slice(0, 40)}</span>
                  ) : null}
                </button>
                <Pill tone={section.enabled ? "done" : "off"}>
                  {section.enabled ? "מוצג" : "מוסתר"}
                </Pill>
                {dirty(section) ? <span className="a-dirty">לא נשמר</span> : null}
              </div>

              {open ? (
                <div className="a-stack" style={{ marginBlockStart: "0.75rem" }}>
                  {FIELDS[section.kind].map((key) =>
                    key === "bodyHe" ? (
                      <TextAreaField
                        key={key}
                        label={LABEL_HE[key]}
                        value={draft[key] ?? ""}
                        onChange={(value) => edit(section, { [key]: value })}
                        rows={4}
                        maxLength={400}
                        disabled={offline}
                      />
                    ) : (
                      <TextField
                        key={key}
                        label={LABEL_HE[key]}
                        dir={key.endsWith("Href") ? "ltr" : undefined}
                        value={draft[key] ?? ""}
                        onChange={(value) => edit(section, { [key]: value })}
                        maxLength={key === "headlineHe" ? 70 : 90}
                        disabled={offline}
                        error={
                          key === "headlineAccentWord" &&
                          draft.headlineAccentWord &&
                          !(draft.headlineHe ?? "").includes(draft.headlineAccentWord)
                            ? "המילה הזאת לא נמצאת בכותרת"
                            : undefined
                        }
                      />
                    ),
                  )}

                  {FIELDS[section.kind].includes("headlineAccentWord") ? (
                    <div className="a-card" style={{ boxShadow: "none" }}>
                      <p className="a-hint">איך זה ייראה</p>
                      <HeadlinePreview
                        headline={draft.headlineHe ?? ""}
                        word={draft.headlineAccentWord ?? ""}
                      />
                      {draft.subHe ? <p className="a-muted">{draft.subHe}</p> : null}
                    </div>
                  ) : null}

                  <div className="a-row" style={{ flexWrap: "wrap" }}>
                    <ActionButton
                      tone="primary"
                      disabled={offline || !dirty(section)}
                      onClick={() => void save(section)}
                    >
                      לשמור
                    </ActionButton>
                    <Toggle
                      label="מוצג בעמוד"
                      checked={draft.enabled}
                      disabled={offline}
                      onChange={(value) => {
                        edit(section, { enabled: value });
                        void setEnabled({ id: section._id, enabled: value })
                          .then(() => reload())
                          .catch((thrown: unknown) =>
                            toast.show(errorHe(thrown), { tone: "error" }),
                          );
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}

        <HelpNote>
          התמונות של דף הבית מגיעות מהאסטים שכבר יושבים באתר. החלפה שלהן מהניהול תיפתח יחד עם
          שאר השדות.
        </HelpNote>
      </div>
    </>
  );
}
