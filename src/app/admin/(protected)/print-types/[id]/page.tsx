"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";

import { api, type Doc, type Id } from "@/app/admin/_lib/convex";
import { Money } from "@/app/admin/_components/Money";
import {
  buildEngineConfig,
  liveKnobs,
  previewUnitAgorot,
  publishedOrNull,
  usePricingSources,
} from "@/app/admin/_lib/usePricing";
import { DangerDialog } from "@/components/admin/Dialogs";
import { ACCENT_HE } from "@/components/admin/format";
import { errorHe, V } from "@/components/admin/messages";
import { SaveBar, useUnsavedChanges } from "@/components/admin/SaveBar";
import { useToast } from "@/components/admin/Toast";
import {
  ActionButton,
  Card,
  Field,
  HelpNote,
  LoadingBlock,
  MoneyField,
  Note,
  NumberField,
  NumberStepper,
  PageHeader,
  Segmented,
  SelectField,
  TextAreaField,
  TextField,
  Toggle,
} from "@/components/admin/ui";

/**
 * עורך סוג הדפסה, 06 §C.9.
 *
 * The screen where the base price of everything lives, so it is explicit save
 * with a leave guard, and every number is shown next to what it does to a real
 * price. The live line under the base price and beside every size runs
 * `convex/lib/priceEngine.ts` in the browser, which is the same module the server
 * runs, so the number that moves while he types is the number a customer gets.
 *
 * Sizes are stored inside the print type document, so a size edit is one write.
 * They are still collected into the form and sent on save rather than on each
 * keystroke: RESOLUTIONS and 06 §C.19 both put anything touching money behind an
 * explicit press.
 */

type PrintType = Doc<"printTypes">;
type SizeRow = PrintType["sizes"][number];
type Accent = PrintType["accent"];
type Geometry = PrintType["previewGeometry"];

type Form = {
  nameHe: string;
  shortHe: string;
  descriptionHe: string;
  basePriceAgorot: number;
  maxColors: number;
  requiresPhoto: boolean;
  refGrams: number;
  refHours: number;
  complexity: number;
  volumeExponent: number;
  previewGeometry: Geometry;
  displacementScale: number;
  invertHeight: boolean;
  planeSegments: number;
  backlitPreview: boolean;
  accent: Accent;
  sizes: SizeRow[];
};

const GEOMETRY_HE: Record<Geometry, string> = {
  plane: "לוח שטוח",
  cylinder: "גליל",
  keychain: "מחזיק מפתחות",
  magnet: "מגנט",
  framed: "במסגרת",
  standee: "דמות עומדת",
};

function toForm(type: PrintType): Form {
  return {
    nameHe: type.nameHe,
    shortHe: type.shortHe,
    descriptionHe: type.descriptionHe,
    basePriceAgorot: type.basePriceAgorot,
    maxColors: type.maxColors,
    requiresPhoto: type.requiresPhoto,
    refGrams: type.refGrams,
    refHours: type.refHours,
    complexity: type.complexity,
    volumeExponent: type.volumeExponent,
    previewGeometry: type.previewGeometry,
    displacementScale: type.displacementScale,
    invertHeight: type.invertHeight,
    planeSegments: type.planeSegments,
    backlitPreview: type.backlitPreview,
    accent: type.accent,
    sizes: type.sizes.map((size) => ({ ...size })),
  };
}

export default function PrintTypeEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"printTypes">;
  const router = useRouter();
  const toast = useToast();

  const { printTypes, colors, published } = usePricingSources();
  const materialsPresent = publishedOrNull(published)?.materials.length ?? 0;

  const update = useMutation(api.printTypes.update);
  const upsertSize = useMutation(api.printTypes.upsertSize);
  const removeSize = useMutation(api.printTypes.removeSize);
  const setActive = useMutation(api.printTypes.setActive);
  const softDelete = useMutation(api.printTypes.softDelete);
  const recompute = useMutation(api.printTypes.recomputeFromPrices);

  const type = (printTypes ?? []).find((row) => row._id === id);
  const baseline = React.useMemo(() => (type ? toForm(type) : null), [type]);

  const [form, setForm] = React.useState<Form | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (baseline && form === null) setForm(baseline);
  }, [baseline, form]);

  const dirty =
    form !== null && baseline !== null && JSON.stringify(form) !== JSON.stringify(baseline);
  const { guard } = useUnsavedChanges(dirty);

  /* the live engine, fed with the unsaved numbers */
  const config = React.useMemo(() => {
    if (!type || !form) return null;
    const patched: PrintType = {
      ...type,
      basePriceAgorot: form.basePriceAgorot,
      refGrams: form.refGrams,
      refHours: form.refHours,
      complexity: form.complexity,
      volumeExponent: form.volumeExponent,
      maxColors: form.maxColors,
      sizes: form.sizes,
    };
    return buildEngineConfig({
      knobs: liveKnobs(published),
      printTypes: [patched],
      colors: colors ?? [],
      published: publishedOrNull(published),
    });
  }, [type, form, colors, published]);

  if (printTypes === undefined) return <LoadingBlock rows={4} />;
  if (!type || !form) {
    return (
      <>
        <PageHeader title="לא מצאתי את סוג ההדפסה" backHref="/admin/print-types" backLabelHe="לרשימה" />
        <Card>
          <p className="a-muted">אפשר לחזור לרשימה ולבחור סוג אחר.</p>
        </Card>
      </>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const setSize = (index: number, patch: Partial<SizeRow>) =>
    setForm((current) =>
      current
        ? {
            ...current,
            sizes: current.sizes.map((size, at) => (at === index ? { ...size, ...patch } : size)),
          }
        : current,
    );

  const priceError =
    form.basePriceAgorot < 500
      ? "מחיר בסיס חייב להיות לפחות 5 ש״ח"
      : form.basePriceAgorot > 500000
        ? "מחיר בסיס עד 5,000 ש״ח"
        : undefined;

  /* A type with no active size cannot be SHOWN, which `printTypes.setActive`
     already refuses. Blocking the save as well would trap a hidden type that is
     mid-repair, so the floor applies only while it is live. */
  const sizeError = form.sizes.some((size) => size.multiplier < 0.2 || size.multiplier > 10)
    ? "מכפיל גודל חייב להיות בין 0.2 ל-10"
    : type.active && form.sizes.filter((size) => size.active).length === 0
      ? V.needOneSize
      : undefined;

  const blocked = priceError ?? sizeError;
  const middle = config ? previewUnitAgorot({ config, printTypeKey: type.key }) : null;

  async function save() {
    if (!form || blocked) return;
    setSaving(true);
    try {
      const beforeKeys = new Set(type!.sizes.map((size) => size.key));
      const afterKeys = new Set(form.sizes.map((size) => size.key));

      /* The server keeps `sizes` sorted by `sortOrder`, so the order on screen is
         written as the order of the rows. The same normalised list goes back into
         the form below, or the form would stay dirty for ever against a document
         that only differs by the sort numbers it just assigned. */
      const normalised = form.sizes.map((size, index) => ({
        ...size,
        sortOrder: (index + 1) * 100,
      }));

      for (const size of type!.sizes) {
        if (!afterKeys.has(size.key)) {
          await removeSize({ printTypeId: id, key: size.key });
        }
      }
      for (const size of normalised) {
        const previous = type!.sizes.find((row) => row.key === size.key);
        if (!beforeKeys.has(size.key) || JSON.stringify(previous) !== JSON.stringify(size)) {
          await upsertSize({ printTypeId: id, size });
        }
      }

      await update({
        id,
        patch: {
          nameHe: form.nameHe.trim(),
          shortHe: form.shortHe.trim(),
          descriptionHe: form.descriptionHe.trim(),
          basePriceAgorot: form.basePriceAgorot,
          maxColors: form.maxColors,
          requiresPhoto: form.requiresPhoto,
          refGrams: form.refGrams,
          refHours: form.refHours,
          complexity: form.complexity,
          volumeExponent: form.volumeExponent,
          previewGeometry: form.previewGeometry,
          displacementScale: form.displacementScale,
          invertHeight: form.invertHeight,
          planeSegments: form.planeSegments,
          backlitPreview: form.backlitPreview,
          accent: form.accent,
        },
      });

      /* RESOLUTIONS §8: the `מתחיל מ-` chip is the engine's answer on the
         cheapest configuration, so it is recomputed whenever a base price or a
         size moved. */
      await recompute({});
      setForm((current) =>
        current
          ? {
              ...current,
              nameHe: current.nameHe.trim(),
              shortHe: current.shortHe.trim(),
              descriptionHe: current.descriptionHe.trim(),
              sizes: normalised,
            }
          : current,
      );
      toast.show(V.saved);
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={type.nameHe}
        helpHe={type.active ? "מוצג במחולל" : "מוסתר מהמחולל"}
        backHref="/admin/print-types"
        backLabelHe="לכל הסוגים"
        actions={
          <ActionButton
            tone={type.active ? "quiet" : "primary"}
            onClick={() => {
              void setActive({ id, active: !type.active })
                .then(() => toast.show(type.active ? "הוסתר" : "מוצג עכשיו"))
                .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
            }}
          >
            {type.active ? "להסתיר" : "להציג"}
          </ActionButton>
        }
      />

      <div className="a-stack" style={{ paddingBlockEnd: dirty ? "5rem" : undefined }}>
        <Card title="פרטים">
          <div className="a-fields" data-cols="2">
            <TextField
              label="שם"
              value={form.nameHe}
              onChange={(value) => set("nameHe", value)}
              maxLength={30}
            />
            <TextField
              label="שורה אחת מתחת לשם"
              hint="זה מה שכתוב על הכרטיס במחולל"
              value={form.shortHe}
              onChange={(value) => set("shortHe", value)}
              maxLength={60}
            />
          </div>
          <div style={{ marginBlockStart: "0.75rem" }}>
            <TextAreaField
              label="הסבר"
              value={form.descriptionHe}
              onChange={(value) => set("descriptionHe", value)}
              rows={4}
              maxLength={400}
            />
          </div>
          <div style={{ marginBlockStart: "0.75rem", maxInlineSize: "16rem" }}>
            <SelectField
              label="צבע מלווה"
              value={form.accent}
              options={(["none", "red", "turquoise", "yellow", "ink"] as Accent[]).map((value) => ({
                value,
                labelHe: ACCENT_HE[value],
              }))}
              onChange={(value) => set("accent", value)}
            />
          </div>
        </Card>

        <Card title="מחיר בסיס" helpHe="האיבר הקבוע בנוסחה. המחיר הסופי תמיד גבוה ממנו.">
          <div className="a-stack">
            <MoneyField
              label="מחיר בסיס"
              agorot={form.basePriceAgorot}
              onChange={(value) => set("basePriceAgorot", value)}
              error={priceError}
              minAgorot={500}
              maxAgorot={500000}
            />
            {middle ? (
              <p className="a-muted">
                {`בגודל ${middle.sizeLabelHe}, חומר רגיל, צבע אחד, יחידה אחת: `}
                <Money agorot={middle.agorot} strong live announce />
              </p>
            ) : (
              <p className="a-muted">
                המחיר החי יופיע כשיהיה גודל פעיל אחד לפחות וצבע אחד במלאי.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="גדלים"
          helpHe="המכפיל הוא כמה פעמים הגודל הזה גדול מגודל הייחוס, לא כמה הוא עולה."
          actions={
            <ActionButton
              size="sm"
              tone="quiet"
              onClick={() => {
                const last = form.sizes[form.sizes.length - 1];
                const used = new Set(form.sizes.map((size) => size.key));
                let index = form.sizes.length + 1;
                while (used.has(`s${index}`)) index += 1;
                set("sizes", [
                  ...form.sizes,
                  {
                    ...(last ?? {
                      widthMm: 100,
                      heightMm: 100,
                      depthMm: 3,
                      multiplier: 1,
                      estimatedGrams: 40,
                      estimatedMinutes: 120,
                    }),
                    key: `s${index}`,
                    labelHe: "גודל חדש",
                    sortOrder: (form.sizes.length + 1) * 100,
                    active: true,
                  } as SizeRow,
                ]);
              }}
            >
              להוסיף גודל
            </ActionButton>
          }
        >
          <div className="a-stack">
            {sizeError ? <Note tone="danger">{sizeError}</Note> : null}

            {form.sizes.map((size, index) => {
              const live = config
                ? previewUnitAgorot({ config, printTypeKey: type.key, sizeKey: size.key })
                : null;
              return (
                <div key={size.key} className="a-card" style={{ boxShadow: "none" }}>
                  <div className="a-fields" data-cols="2">
                    <TextField
                      label="שם הגודל"
                      value={size.labelHe}
                      onChange={(value) => setSize(index, { labelHe: value })}
                      maxLength={24}
                    />
                    <NumberField
                      label="מכפיל מול גודל הייחוס"
                      value={size.multiplier}
                      step={0.1}
                      min={0.2}
                      max={10}
                      onChange={(value) => setSize(index, { multiplier: value })}
                    />
                  </div>

                  <div className="a-fields" data-cols="3" style={{ marginBlockStart: "0.5rem" }}>
                    <NumberField
                      label="רוחב במ״מ"
                      value={size.widthMm}
                      step={1}
                      min={1}
                      onChange={(value) => setSize(index, { widthMm: value })}
                    />
                    <NumberField
                      label="גובה במ״מ"
                      value={size.heightMm}
                      step={1}
                      min={1}
                      onChange={(value) => setSize(index, { heightMm: value })}
                    />
                    <NumberField
                      label="עומק במ״מ"
                      value={size.depthMm}
                      step={0.5}
                      min={0.5}
                      onChange={(value) => setSize(index, { depthMm: value })}
                    />
                  </div>

                  <div className="a-row" style={{ flexWrap: "wrap", marginBlockStart: "0.5rem" }}>
                    <Toggle
                      label="פעיל"
                      checked={size.active}
                      onChange={(value) => setSize(index, { active: value })}
                    />
                    <span className="a-grow" />
                    {live ? (
                      <span className="a-muted">
                        יוצא <Money agorot={live.agorot} strong announce={false} />
                      </span>
                    ) : null}
                    <ActionButton
                      size="sm"
                      tone="danger"
                      onClick={() =>
                        set(
                          "sizes",
                          form.sizes.filter((row) => row.key !== size.key),
                        )
                      }
                    >
                      להסיר
                    </ActionButton>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="צבעים וחומרים">
          <div className="a-row" style={{ flexWrap: "wrap" }}>
            <NumberStepper
              label="כמה צבעים אפשר לבחור"
              value={form.maxColors}
              min={1}
              max={8}
              onChange={(value) => set("maxColors", value)}
            />
            <Toggle
              label="חייב תמונה מהלקוח"
              checked={form.requiresPhoto}
              onChange={(value) => set("requiresPhoto", value)}
            />
          </div>
          <p className="a-muted" style={{ marginBlockStart: "0.5rem" }}>
            חומרים מותרים לסוג הזה: <bdi dir="ltr">{type.allowedMaterialIds.length}</bdi> מתוך{" "}
            <bdi dir="ltr">{materialsPresent}</bdi>. בחירת החומרים תיפתח כאן יחד עם מסך החומרים.
          </p>
        </Card>

        <Card title="מודל העלות" helpHe="שני מספרים מהסלייסר לגודל הייחוס. כל השאר נגזר מהם.">
          <div className="a-fields" data-cols="2">
            <NumberField
              label="גרמים בגודל הייחוס"
              value={form.refGrams}
              step={1}
              min={1}
              onChange={(value) => set("refGrams", value)}
            />
            <NumberField
              label="שעות בגודל הייחוס"
              value={form.refHours}
              step={0.1}
              min={0.1}
              onChange={(value) => set("refHours", value)}
            />
            <NumberField
              label="מקדם מורכבות"
              hint="1.00 עד 1.45. מכפיל רק את החלק המשתנה"
              value={form.complexity}
              step={0.05}
              min={1}
              max={3}
              onChange={(value) => set("complexity", value)}
            />
            <NumberField
              label="מעריך נפח"
              hint="2.0 ללוח שטוח, 2.4 למחזיק, 2.6 לדמות"
              value={form.volumeExponent}
              step={0.1}
              min={1}
              max={3.5}
              onChange={(value) => set("volumeExponent", value)}
            />
          </div>
        </Card>

        <Card title="תצוגת תלת מימד">
          <div className="a-stack">
            <SelectField
              label="צורה"
              value={form.previewGeometry}
              options={(Object.keys(GEOMETRY_HE) as Geometry[]).map((value) => ({
                value,
                labelHe: GEOMETRY_HE[value],
              }))}
              onChange={(value) => set("previewGeometry", value)}
            />

            <Field
              label={`עומק ההבלטה: ${form.displacementScale.toFixed(2)}`}
              hint="כמה התמונה בולטת מהמשטח"
              htmlFor="displacement"
            >
              <input
                id="displacement"
                type="range"
                min={0.02}
                max={0.6}
                step={0.01}
                value={form.displacementScale}
                onChange={(event) => set("displacementScale", Number(event.target.value))}
                style={{ inlineSize: "100%", minBlockSize: "3rem", accentColor: "#0b7a75" }}
              />
            </Field>

            <Segmented
              label="כמה חלק"
              hint="יותר חלק, יותר כבד לטלפון"
              value={form.planeSegments}
              options={[
                { value: 128, labelHe: "טוב" },
                { value: 256, labelHe: "יפה" },
                { value: 512, labelHe: "הכי חלק" },
              ]}
              onChange={(value) => set("planeSegments", value)}
            />

            <div className="a-row" style={{ flexWrap: "wrap" }}>
              <Toggle
                label="הפוך גובה (לליתופן)"
                checked={form.invertHeight}
                onChange={(value) => set("invertHeight", value)}
              />
              <Toggle
                label="תצוגה עם אור מאחור"
                checked={form.backlitPreview}
                onChange={(value) => set("backlitPreview", value)}
              />
            </div>

            {type.key === "glow" && form.backlitPreview ? (
              <Note>
                זוהר הוא תבליט בפילמנט זוהר, לא ליתופן מואר מאחור. עדיף להשאיר את האור מאחור כבוי.
              </Note>
            ) : null}
          </div>
        </Card>

        <Card title="מחיקה">
          <ActionButton tone="danger" onClick={() => setDeleting(true)}>
            להעביר לפח
          </ActionButton>
        </Card>

        {published.status === "absent" ? (
          <HelpNote>
            המחירון המלא נקרא מהשרת דרך <bdi dir="ltr">pricing.publicConfig</bdi>. עד שהוא זמין,
            המחירים החיים כאן מחושבים לפי הגדרות ההתחלה של המנוע.
          </HelpNote>
        ) : null}
      </div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
        onReset={() => setForm(baseline)}
        blockedReasonHe={blocked}
      />
      {guard}

      <DangerDialog
        open={deleting}
        titleHe={`להעביר את «${type.nameHe}» לפח?`}
        bodyHe="הסוג ייעלם מהמחולל. אפשר לשחזר מהפח במשך 30 יום."
        confirmHe="להעביר לפח"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          void softDelete({ id })
            .then(() => {
              toast.show("עבר לפח");
              router.push("/admin/print-types");
            })
            .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
        }}
      />
    </>
  );
}
