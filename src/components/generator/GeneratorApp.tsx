"use client";

/**
 * src/components/generator/GeneratorApp.tsx
 *
 * The generator, assembled. Six steps, one at a time, with a rail above and one
 * action below.
 *
 * **Mobile is the layout, not the adaptation.** Doc 04 §B1: below 1024px this is a
 * pure stepper, one step per screen, because a 3D canvas inside a scrolling page eats
 * the touch events and traps the visitor, because the three chunk is only worth
 * downloading once four choices have been made, and because a price that scrolls into
 * frame is not a reveal. Above 1024px the same stepper keeps the start column and a
 * sticky aside mirrors the choices so far.
 *
 * **The step order is the ruling.** `סוג · תמונה · צבעים · גודל · דגם · מחיר`, print
 * type first and photo second, per RESOLUTIONS §ב.1.
 *
 * **The address bar is written with the History API**, never `router.push`, because
 * pushing re-runs the server component and costs a Convex round trip per step on 4G.
 * See the note in `store.tsx`.
 */

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { GENERATOR, GENERATOR_STEPS } from "@/content/generator";
import { suggestFilaments } from "@/lib/three/geometry/colorMapping";

import { StepModel, type BuildPhase } from "./StepModel";
import { GeneratorStyles } from "./Bits";
import { GeneratorDataProvider, useGeneratorData, type InitialCatalogue } from "./data";
import { defaultSizeKey } from "./catalogue";
import { useIsDesktop } from "./hooks";
import { BLOCKED_HINT, MICROCOPY } from "./microcopy";
import { ProgressRail } from "./ProgressRail";
import { StepColors } from "./StepColors";
import { StepPhoto } from "./StepPhoto";
import { StepPrice } from "./StepPrice";
import { StepShell } from "./StepShell";
import { StepSize } from "./StepSize";
import { StepType } from "./StepType";
import {
  GeneratorStoreProvider,
  INITIAL_STATE,
  generatorReducer,
  readStoredState,
  stepFromLocation,
  useHistorySync,
  useGeneratorStore,
  writeStoredState,
} from "./store";
import { STEP_ORDER, stepIndex, type PrintTypeInfo, type StepKey } from "./types";

export function GeneratorApp({ initial }: { initial: InitialCatalogue }) {
  const [state, dispatch] = React.useReducer(generatorReducer, INITIAL_STATE);
  const store = React.useMemo(() => ({ state, dispatch }), [state]);

  /**
   * The step named in the address, read **during** the first client render rather
   * than inside an effect.
   *
   * `useHistorySync` lives in a child, and a child's effects run before a parent's,
   * so by the time the restore below runs the address has already been rewritten to
   * the step the reducer started on. Reading it into a ref while rendering is what
   * keeps a shared `/generator?step=4` link working.
   */
  const urlStep = React.useRef<StepKey | null | undefined>(undefined);
  if (urlStep.current === undefined && typeof window !== "undefined") {
    urlStep.current = stepFromLocation();
  }

  /* The restore, once, on the client. `localStorage` gives the configuration back
     instantly; the photo's public URL arrives a moment later from the draft. */
  const restored = React.useRef(false);
  React.useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = readStoredState();
    const fromUrl = urlStep.current ?? null;
    if (stored || fromUrl) {
      dispatch({
        type: "hydrate",
        state: { ...(stored ?? {}), ...(fromUrl ? { step: fromUrl } : {}) },
      });
    }
  }, []);

  React.useEffect(() => {
    if (!restored.current) return;
    writeStoredState(state);
  }, [state]);

  return (
    <GeneratorStoreProvider value={store}>
      <GeneratorDataProvider initial={initial}>
        <GeneratorStyles />
        <GeneratorShell />
      </GeneratorDataProvider>
    </GeneratorStoreProvider>
  );
}

/* ------------------------------------------------------------------ */

function GeneratorShell() {
  const { state, dispatch } = useGeneratorStore();
  const data = useGeneratorData();
  const isDesktop = useIsDesktop();

  const [phase, setPhase] = React.useState<BuildPhase>("idle");
  /* False on the first paint: arriving at the page must not move the cursor. */
  const [moveFocus, setMoveFocus] = React.useState(false);

  const printType =
    data.printTypes.find((row) => row.key === state.printTypeKey) ?? null;
  const size = printType?.sizes.find((row) => row.key === state.sizeKey) ?? null;
  const chosenFilaments = state.colorIds
    .map((id) => data.filaments.find((filament) => filament.id === id))
    .filter((filament): filament is NonNullable<typeof filament> => filament !== undefined);

  const go = React.useCallback(
    (step: StepKey) => {
      setMoveFocus(true);
      dispatch({ type: "goto", step });
    },
    [dispatch],
  );

  useHistorySync(state.step, (step) => {
    setMoveFocus(true);
    dispatch({ type: "goto", step });
  });

  /* Coming back to a model that was already built shows it rather than rebuilding. */
  React.useEffect(() => {
    if (state.step === "model" && state.built && phase === "idle") setPhase("ready");
    if (!state.built && phase === "ready") setPhase("idle");
  }, [state.step, state.built, phase]);

  /**
   * The colours of his own picture, already on the grid when he gets there.
   *
   * The analyser read them off the file the moment it was downscaled. Making him find
   * them again by eye, on a shelf of forty spools, is asking him to do work the site
   * already did. The step order puts the photo before the colours precisely so this
   * can happen.
   *
   * **The suggestion never crosses into the surcharge.** It is capped at the included
   * count as well as at what the type can hold, so nothing the site chose on its own
   * adds a shekel. The fifth colour stays what it was designed to be: a deliberate
   * tap that opens the sheet with the price and the reason on it.
   *
   * **Once per uploaded photo.** Keyed on the photo rather than on an empty selection,
   * so clearing the grid to start over is respected instead of being undone on the
   * next render. A new photo suggests again.
   */
  const suggestedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    const analysis = state.photo.analysis;
    const key = state.photo.localUrl ?? state.photo.remoteUrl;
    if (!analysis || !key) return;
    if (suggestedFor.current === key) return;
    suggestedFor.current = key;
    if (state.colorIds.length > 0) return;

    const cap = Math.min(
      printType?.maxColors ?? 4,
      data.rules.freeColorCount,
      analysis.suggestedColorCount,
    );
    const ids = suggestFilaments(analysis.dominantHexes, data.filaments, cap);
    if (ids.length > 0) dispatch({ type: "setColors", ids });
  }, [
    state.photo.analysis,
    state.photo.localUrl,
    state.photo.remoteUrl,
    state.colorIds.length,
    printType,
    data.filaments,
    data.rules.freeColorCount,
    dispatch,
  ]);

  const index = stepIndex(state.step);
  const meta = GENERATOR_STEPS[index];
  const hasPhoto = state.photo.localUrl !== null || state.photo.remoteUrl !== null;

  const canAdvance =
    state.step === "type"
      ? state.printTypeKey !== null
      : state.step === "photo"
        ? hasPhoto
        : state.step === "colors"
          ? state.colorIds.length > 0
          : state.step === "size"
            ? state.sizeKey !== null
            : state.step === "model"
              ? state.built
              : true;

  function selectPrintType(next: PrintTypeInfo) {
    dispatch({
      type: "setPrintType",
      key: next.key,
      sizeKey: defaultSizeKey(next),
      maxColors: next.maxColors,
    });
  }

  const body = (() => {
    switch (state.step) {
      case "type":
        return (
          <StepType
            printTypes={data.printTypes}
            selected={state.printTypeKey}
            onSelect={selectPrintType}
          />
        );

      case "photo":
        return (
          <StepPhoto
            printTypeKey={state.printTypeKey}
            onSwitchToRelief={() => {
              const relief = data.printTypes.find((row) => row.key === "relief");
              if (relief) selectPrintType(relief);
            }}
          />
        );

      case "colors":
        return (
          <StepColors
            filaments={data.filaments}
            selectedIds={state.colorIds}
            printTypeKey={state.printTypeKey}
            maxColors={printType?.maxColors ?? 4}
            freeColorCount={data.rules.freeColorCount}
            extraAccepted={state.extraColorsAccepted}
            onToggle={(id) =>
              dispatch({ type: "toggleColor", id, cap: printType?.maxColors ?? 4 })
            }
            onReorder={(ids) => dispatch({ type: "setColors", ids })}
            onAcceptExtra={(id) => {
              dispatch({ type: "acceptExtraColors" });
              dispatch({ type: "toggleColor", id, cap: printType?.maxColors ?? 4 });
            }}
          />
        );

      case "size":
        return (
          <StepSize
            printType={printType}
            rules={data.rules}
            sizeKey={state.sizeKey}
            quantity={state.quantity}
            rush={state.rush}
            neededByIso={state.neededByIso}
            delivery={state.delivery}
            onSize={(key) => dispatch({ type: "setSize", sizeKey: key })}
            onQuantity={(quantity) => dispatch({ type: "setQuantity", quantity })}
            onRush={(rush) => dispatch({ type: "setRush", rush })}
            onNeededBy={(iso) => dispatch({ type: "setNeededBy", iso })}
            onDelivery={(delivery) => dispatch({ type: "setDelivery", delivery })}
          />
        );

      case "model":
        return (
          <StepModel
            printType={printType}
            photo={state.photo}
            filaments={chosenFilaments}
            longEdgeMm={size?.longestEdgeMm ?? 120}
            phase={phase}
            onPhaseChange={setPhase}
            onBuilt={() => dispatch({ type: "setBuilt", built: true })}
          />
        );

      case "price":
        return (
          <StepPrice
            quote={data.quote}
            printTypeNameHe={printType?.nameHe ?? ""}
            sizeLabelHe={size?.labelHe ?? ""}
            colorNames={chosenFilaments.map((filament) => filament.nameHe)}
            quantity={state.quantity}
            onAgain={() => {
              dispatch({ type: "setBuilt", built: false });
              setPhase("idle");
              go("type");
            }}
          />
        );
    }
  })();

  /* The bottom action. Step 5 keeps its own build button, so the bar carries only the
     way back until the model exists, and step 6 has two CTAs of its own inside the
     card, which no bar is allowed to compete with. */
  const showPrimary = state.step !== "price" && !(state.step === "model" && !state.built);
  const primaryLabel = state.step === "model" ? GENERATOR.price.cta : GENERATOR.nav.next;

  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[77.5rem] px-5 pb-32 pt-6 sm:px-8 lg:px-10 [min-inline-size:0]"
      >
        <p
          className="font-[family-name:var(--font-rubik)]"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "var(--color-text-muted)",
          }}
        >
          {GENERATOR.page.heading}
        </p>

        <div className="pt-3 [min-inline-size:0]">
          <ProgressRail current={state.step} furthest={state.furthest} onSelect={go} />
        </div>

        <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] [min-inline-size:0]">
          <div className="[min-inline-size:0]">
            <StepShell
              step={state.step}
              titleHe={meta.title}
              helperHe={state.step === "type" ? GENERATOR.page.sub : meta.helper}
              autoFocus={moveFocus}
            >
              {body}
            </StepShell>
          </div>

          {isDesktop ? (
            <aside className="[min-inline-size:0]">
              <div className="sticky top-28 [min-inline-size:0]">
                <SummaryCard
                  printTypeNameHe={printType?.nameHe ?? null}
                  photoUrl={state.photo.localUrl ?? state.photo.remoteUrl}
                  colors={chosenFilaments.map((filament) => ({
                    hex: filament.hex,
                    nameHe: filament.nameHe,
                  }))}
                  sizeLabelHe={size?.labelHe ?? null}
                  quantity={state.quantity}
                />
              </div>
            </aside>
          ) : null}
        </div>
      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-40 [min-inline-size:0]"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-cream-100) 94%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBlockStartWidth: "1px",
          borderBlockStartStyle: "solid",
          borderBlockStartColor: "color-mix(in oklab, var(--color-ink-900) 10%, transparent)",
          paddingBlockEnd: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[77.5rem] flex-col gap-1 px-5 py-3 sm:px-8 lg:px-10 [min-inline-size:0]">
          {showPrimary && !canAdvance && BLOCKED_HINT[state.step] ? (
            <p
              className="text-center"
              style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}
            >
              {BLOCKED_HINT[state.step]}
            </p>
          ) : null}

          <div className="flex items-center gap-3 [min-inline-size:0]">
            {index > 0 ? (
              <Button
                variant="ghost"
                size="lg"
                className="shrink-0"
                onClick={() => go(STEP_ORDER[index - 1])}
              >
                {GENERATOR.nav.back}
              </Button>
            ) : null}

            {showPrimary ? (
              <Button
                variant="accent"
                size="lg"
                fullWidth
                disabled={!canAdvance}
                onClick={() => go(STEP_ORDER[Math.min(index + 1, STEP_ORDER.length - 1)])}
              >
                {primaryLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

/** The wide-screen aside: what has been chosen, in the order it was chosen. */
function SummaryCard({
  printTypeNameHe,
  photoUrl,
  colors,
  sizeLabelHe,
  quantity,
}: {
  printTypeNameHe: string | null;
  photoUrl: string | null;
  colors: { hex: string; nameHe: string }[];
  sizeLabelHe: string | null;
  quantity: number;
}) {
  const empty = !printTypeNameHe && !photoUrl && colors.length === 0;

  return (
    <div
      className="flex flex-col gap-3 [min-inline-size:0]"
      style={{
        backgroundColor: "var(--color-surface-raised)",
        borderRadius: "var(--radius-xl)",
        borderWidth: "3px",
        borderStyle: "solid",
        borderColor: "var(--color-cream-300)",
        padding: "1rem",
      }}
    >
      <h2
        className="font-[family-name:var(--font-rubik)]"
        style={{ fontSize: "1rem", fontWeight: 800 }}
      >
        {MICROCOPY.summaryHeading}
      </h2>

      {empty ? (
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
          {MICROCOPY.summaryEmpty}
        </p>
      ) : null}

      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={MICROCOPY.photoAlt}
          className="block w-full"
          style={{
            borderRadius: "var(--radius-md)",
            maxBlockSize: "10rem",
            objectFit: "cover",
          }}
        />
      ) : null}

      <dl className="flex flex-col gap-2 [min-inline-size:0]">
        {printTypeNameHe ? (
          <SummaryRow label={GENERATOR_STEPS[0].railLabel} value={printTypeNameHe} />
        ) : null}
        {sizeLabelHe ? (
          <SummaryRow label={GENERATOR.size.label} value={sizeLabelHe} />
        ) : null}
        <SummaryRow label={GENERATOR.quantity.label} value={String(quantity)} />
      </dl>

      {colors.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 [min-inline-size:0]">
          {colors.map((color) => (
            <li key={color.hex + color.nameHe} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                style={{
                  inlineSize: "1rem",
                  blockSize: "1rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: color.hex,
                  boxShadow: "inset 0 0 0 2px color-mix(in oklab, var(--color-ink-900) 22%, transparent)",
                }}
              />
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                {color.nameHe}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 [min-inline-size:0]">
      <dt style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{label}</dt>
      <dd
        className="[min-inline-size:0] truncate"
        style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-primary)" }}
      >
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}
