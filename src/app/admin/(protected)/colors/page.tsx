"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { api, type Doc, type Id } from "@/app/admin/_lib/convex";
import { DangerDialog } from "@/components/admin/Dialogs";
import { COLOR_FAMILIES_HE, FINISH_HE, STOCK_HE } from "@/components/admin/format";
import { errorHe, V } from "@/components/admin/messages";
import { SortableList, type SortableEntry } from "@/components/admin/SortableList";
import { useToast } from "@/components/admin/Toast";
import {
  ActionButton,
  AdminEmpty,
  Card,
  ColorSwatchField,
  HelpNote,
  LoadingBlock,
  MoneyField,
  Note,
  PageHeader,
  Segmented,
  SelectField,
  TextField,
  Toggle,
} from "@/components/admin/ui";

/**
 * צבעי חוט, 06 §C.10. The screen he opens most often, because spools run out.
 *
 * Three modes, and only one of them is on at a time:
 *   רגיל       tapping a tile opens its sheet
 *   סדר מחדש   the grid becomes draggable. One drop writes one row: the server
 *              puts a fractional index between the two neighbours
 *   סימון מהיר each tap cycles יש → נגמר כמעט → אזל, and everything is written
 *              in one press at the end. This is the mode he uses standing next to
 *              a finished print
 *
 * RTL and drag: `SortableList` never measures a horizontal delta, it hit-tests
 * the point under the finger, so a mirrored grid cannot reverse it.
 */

type Color = Doc<"filamentColors">;
type Finish = Color["finish"];
type Stock = Color["stock"];

const CREAM = [0xff, 0xf7, 0xec];
const STOCK_ORDER: Stock[] = ["in", "low", "out"];

function rgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) || 0,
    parseInt(value.slice(2, 4), 16) || 0,
    parseInt(value.slice(4, 6), 16) || 0,
  ];
}

/** 06 §C.10: a filament that nearly disappears on the site's ground gets a ring. */
function nearlyInvisible(hex: string): boolean {
  const [r, g, b] = rgb(hex);
  const distance = Math.sqrt(
    (r - CREAM[0]) ** 2 + (g - CREAM[1]) ** 2 + (b - CREAM[2]) ** 2,
  );
  return distance < 45;
}

const STARTER: Omit<Color, "_id" | "_creationTime" | "sortOrder" | "active" | "createdAt" | "updatedAt">[] = [
  { nameHe: "לבן", hex: "#FFFFFF", familyHe: "לבנים ושחורים", finish: "matte", isMetallic: false, isGlow: false, isTranslucent: false, extraCostAgorot: 0, stock: "in" },
  { nameHe: "שחור", hex: "#1A1420", familyHe: "לבנים ושחורים", finish: "matte", isMetallic: false, isGlow: false, isTranslucent: false, extraCostAgorot: 0, stock: "in" },
  { nameHe: "אדום סוכריה", hex: "#F5333F", familyHe: "אדומים", finish: "glossy", isMetallic: false, isGlow: false, isTranslucent: false, extraCostAgorot: 0, stock: "in" },
  { nameHe: "טורקיז", hex: "#12BFB8", familyHe: "כחולים", finish: "glossy", isMetallic: false, isGlow: false, isTranslucent: false, extraCostAgorot: 0, stock: "in" },
  { nameHe: "כחול", hex: "#1F5FD6", familyHe: "כחולים", finish: "glossy", isMetallic: false, isGlow: false, isTranslucent: false, extraCostAgorot: 0, stock: "in" },
  { nameHe: "ירוק", hex: "#22A65A", familyHe: "ירוקים", finish: "glossy", isMetallic: false, isGlow: false, isTranslucent: false, extraCostAgorot: 0, stock: "in" },
  { nameHe: "צהוב", hex: "#FFC531", familyHe: "צהובים", finish: "glossy", isMetallic: false, isGlow: false, isTranslucent: false, extraCostAgorot: 0, stock: "in" },
  { nameHe: "זוהר בחושך", hex: "#C9F5C0", familyHe: "מיוחדים", finish: "glow", isMetallic: false, isGlow: true, isTranslucent: false, extraCostAgorot: 0, stock: "in" },
];

/** Defined at module scope: a component redeclared inside a render remounts every
 *  swatch on every keystroke, which is exactly what a drag cannot survive. */
function Tile({ color, stock }: { color: Color; stock: Stock }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="a-swatch"
        style={{
          backgroundColor: color.hex,
          boxShadow: nearlyInvisible(color.hex) ? "inset 0 0 0 2px var(--admin-ink)" : undefined,
          opacity: color.active ? 1 : 0.4,
        }}
      />
      <span style={{ fontSize: "0.8125rem", textAlign: "center", minInlineSize: 0 }}>
        {color.nameHe}
      </span>
      <span
        className="a-pill"
        data-tone={stock === "in" ? "work" : stock === "low" ? "warn" : "off"}
        style={{ fontSize: "0.6875rem" }}
      >
        {STOCK_HE[stock]}
      </span>
    </>
  );
}

type Draft = {
  nameHe: string;
  hex: string;
  familyHe: string;
  finish: Finish;
  isMetallic: boolean;
  isGlow: boolean;
  isTranslucent: boolean;
  extraCostAgorot: number;
  stock: Stock;
  spoolNoteHe: string;
  active: boolean;
};

function toDraft(color: Color): Draft {
  return {
    nameHe: color.nameHe,
    hex: color.hex,
    familyHe: color.familyHe,
    finish: color.finish,
    isMetallic: color.isMetallic,
    isGlow: color.isGlow,
    isTranslucent: color.isTranslucent,
    extraCostAgorot: color.extraCostAgorot,
    stock: color.stock,
    spoolNoteHe: color.spoolNoteHe ?? "",
    active: color.active,
  };
}

const EMPTY_DRAFT: Draft = {
  nameHe: "",
  hex: "#F5333F",
  familyHe: "אדומים",
  finish: "matte",
  isMetallic: false,
  isGlow: false,
  isTranslucent: false,
  extraCostAgorot: 0,
  stock: "in",
  spoolNoteHe: "",
  active: true,
};

export default function ColorsPage() {
  const colors = useQuery(api.filaments.listAdmin, {});
  const create = useMutation(api.filaments.create);
  const update = useMutation(api.filaments.update);
  const setStock = useMutation(api.filaments.setStock);
  const setActive = useMutation(api.filaments.setActive);
  const reorder = useMutation(api.filaments.reorder);
  const softDelete = useMutation(api.filaments.softDelete);
  const toast = useToast();

  const [mode, setMode] = React.useState<"normal" | "reorder" | "stock">("normal");
  const [editing, setEditing] = React.useState<Id<"filamentColors"> | "new" | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [pending, setPending] = React.useState<Record<string, Stock>>({});
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const rows = colors ?? [];
  const pendingCount = Object.keys(pending).length;

  function open(color: Color) {
    setDraft(toDraft(color));
    setEditing(color._id);
  }

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setEditing("new");
  }

  function stockOf(color: Color): Stock {
    return pending[color._id] ?? color.stock;
  }

  function cycleStock(color: Color) {
    const next = STOCK_ORDER[(STOCK_ORDER.indexOf(stockOf(color)) + 1) % STOCK_ORDER.length];
    setPending((current) => ({ ...current, [color._id]: next }));
  }

  async function saveStock() {
    setSaving(true);
    try {
      for (const [id, stock] of Object.entries(pending)) {
        await setStock({ id: id as Id<"filamentColors">, stock });
      }
      setPending({});
      toast.show("המלאי עודכן");
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    if (draft.nameHe.trim() === "") return;
    setSaving(true);
    try {
      if (editing === "new") {
        await create({
          nameHe: draft.nameHe.trim(),
          hex: draft.hex.toUpperCase(),
          familyHe: draft.familyHe,
          finish: draft.finish,
          isMetallic: draft.isMetallic,
          isGlow: draft.isGlow,
          isTranslucent: draft.isTranslucent,
          extraCostAgorot: draft.extraCostAgorot,
          stock: draft.stock,
          spoolNoteHe: draft.spoolNoteHe.trim() || undefined,
        });
        toast.show("הצבע נוסף");
      } else if (editing) {
        await update({
          id: editing,
          patch: {
            nameHe: draft.nameHe.trim(),
            hex: draft.hex.toUpperCase(),
            familyHe: draft.familyHe,
            finish: draft.finish,
            isMetallic: draft.isMetallic,
            isGlow: draft.isGlow,
            isTranslucent: draft.isTranslucent,
            extraCostAgorot: draft.extraCostAgorot,
            spoolNoteHe: draft.spoolNoteHe.trim(),
          },
        });
        await setStock({ id: editing, stock: draft.stock });
        await setActive({ id: editing, active: draft.active });
        toast.show(V.saved);
      }
      setEditing(null);
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function addStarter() {
    setSaving(true);
    try {
      for (const color of STARTER) {
        await create({
          nameHe: color.nameHe,
          hex: color.hex,
          familyHe: color.familyHe,
          finish: color.finish,
          isMetallic: color.isMetallic,
          isGlow: color.isGlow,
          isTranslucent: color.isTranslucent,
          extraCostAgorot: color.extraCostAgorot,
          stock: color.stock,
        });
      }
      toast.show("נוספו שמונה צבעים. אפשר לשנות שם וגוון לכל אחד");
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  const entries: SortableEntry[] = rows.map((color) => ({
    id: color._id,
    labelHe: color.nameHe,
    content: <Tile color={color} stock={stockOf(color)} />,
  }));

  return (
    <>
      <PageHeader
        title="צבעי חוט"
        helpHe="מה שיש עכשיו על המדף. הסדר כאן הוא הסדר במחולל."
        actions={
          <ActionButton tone="primary" onClick={openNew}>
            צבע חדש
          </ActionButton>
        }
      />

      <div className="a-stack">
        <div className="a-chips" role="group" aria-label="מצב עריכה">
          {(
            [
              ["normal", "רגיל"],
              ["reorder", "סדר מחדש"],
              ["stock", "סימון מהיר"],
            ] as ["normal" | "reorder" | "stock", string][]
          ).map(([value, labelHe]) => (
            <button
              key={value}
              type="button"
              className="a-chip"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {labelHe}
            </button>
          ))}
        </div>

        {mode === "stock" ? (
          <HelpNote>כל נגיעה בצבע מחליפה מצב: יש, נגמר כמעט, אזל. הכול נשמר בלחיצה אחת בסוף.</HelpNote>
        ) : null}
        {mode === "reorder" ? (
          <HelpNote>אפשר לגרור מהידית, או להזיז עם מקשי החצים אחרי שהידית בפוקוס.</HelpNote>
        ) : null}

        {colors === undefined ? <LoadingBlock rows={2} /> : null}

        {colors !== undefined && rows.length === 0 ? (
          <AdminEmpty
            titleHe="אין צבעים. המחולל לא יעבוד בלי לפחות אחד."
            bodyHe="אפשר להתחיל משמונה צבעים נפוצים ולשנות אותם אחר כך."
            illustration="gallery"
            action={
              <ActionButton tone="primary" onClick={() => void addStarter()} disabled={saving}>
                להוסיף 8 צבעים נפוצים
              </ActionButton>
            }
          />
        ) : null}

        {rows.length > 0 && mode === "reorder" ? (
          <Card>
            <SortableList
              layout="grid"
              entries={entries}
              onMove={(id, beforeId, afterId) => {
                void reorder({
                  id: id as Id<"filamentColors">,
                  beforeId: beforeId as Id<"filamentColors"> | undefined,
                  afterId: afterId as Id<"filamentColors"> | undefined,
                }).catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
              }}
            />
          </Card>
        ) : null}

        {rows.length > 0 && mode !== "reorder" ? (
          <Card>
            <ul className="a-tiles" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rows.map((color) => (
                <li key={color._id} style={{ minInlineSize: 0 }}>
                  <button
                    type="button"
                    onClick={() => (mode === "stock" ? cycleStock(color) : open(color))}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                      inlineSize: "100%",
                      minInlineSize: 0,
                      minBlockSize: "var(--admin-tap)",
                      padding: "0.25rem",
                      border: 0,
                      background: "none",
                      font: "inherit",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <Tile color={color} stock={stockOf(color)} />
                    <span className="a-sr">
                      {mode === "stock" ? "החלפת מצב מלאי" : "פתיחת הצבע לעריכה"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      {mode === "stock" && pendingCount > 0 ? (
        <div className="a-savebar" role="region" aria-label="שינויי מלאי">
          <span className="a-dirty">
            <bdi dir="ltr">{pendingCount}</bdi> צבעים חיכו לשמירה
          </span>
          <div className="a-row" style={{ marginInlineStart: "auto" }}>
            <ActionButton tone="quiet" onClick={() => setPending({})}>
              לבטל
            </ActionButton>
            <ActionButton tone="primary" onClick={() => void saveStock()} disabled={saving}>
              {saving ? "רגע אחד" : "לשמור מלאי"}
            </ActionButton>
          </div>
        </div>
      ) : null}

      {editing !== null ? (
        <div className="a-sheet" onMouseDown={() => setEditing(null)}>
          <div
            className="a-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label={editing === "new" ? "צבע חדש" : `עריכת ${draft.nameHe}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="a-row" style={{ marginBlockEnd: "0.75rem" }}>
              <strong className="a-grow">{editing === "new" ? "צבע חדש" : draft.nameHe}</strong>
              <button
                type="button"
                className="a-iconbtn"
                aria-label="סגירה"
                onClick={() => setEditing(null)}
              >
                ✕︎
              </button>
            </div>

            <div className="a-stack">
              <TextField
                label="שם"
                hint="איך תקרא לו בשיחה עם לקוח"
                value={draft.nameHe}
                onChange={(value) => setDraft({ ...draft, nameHe: value })}
                maxLength={24}
              />

              <ColorSwatchField
                label="גוון"
                hex={draft.hex}
                onChange={(value) => setDraft({ ...draft, hex: value })}
              />

              {nearlyInvisible(draft.hex) ? (
                <Note>הצבע הזה כמעט נעלם על רקע האתר. הוא יוצג עם מסגרת.</Note>
              ) : null}

              <div className="a-fields" data-cols="2">
                <SelectField
                  label="משפחה"
                  value={draft.familyHe}
                  options={COLOR_FAMILIES_HE.map((value) => ({ value, labelHe: value }))}
                  onChange={(value) => setDraft({ ...draft, familyHe: value })}
                />
                <SelectField
                  label="גימור"
                  value={draft.finish}
                  options={(Object.keys(FINISH_HE) as Finish[]).map((value) => ({
                    value,
                    labelHe: FINISH_HE[value],
                  }))}
                  onChange={(value) => setDraft({ ...draft, finish: value })}
                />
              </div>

              <Segmented
                label="מלאי"
                value={draft.stock}
                options={STOCK_ORDER.map((value) => ({ value, labelHe: STOCK_HE[value] }))}
                onChange={(value) => setDraft({ ...draft, stock: value })}
              />

              <MoneyField
                label="תוספת מחיר לגליל הזה"
                hint="רוב הצבעים 0"
                agorot={draft.extraCostAgorot}
                onChange={(value) => setDraft({ ...draft, extraCostAgorot: value })}
                minAgorot={0}
              />

              <div className="a-row" style={{ flexWrap: "wrap" }}>
                <Toggle
                  label="מטאלי"
                  checked={draft.isMetallic}
                  onChange={(value) => setDraft({ ...draft, isMetallic: value })}
                />
                <Toggle
                  label="זוהר בחושך"
                  checked={draft.isGlow}
                  onChange={(value) => setDraft({ ...draft, isGlow: value })}
                />
                <Toggle
                  label="שקוף"
                  checked={draft.isTranslucent}
                  onChange={(value) => setDraft({ ...draft, isTranslucent: value })}
                />
              </div>

              <TextField
                label="הערה לעצמך"
                hint="למשל: נשאר חצי גליל. הלקוחות לא רואים את זה"
                value={draft.spoolNoteHe}
                onChange={(value) => setDraft({ ...draft, spoolNoteHe: value })}
              />

              {editing !== "new" ? (
                <Toggle
                  label="מוצג במחולל"
                  checked={draft.active}
                  onChange={(value) => setDraft({ ...draft, active: value })}
                />
              ) : null}

              <div className="a-row">
                <ActionButton
                  tone="primary"
                  onClick={() => void saveDraft()}
                  disabled={saving || draft.nameHe.trim() === ""}
                >
                  {saving ? "רגע אחד" : editing === "new" ? "להוסיף" : "לשמור"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={() => setEditing(null)}>
                  ביטול
                </ActionButton>
                {editing !== "new" ? (
                  <ActionButton tone="danger" size="sm" onClick={() => setDeleting(true)}>
                    למחוק
                  </ActionButton>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DangerDialog
        open={deleting}
        titleHe={`להעביר את «${draft.nameHe}» לפח?`}
        bodyHe="הצבע ייעלם מהמחולל. אפשר לשחזר מהפח במשך 30 יום."
        confirmHe="להעביר לפח"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          const id = editing;
          setDeleting(false);
          setEditing(null);
          if (!id || id === "new") return;
          void softDelete({ id })
            .then(() => toast.show("הצבע עבר לפח"))
            .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
        }}
      />
    </>
  );
}
