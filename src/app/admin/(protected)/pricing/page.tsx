"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "convex/react";

import { api, type Id } from "@/app/admin/_lib/convex";
import { Money, DeltaChip } from "@/app/admin/_components/Money";
import { PriceLab, labSummary } from "@/app/admin/_components/PriceLab";
import {
  ROUND_TO_OPTIONS,
  SAMPLE_INPUTS,
  assertConfigSane,
  buildEngineConfig,
  diffKnobs,
  percentDelta,
  priceSample,
  type PriceEngineConfig,
  type PricingKnobs,
  type SampleInput,
} from "@/app/admin/_lib/engine";
import { useOptionalMutation, useOptionalQuery } from "@/app/admin/_lib/optional";
import { liveKnobs, publishedOrNull, usePricingSources } from "@/app/admin/_lib/usePricing";
import { DangerDialog } from "@/components/admin/Dialogs";
import { bpToPercent, percentToBp } from "@/components/admin/format";
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
  NumberStepper,
  PageHeader,
  Segmented,
  TextAreaField,
  TextField,
  Toggle,
} from "@/components/admin/ui";

/**
 * מחירים, 06 §C.12. The most important screen in the project.
 *
 * What it has to do: let a thirteen year old change what he earns per print, see
 * the consequence before it is real, and make it impossible to publish something
 * absurd.
 *
 * HOW THE THREE PIECES FIT
 *
 * 1. The lab runs `convex/lib/priceEngine.ts` in the browser on two
 *    configurations: what is live, and what he is editing. Nothing in it writes.
 * 2. The guards are `assertConfigSane` from the same module. Hard errors disable
 *    the save and print the reason next to the button; soft warnings need one
 *    extra tap on a dialog that quotes the actual numbers.
 * 3. The writes are split, because the backend splits them:
 *      base prices live on `printTypes` and there is no draft channel for them,
 *      so they are saved by `printTypes.update` and are LIVE the moment they are
 *      saved. The screen says so above the table rather than implying a staging
 *      area that does not exist.
 *      the knobs live on `pricingConfig.draft` and go through
 *      `pricing.updateDraft` and then `pricing.publish` (06 §A.4). Those two
 *      functions are addressed by name through `useOptionalQuery` /
 *      `useOptionalMutation`, so this screen works today as a calculator and a
 *      base price editor, and starts saving knobs the day that module lands,
 *      with no edit here.
 */

type Form = {
  knobs: PricingKnobs;
  /** by print type key, because that is what the engine keys on */
  basePrices: Record<string, number>;
  disclaimerHe: string;
};

const ROUND_LABELS: Record<number, string> = {
  1: "אגורה",
  10: "10 אגורות",
  50: "50 אגורות",
  100: "1 ש״ח",
  500: "5 ש״ח",
  1000: "10 ש״ח",
};

const KNOBS_ABSENT_HE =
  "השמירה של המספרים האלה עוד לא פתוחה בשרת. מחירי הבסיס נשמרו, והמעבדה כאן מחשבת נכון.";

export default function PricingPage() {
  const toast = useToast();
  const { printTypes, colors, published } = usePricingSources();

  /* the draft channel, when convex/pricing.ts grows its admin half */
  const [draftState, reloadDraft] = useOptionalQuery<PriceEngineConfig>("pricing:draftConfig", {});
  const [lastReal] = useOptionalQuery<(SampleInput & { labelHe?: string }) | null>(
    "pricing:lastRealConfig",
    {},
  );

  const updateDraft = useOptionalMutation("pricing:updateDraft", KNOBS_ABSENT_HE);
  const publishDraft = useOptionalMutation(
    "pricing:publish",
    "הפרסום עוד לא פתוח בשרת. מחירי הבסיס כבר חיים באתר.",
  );
  const discardDraft = useOptionalMutation(
    "pricing:discardDraft",
    "ביטול הטיוטה עוד לא פתוח בשרת.",
  );

  const updatePrintType = useMutation(api.printTypes.update);
  const recompute = useMutation(api.printTypes.recomputeFromPrices);

  const [form, setForm] = React.useState<Form | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [warningOpen, setWarningOpen] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);
  const [noteHe, setNoteHe] = React.useState("");
  const [labOpen, setLabOpen] = React.useState(false);

  const baselineKnobs = React.useMemo<PricingKnobs>(
    () => (draftState.status === "ready" ? draftState.data.config : liveKnobs(published)),
    [draftState, published],
  );

  const baselineBasePrices = React.useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const type of printTypes ?? []) map[type.key] = type.basePriceAgorot;
    return map;
  }, [printTypes]);

  const baseline = React.useMemo<Form | null>(
    () =>
      printTypes === undefined
        ? null
        : { knobs: baselineKnobs, basePrices: baselineBasePrices, disclaimerHe: "" },
    [printTypes, baselineKnobs, baselineBasePrices],
  );

  React.useEffect(() => {
    if (baseline && form === null) setForm(baseline);
  }, [baseline, form]);

  const dirty =
    form !== null && baseline !== null && JSON.stringify(form) !== JSON.stringify(baseline);
  const { guard } = useUnsavedChanges(dirty);

  /* ---------------------------------------------------------- the engine */

  const beforeConfig = React.useMemo<PriceEngineConfig | null>(() => {
    if (printTypes === undefined || colors === undefined) return null;
    if (draftState.status === "ready") return draftState.data;
    return buildEngineConfig({
      knobs: baselineKnobs,
      printTypes,
      colors,
      published: publishedOrNull(published),
    });
  }, [printTypes, colors, draftState, baselineKnobs, published]);

  const afterConfig = React.useMemo<PriceEngineConfig | null>(() => {
    if (!form || printTypes === undefined || colors === undefined) return null;
    if (draftState.status === "ready") {
      return {
        ...draftState.data,
        config: form.knobs,
        printTypes: draftState.data.printTypes.map((type) => ({
          ...type,
          basePriceAgorot: form.basePrices[type.key] ?? type.basePriceAgorot,
        })),
      };
    }
    return buildEngineConfig({
      knobs: form.knobs,
      printTypes,
      colors,
      published: publishedOrNull(published),
      basePriceOverrides: form.basePrices,
    });
  }, [form, printTypes, colors, draftState, published]);

  /* ---------------------------------------------------------- the guards */

  const report = React.useMemo(
    () => (afterConfig ? assertConfigSane(afterConfig) : { errors: [], warnings: [] }),
    [afterConfig],
  );

  const sampleMoves = React.useMemo(() => {
    if (!beforeConfig || !afterConfig) return [];
    return SAMPLE_INPUTS.map((sample) => {
      const before = priceSample(sample, beforeConfig);
      const after = priceSample(sample, afterConfig);
      if (!before.ok || !after.ok) return null;
      return {
        labelHe: sample.labelHe,
        before: before.breakdown.totalAgorot,
        after: after.breakdown.totalAgorot,
        percent: percentDelta(before.breakdown.totalAgorot, after.breakdown.totalAgorot) ?? 0,
      };
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [beforeConfig, afterConfig]);

  const softWarnings = React.useMemo(() => {
    const messages = report.warnings.map((issue) => issue.messageHe);
    for (const move of sampleMoves) {
      if (Math.abs(move.percent) > 40) {
        messages.push(
          `הדוגמה «${move.labelHe}» עוברת מ-${Math.round(move.before / 100)} ש״ח ל-${Math.round(
            move.after / 100,
          )} ש״ח. זאת קפיצה של ${Math.abs(move.percent)}%.`,
        );
      }
    }
    if (sampleMoves.length > 0 && sampleMoves.every((move) => move.percent < -25)) {
      messages.push("כל המחירים יורדים בהרבה. כדאי לבדוק שזה מה שרצית.");
    }
    if (form?.knobs.rushEnabled && form.knobs.rushPercentBp === 0) {
      messages.push("דחוף מופעל אבל לא מוסיף כלום.");
    }
    return messages;
  }, [report.warnings, sampleMoves, form]);

  const blocked = report.errors[0]?.messageHe;

  /* ---------------------------------------------------------- the samples */

  const samples = React.useMemo<SampleInput[]>(() => {
    const list = [...SAMPLE_INPUTS];
    if (lastReal.status === "ready" && lastReal.data) {
      list.unshift({
        ...lastReal.data,
        labelHe: "התצורה האחרונה שמישהו בנה",
      });
    }
    return list;
  }, [lastReal]);

  /* ---------------------------------------------------------- saving */

  async function persist() {
    if (!form || !baseline) return;
    setSaving(true);
    let knobsSaved = true;
    try {
      const changedTypes = (printTypes ?? []).filter(
        (type) => (form.basePrices[type.key] ?? type.basePriceAgorot) !== type.basePriceAgorot,
      );
      for (const type of changedTypes) {
        await updatePrintType({
          id: type._id as Id<"printTypes">,
          patch: { basePriceAgorot: form.basePrices[type.key] },
        });
      }
      if (changedTypes.length > 0) await recompute({});

      try {
        await updateDraft({
          patch: {
            ...form.knobs,
            ...(form.disclaimerHe.trim() ? { priceDisclaimerHe: form.disclaimerHe.trim() } : {}),
          },
        });
        reloadDraft();
      } catch (thrown) {
        knobsSaved = false;
        toast.show(errorHe(thrown), { tone: "error" });
      }

      if (knobsSaved) toast.show(V.saved);
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  function requestSave() {
    if (blocked) return;
    if (softWarnings.length > 0) {
      setWarningOpen(true);
      return;
    }
    void persist();
  }

  async function doPublish() {
    setSaving(true);
    try {
      await publishDraft({ noteHe: noteHe.trim() || undefined });
      toast.show("פורסם");
      setReviewing(false);
      setNoteHe("");
      reloadDraft();
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (!form || !beforeConfig || !afterConfig || printTypes === undefined) {
    return (
      <>
        <PageHeader title="מחירים" />
        <LoadingBlock rows={4} />
      </>
    );
  }

  const set = (patch: Partial<PricingKnobs>) =>
    setForm((current) => (current ? { ...current, knobs: { ...current.knobs, ...patch } } : current));

  const setBase = (key: string, agorot: number) =>
    setForm((current) =>
      current ? { ...current, basePrices: { ...current.basePrices, [key]: agorot } } : current,
    );

  const knobs = form.knobs;
  const liveVersion = publishedOrNull(published)?.version ?? null;
  const draftVersion = draftState.status === "ready" ? draftState.data.version : null;
  const unpublished = draftVersion !== null && liveVersion !== null && draftVersion !== liveVersion;
  const summary = labSummary(samples[0], beforeConfig, afterConfig);
  const knobsOffline = draftState.status === "absent";

  /* ---------------------------------------------------------- the review */

  if (reviewing) {
    const changes = diffKnobs(baselineKnobs, knobs);
    const priceChanges = (printTypes ?? [])
      .filter((type) => (form.basePrices[type.key] ?? 0) !== type.basePriceAgorot)
      .map((type) => ({
        labelHe: `מחיר בסיס, ${type.nameHe}`,
        beforeHe: `${Math.round(type.basePriceAgorot / 100)} ש״ח`,
        afterHe: `${Math.round((form.basePrices[type.key] ?? 0) / 100)} ש״ח`,
      }));

    return (
      <>
        <PageHeader
          title="לפני שמפרסמים"
          helpHe="כל מה שהשתנה, ומה זה עושה לשש הדוגמאות."
          backHref="/admin/pricing"
          backLabelHe="חזרה למחירים"
          actions={
            <ActionButton tone="quiet" onClick={() => setReviewing(false)}>
              חזרה לעריכה
            </ActionButton>
          }
        />

        <div className="a-stack">
          <Card title="מה השתנה">
            {changes.length === 0 && priceChanges.length === 0 ? (
              <p className="a-muted">שום דבר לא השתנה מאז הפרסום האחרון.</p>
            ) : (
              <div className="a-scroll-x">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th scope="col">מה</th>
                      <th scope="col">היה</th>
                      <th scope="col">יהיה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...priceChanges, ...changes].map((change, index) => (
                      <tr key={index}>
                        <th scope="row" style={{ fontWeight: 400, color: "var(--admin-ink)" }}>
                          {change.labelHe}
                        </th>
                        <td className="a-muted">
                          <bdi>{change.beforeHe}</bdi>
                        </td>
                        <td>
                          <bdi>{change.afterHe}</bdi>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="שש הדוגמאות">
            <div className="a-stack" style={{ gap: "0.5rem" }}>
              {sampleMoves.map((move) => (
                <div key={move.labelHe} className="a-barrow">
                  <span style={{ fontSize: "0.8125rem" }}>{move.labelHe}</span>
                  <span className="a-row" style={{ gap: "0.5rem" }}>
                    <Money agorot={move.before} announce={false} tone="muted" />
                    <span aria-hidden="true">←</span>
                    <Money agorot={move.after} announce={false} strong />
                  </span>
                  <DeltaChip percent={move.percent} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="מה שינית ולמה" helpHe="שורה אחת שתעזור לך להבין בעוד חודש למה עשית את זה.">
            <TextAreaField label="הערה" value={noteHe} onChange={setNoteHe} rows={3} maxLength={200} />
          </Card>

          {report.errors.length > 0 ? (
            <Note tone="danger">{report.errors[0].messageHe}</Note>
          ) : null}

          <div className="a-row">
            <ActionButton
              tone="primary"
              disabled={saving || report.errors.length > 0}
              onClick={() => void doPublish()}
            >
              {saving ? "רגע אחד" : "לפרסם עכשיו"}
            </ActionButton>
            <ActionButton tone="quiet" onClick={() => setReviewing(false)}>
              עוד לא
            </ActionButton>
          </div>
        </div>
      </>
    );
  }

  /* ---------------------------------------------------------- the screen */

  return (
    <>
      <PageHeader
        title="מחירים"
        helpHe={
          liveVersion !== null ? `גרסה ${liveVersion} חיה באתר` : "המחירון שהאתר עובד לפיו"
        }
        actions={
          <ActionButton tone="quiet" onClick={() => setReviewing(true)}>
            לפרסם
          </ActionButton>
        }
      />

      {unpublished ? (
        <Note>
          <div className="a-row" style={{ flexWrap: "wrap" }}>
            <span className="a-grow">יש שינויים שלא פורסמו</span>
            <ActionButton size="sm" tone="primary" onClick={() => setReviewing(true)}>
              לפרסם
            </ActionButton>
            <ActionButton
              size="sm"
              tone="quiet"
              onClick={() => {
                void discardDraft({})
                  .then(() => {
                    reloadDraft();
                    setForm(baseline);
                    toast.show("הטיוטה בוטלה");
                  })
                  .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
              }}
            >
              לבטל שינויים
            </ActionButton>
          </div>
        </Note>
      ) : null}

      <div className="a-two">
        {/* ------------------------------------------------ the controls */}
        <div className="a-col" style={{ paddingBlockEnd: dirty ? "8rem" : "5rem" }}>
          {knobsOffline ? (
            <HelpNote>
              המספרים הכלליים כאן נטענו מהגדרות ההתחלה של המנוע, כי מסך המחירים בשרת עוד לא נפתח.
              מחירי הבסיס למטה כן נקראים מהאתר ונשמרים אליו.
            </HelpNote>
          ) : null}

          <Card
            title="מחיר בסיס לכל סוג הדפסה"
            helpHe="נשמר ישר לאתר, בלי טיוטה. זה אותו שדה שנמצא במסך סוגי ההדפסה."
          >
            <div className="a-stack">
              {(printTypes ?? []).map((type) => (
                <div key={type._id} className="a-row" style={{ flexWrap: "wrap" }}>
                  <span className="a-grow" style={{ minInlineSize: "7rem" }}>
                    {type.nameHe}
                    {!type.active ? <span className="a-muted"> · מוסתר</span> : null}
                  </span>
                  <div style={{ inlineSize: "min(12rem, 100%)" }}>
                    <MoneyField
                      label={`מחיר בסיס, ${type.nameHe}`}
                      agorot={form.basePrices[type.key] ?? type.basePriceAgorot}
                      onChange={(value) => setBase(type.key, value)}
                      minAgorot={500}
                      maxAgorot={500000}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="גדלים" helpHe="הגדלים נערכים בתוך כל סוג, כדי שלא יהיו שני מסכים לאותו מספר.">
            <ul className="a-list">
              {(printTypes ?? []).map((type) => (
                <li key={type._id} className="a-item">
                  <span className="a-grow">{type.nameHe}</span>
                  <span className="a-muted a-num">
                    <bdi dir="ltr">{type.sizes.filter((size) => size.active).length}</bdi> גדלים
                  </span>
                  <Link href={`/admin/print-types/${type._id}`}>לפתוח</Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="צבעים">
            <div className="a-stack">
              <NumberStepper
                label="כמה צבעים כלולים במחיר"
                value={knobs.freeColorCount}
                min={0}
                max={8}
                onChange={(value) => set({ freeColorCount: value })}
              />
              <MoneyField
                label="מחיר לכל צבע נוסף"
                agorot={knobs.extraColorAgorot}
                onChange={(value) => set({ extraColorAgorot: value })}
                minAgorot={0}
                maxAgorot={20000}
              />
              <p className="a-muted">
                מי שיבחר 6 צבעים ישלם{" "}
                <Money
                  agorot={Math.max(0, 6 - knobs.freeColorCount) * knobs.extraColorAgorot}
                  strong
                  announce={false}
                />{" "}
                יותר.
              </p>
            </div>
          </Card>

          <Card title="עלות והכנסה" helpHe="שני מספרים מהמכונה, ומכפיל אחד שמרים את הכול.">
            <div className="a-fields" data-cols="2">
              <MoneyField
                label="עלות פילמנט לגרם"
                agorot={knobs.filamentCostPerGramAgorot}
                onChange={(value) => set({ filamentCostPerGramAgorot: value })}
                minAgorot={1}
              />
              <MoneyField
                label="עלות שעת מכונה"
                agorot={knobs.machineRatePerHourAgorot}
                onChange={(value) => set({ machineRatePerHourAgorot: value })}
                minAgorot={0}
              />
              <MoneyField
                label="הכנה וחיתוך, פעם אחת להזמנה"
                agorot={knobs.setupFeeAgorot}
                onChange={(value) => set({ setupFeeAgorot: value })}
                minAgorot={0}
              />
              <Field label="פחת פילמנט" hint="אחוז. כולל תמיכות, ניקוי ראש והדפסות שנכשלו">
                <input
                  className="a-input"
                  dir="ltr"
                  inputMode="decimal"
                  value={bpToPercent(knobs.filamentWasteBp)}
                  onChange={(event) => {
                    const next = percentToBp(event.target.value);
                    if (next !== null) set({ filamentWasteBp: next });
                  }}
                />
              </Field>
              <Field label="מכפיל הרווח" hint="1.35 אומר שכל מחיר עולה ב-35 אחוז מעל העלות">
                <input
                  className="a-input"
                  dir="ltr"
                  inputMode="decimal"
                  value={(knobs.marginMultiplierBp / 10000).toFixed(2)}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value > 0) {
                      set({ marginMultiplierBp: Math.round(value * 10000) });
                    }
                  }}
                />
              </Field>
            </div>
          </Card>

          <Card title="כמויות והנחות">
            <div className="a-stack">
              <NumberStepper
                label="כמות מקסימלית בהזמנה"
                value={knobs.maxQuantity}
                min={1}
                max={99}
                onChange={(value) => set({ maxQuantity: value })}
              />
              <div className="a-scroll-x">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th scope="col">מכמות</th>
                      <th scope="col">הנחה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(publishedOrNull(published)?.quantityTiers ?? []).map((tier) => (
                      <tr key={tier.minQty}>
                        <td>
                          <bdi dir="ltr">{tier.minQty}</bdi>
                        </td>
                        <td>
                          <bdi dir="ltr">{tier.discountBp / 100}%</bdi>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="a-muted">
                מדרגות ההנחה נערכות במסך נפרד שעוד לא נפתח. הן נקראות כאן מהאתר ומשפיעות על המעבדה.
              </p>
            </div>
          </Card>

          <Card title="דחוף" helpHe="האתר מבטיח שלושה ימי עבודה, אז דחוף קיים רק מתחת להבטחה הזאת.">
            <div className="a-stack">
              <Toggle
                label="דחוף פעיל"
                checked={knobs.rushEnabled}
                onChange={(value) => set({ rushEnabled: value })}
              />
              <Field label="תוספת דחוף באחוזים">
                <input
                  className="a-input"
                  dir="ltr"
                  inputMode="decimal"
                  value={bpToPercent(knobs.rushPercentBp)}
                  onChange={(event) => {
                    const next = percentToBp(event.target.value);
                    if (next !== null) set({ rushPercentBp: next });
                  }}
                />
              </Field>
              <div className="a-fields" data-cols="2">
                <MoneyField
                  label="מינימום דחוף"
                  agorot={knobs.rushFeeMinAgorot}
                  onChange={(value) => set({ rushFeeMinAgorot: value })}
                  minAgorot={0}
                />
                <MoneyField
                  label="תקרת דחוף"
                  agorot={knobs.rushFeeMaxAgorot}
                  onChange={(value) => set({ rushFeeMaxAgorot: value })}
                  minAgorot={0}
                />
              </div>
              <TextField
                label="מה כתוב על הדחוף"
                value={knobs.rushLabelHe}
                onChange={(value) => set({ rushLabelHe: value })}
                maxLength={30}
              />
            </div>
          </Card>

          <Card title="משלוח ואיסוף">
            <div className="a-stack">
              <Toggle
                label="איסוף עצמי פעיל"
                checked={knobs.pickupEnabled}
                onChange={(value) => set({ pickupEnabled: value })}
              />
              <TextField
                label="מה כתוב על האיסוף"
                value={knobs.pickupLabelHe}
                onChange={(value) => set({ pickupLabelHe: value })}
                maxLength={40}
              />
              <div className="a-fields" data-cols="2">
                <MoneyField
                  label="מחיר משלוח"
                  agorot={knobs.shippingFlatAgorot}
                  onChange={(value) => set({ shippingFlatAgorot: value })}
                  minAgorot={0}
                />
                <MoneyField
                  label="סף משלוח חינם"
                  agorot={knobs.freeShippingThresholdAgorot}
                  onChange={(value) => set({ freeShippingThresholdAgorot: value })}
                  minAgorot={0}
                />
              </div>
              <p className="a-muted">
                מעל <Money agorot={knobs.freeShippingThresholdAgorot} strong announce={false} />{" "}
                המשלוח חינם.
              </p>
            </div>
          </Card>

          <Card title="עיגול ומינימום">
            <div className="a-stack">
              <Segmented
                label="עיגול"
                value={knobs.roundToAgorot}
                options={ROUND_TO_OPTIONS.map((value) => ({
                  value,
                  labelHe: ROUND_LABELS[value] ?? String(value),
                }))}
                onChange={(value) => set({ roundToAgorot: value })}
              />
              <Segmented
                label="כיוון העיגול"
                value={knobs.roundingMode}
                options={[
                  { value: "up" as const, labelHe: "מעגל למעלה" },
                  { value: "nearest" as const, labelHe: "מעגל לקרוב" },
                ]}
                onChange={(value) => set({ roundingMode: value })}
              />
              <Toggle
                label="לסיים ב-90 אגורות"
                checked={knobs.charmEnding}
                onChange={(value) => set({ charmEnding: value })}
              />
              <MoneyField
                label="הזמנה מינימלית"
                agorot={knobs.minOrderAgorot}
                onChange={(value) => set({ minOrderAgorot: value })}
                minAgorot={1000}
              />
              <MoneyField
                label="תקרת סבירות"
                hint="כל מחיר מעל זה נחשב טעות בהגדרות ולא מחיר"
                agorot={knobs.maxPlausibleTotalAgorot}
                onChange={(value) => set({ maxPlausibleTotalAgorot: value })}
                minAgorot={10000}
              />
            </div>
          </Card>

          <Card title="תוספות">
            <ul className="a-list">
              {(publishedOrNull(published)?.addonRules ?? []).map((rule) => (
                <li key={rule.id} className="a-item">
                  <span className="a-grow">{rule.labelHe}</span>
                  {rule.hintHe ? <span className="a-muted">{rule.hintHe}</span> : null}
                </li>
              ))}
              {(publishedOrNull(published)?.addonRules ?? []).length === 0 ? (
                <li className="a-muted">אין תוספות מוגדרות.</li>
              ) : null}
            </ul>
          </Card>

          <Card title="טקסט מתחת למחיר" helpHe="שורה אחת שהמבקר קורא מתחת לתג המחיר.">
            <TextField
              label="הטקסט"
              value={form.disclaimerHe}
              onChange={(value) =>
                setForm((current) => (current ? { ...current, disclaimerHe: value } : current))
              }
              maxLength={90}
            />
          </Card>

          {report.errors.length > 0 ? (
            <Note tone="danger">
              <ul style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
                {report.errors.map((issue, index) => (
                  <li key={index}>
                    <strong>{issue.fieldHe}</strong> · {issue.messageHe}
                  </li>
                ))}
              </ul>
            </Note>
          ) : null}

          {softWarnings.length > 0 ? (
            <Note>
              <ul style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
                {softWarnings.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </Note>
          ) : null}
        </div>

        {/* ----------------------------------------------------- the lab */}
        <div className="a-col a-stick a-desktop-only-lab">
          <Card title="מעבדת מחיר" helpHe="שום דבר כאן לא נשמר. אפשר לשחק בלי סיכון.">
            <PriceLab beforeConfig={beforeConfig} afterConfig={afterConfig} samples={samples} />
          </Card>
        </div>
      </div>

      {/* The phone bar, always one number, opens the lab as a sheet. It lifts above
          the save bar while the form is dirty, which is exactly when both are on
          screen at once. */}
      <button
        type="button"
        className="a-labbar"
        style={dirty ? { insetBlockEnd: "calc(5.25rem + env(safe-area-inset-bottom))" } : undefined}
        onClick={() => setLabOpen(true)}
      >
        <span className="a-grow" style={{ minInlineSize: 0 }}>
          {summary.labelHe}
        </span>
        {summary.before !== null ? (
          <Money agorot={summary.before} announce={false} tone="muted" />
        ) : null}
        <span aria-hidden="true">←</span>
        {summary.after !== null ? <Money agorot={summary.after} strong announce={false} /> : null}
        <DeltaChip percent={summary.percent} />
        <span aria-hidden="true">▲</span>
        <span className="a-sr">פתיחת מעבדת המחיר</span>
      </button>

      {labOpen ? (
        <div className="a-sheet" onMouseDown={() => setLabOpen(false)}>
          <div
            className="a-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="מעבדת מחיר"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="a-row" style={{ marginBlockEnd: "0.75rem" }}>
              <strong className="a-grow">מעבדת מחיר</strong>
              <button
                type="button"
                className="a-iconbtn"
                aria-label="סגירה"
                onClick={() => setLabOpen(false)}
              >
                ✕︎
              </button>
            </div>
            <PriceLab beforeConfig={beforeConfig} afterConfig={afterConfig} samples={samples} />
          </div>
        </div>
      ) : null}

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={requestSave}
        onReset={() => setForm(baseline)}
        blockedReasonHe={blocked}
      />
      {guard}

      <DangerDialog
        open={warningOpen}
        titleHe="לשמור בכל זאת?"
        bodyHe={softWarnings.join(" ")}
        confirmHe="לשמור"
        cancelHe="לחזור לעריכה"
        onCancel={() => setWarningOpen(false)}
        onConfirm={() => {
          setWarningOpen(false);
          void persist();
        }}
      />
    </>
  );
}
