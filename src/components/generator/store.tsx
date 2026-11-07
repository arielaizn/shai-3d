"use client";

/**
 * src/components/generator/store.tsx
 *
 * Everything the visitor has chosen, in one reducer, plus the two places it is kept:
 * `localStorage` for the instant restore, and the URL for the back button.
 *
 * **Why the History API and not `router.push`.** Doc 04 §B3 wired every step change to
 * `router.push('/generator?step=3')`. On the App Router that re-runs the server
 * component for the route, which costs a request and a Convex round trip per step on
 * a 4G phone, and the visitor watches a spinner between step 2 and step 3 of a wizard
 * that has all its data already. `history.pushState` gives the same two things that
 * mattered (the Android back button steps back instead of leaving the site, and a
 * link in the middle of the flow works) at zero network cost. Next documents the
 * native history methods as supported for exactly this.
 *
 * **Why a reducer and not `useState` per field.** Choosing a print type has to clear
 * the colours and the size that belonged to the previous one, because a lithophane's
 * single colour and a framed panel's two are not the same choice. That invariant
 * lives in one place here rather than in six components that each remember half of it.
 */

import * as React from "react";
import type { ImageAnalysis } from "@/lib/three/geometry/analyze";

import {
  EMPTY_PHOTO,
  STEP_ORDER,
  type BedRow,
  type PhotoError,
  type PhotoState,
  type PhotoWarning,
  type PrintTypeKey,
  type StepKey,
  stepFromNumber,
  stepIndex,
  stepNumber,
} from "./types";

/* ------------------------------------------------------------------ */
/* the state                                                            */
/* ------------------------------------------------------------------ */

export type GeneratorState = {
  step: StepKey;
  /** 1-based, and never goes down. It is what a returning visitor is restored to. */
  furthest: number;
  printTypeKey: PrintTypeKey | null;
  sizeKey: string | null;
  /** Order matters: the first colour is the body, the second the frame or the base. */
  colorIds: string[];
  /** Set once the fifth-colour sheet has been accepted, so it never asks twice. */
  extraColorsAccepted: boolean;
  quantity: number;
  rush: boolean;
  /** `YYYY-MM-DD`, the value of the date input. */
  neededByIso: string | null;
  delivery: "pickup" | "shipping";
  noteHe: string;
  photo: PhotoState;
  /** True once the model has been built at least once for the current configuration. */
  built: boolean;
};

export const INITIAL_STATE: GeneratorState = {
  step: "type",
  furthest: 1,
  printTypeKey: null,
  sizeKey: null,
  colorIds: [],
  extraColorsAccepted: false,
  quantity: 1,
  rush: false,
  neededByIso: null,
  delivery: "pickup",
  noteHe: "",
  photo: EMPTY_PHOTO,
  built: false,
};

export type PhotoReadyPayload = {
  localUrl: string;
  width: number;
  height: number;
  bytes: number;
  warnings: PhotoWarning[];
  rows: BedRow[];
  /** What the file turned out to be. Decides relief depth and the colour count. */
  analysis: ImageAnalysis;
};

export type GeneratorAction =
  | { type: "hydrate"; state: Partial<GeneratorState> }
  | { type: "goto"; step: StepKey }
  | { type: "setPrintType"; key: PrintTypeKey; sizeKey: string | null; maxColors: number }
  | { type: "setSize"; sizeKey: string }
  | { type: "toggleColor"; id: string; cap: number }
  | { type: "setColors"; ids: string[] }
  | { type: "acceptExtraColors" }
  | { type: "setQuantity"; quantity: number }
  | { type: "setRush"; rush: boolean }
  | { type: "setNeededBy"; iso: string | null }
  | { type: "setDelivery"; delivery: "pickup" | "shipping" }
  | { type: "setNote"; noteHe: string }
  | { type: "photoStart" }
  | { type: "photoProgress"; progress: number }
  | { type: "photoReady"; payload: PhotoReadyPayload }
  | { type: "photoAttached"; remoteUrl: string | null }
  | { type: "photoError"; error: PhotoError }
  | { type: "photoClear" }
  | { type: "setBuilt"; built: boolean };

function withFurthest(state: GeneratorState, step: StepKey): GeneratorState {
  return { ...state, step, furthest: Math.max(state.furthest, stepNumber(step)) };
}

export function generatorReducer(
  state: GeneratorState,
  action: GeneratorAction,
): GeneratorState {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state };

    case "goto":
      return withFurthest(state, action.step);

    /**
     * The print type is the root of the configuration. A new one invalidates the
     * size (the sizes belong to the type) and trims the colours to what the new type
     * can print, which is one for a lithophane. Trimming rather than clearing keeps
     * the first pick, which is almost always the one the visitor cared about.
     */
    case "setPrintType": {
      if (state.printTypeKey === action.key) return state;
      return {
        ...state,
        printTypeKey: action.key,
        sizeKey: action.sizeKey,
        colorIds: state.colorIds.slice(0, Math.max(1, action.maxColors)),
        extraColorsAccepted: false,
        built: false,
      };
    }

    case "setSize":
      return state.sizeKey === action.sizeKey ? state : { ...state, sizeKey: action.sizeKey };

    /**
     * A tap on a chosen colour removes it, a tap on a new one appends it, and the
     * cap is the print type's `maxColors`. On a single-colour type the pick replaces
     * whatever was there, because a grid that refuses the second tap reads as broken.
     */
    case "toggleColor": {
      const cap = Math.max(1, action.cap);
      if (state.colorIds.includes(action.id)) {
        return { ...state, colorIds: state.colorIds.filter((id) => id !== action.id) };
      }
      if (cap === 1) return { ...state, colorIds: [action.id] };
      if (state.colorIds.length >= cap) return state;
      return { ...state, colorIds: [...state.colorIds, action.id] };
    }

    case "setColors":
      return { ...state, colorIds: action.ids };

    case "acceptExtraColors":
      return { ...state, extraColorsAccepted: true };

    case "setQuantity":
      return { ...state, quantity: Math.max(1, Math.round(action.quantity)) };

    case "setRush":
      return {
        ...state,
        rush: action.rush,
        neededByIso: action.rush ? state.neededByIso : null,
      };

    case "setNeededBy":
      return { ...state, neededByIso: action.iso };

    case "setDelivery":
      return { ...state, delivery: action.delivery };

    case "setNote":
      return { ...state, noteHe: action.noteHe };

    case "photoStart":
      return { ...state, photo: { ...state.photo, status: "reading", error: null, progress: 0 } };

    case "photoProgress":
      return { ...state, photo: { ...state.photo, progress: action.progress } };

    case "photoReady":
      return {
        ...state,
        built: false,
        photo: {
          ...state.photo,
          status: "uploading",
          error: null,
          localUrl: action.payload.localUrl,
          remoteUrl: null,
          width: action.payload.width,
          height: action.payload.height,
          bytes: action.payload.bytes,
          warnings: action.payload.warnings,
          rows: action.payload.rows,
          analysis: action.payload.analysis,
          progress: 55,
        },
      };

    case "photoAttached":
      return {
        ...state,
        photo: {
          ...state.photo,
          status: "done",
          remoteUrl: action.remoteUrl,
          progress: 100,
          error: null,
        },
      };

    /**
     * A failed upload keeps the local copy. The visitor can carry on configuring and
     * still see their own picture; what is missing is the copy Shai receives, and
     * the step says so with a retry beside it.
     */
    case "photoError":
      return {
        ...state,
        photo: { ...state.photo, status: "error", error: action.error, progress: 0 },
      };

    case "photoClear":
      return { ...state, built: false, photo: EMPTY_PHOTO };

    case "setBuilt":
      return { ...state, built: action.built };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* persistence                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "shai.generator.draft.v1";

/** What survives a reload. The blob URL does not: it dies with the document. */
type StoredState = Omit<GeneratorState, "photo"> & {
  photo: Omit<PhotoState, "localUrl" | "progress">;
};

export function serialiseState(state: GeneratorState): StoredState {
  const { localUrl: _localUrl, progress: _progress, ...photo } = state.photo;
  return { ...state, photo };
}

export function readStoredState(): Partial<GeneratorState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!parsed || typeof parsed !== "object") return null;

    const photo: PhotoState = {
      ...EMPTY_PHOTO,
      ...(parsed.photo ?? {}),
      localUrl: null,
      // a photo that reached Convex is still there; one that never did is gone with
      // the blob URL, and the upload step opens empty rather than pretending
      status: parsed.photo?.remoteUrl ? "done" : "idle",
      progress: parsed.photo?.remoteUrl ? 100 : 0,
      error: null,
    };

    return {
      ...parsed,
      photo,
      step: parsed.step && STEP_ORDER.includes(parsed.step) ? parsed.step : "type",
    } as Partial<GeneratorState>;
  } catch {
    return null;
  }
}

export function writeStoredState(state: GeneratorState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialiseState(state)));
  } catch {
    /* private mode, or a webview with site data blocked. The flow still works. */
  }
}

export function clearStoredState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see writeStoredState */
  }
}

/* ------------------------------------------------------------------ */
/* the URL                                                              */
/* ------------------------------------------------------------------ */

export function stepFromLocation(): StepKey | null {
  try {
    const value = new URLSearchParams(window.location.search).get("step");
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    return stepFromNumber(parsed);
  } catch {
    return null;
  }
}

function stepHref(step: StepKey): string {
  return step === "type" ? "/generator" : `/generator?step=${stepNumber(step)}`;
}

/**
 * Keeps the address bar and the history stack in step with the wizard.
 *
 * `pushState` on a forward move and `replaceState` on a backward one: pressing back
 * three times from step 4 should reach the page the visitor arrived from, not walk a
 * stack that grew every time they corrected a choice.
 */
export function useHistorySync(step: StepKey, onPop: (step: StepKey) => void): void {
  const previous = React.useRef<StepKey | null>(null);
  const onPopRef = React.useRef(onPop);
  onPopRef.current = onPop;

  React.useEffect(() => {
    const handler = () => {
      const next = stepFromLocation() ?? "type";
      previous.current = next;
      onPopRef.current(next);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  React.useEffect(() => {
    if (previous.current === step) return;
    const forward = previous.current !== null && stepIndex(step) > stepIndex(previous.current);
    previous.current = step;
    try {
      const url = stepHref(step);
      if (forward) window.history.pushState({ shaiStep: stepNumber(step) }, "", url);
      else window.history.replaceState({ shaiStep: stepNumber(step) }, "", url);
    } catch {
      /* a sandboxed webview can refuse history writes; the wizard is unaffected */
    }
  }, [step]);
}

/* ------------------------------------------------------------------ */
/* the context                                                          */
/* ------------------------------------------------------------------ */

export type GeneratorStore = {
  state: GeneratorState;
  dispatch: React.Dispatch<GeneratorAction>;
};

const StoreContext = React.createContext<GeneratorStore | null>(null);

export function GeneratorStoreProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: GeneratorStore;
}) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useGeneratorStore(): GeneratorStore {
  const value = React.useContext(StoreContext);
  if (!value) {
    throw new Error("useGeneratorStore must be used inside GeneratorStoreProvider");
  }
  return value;
}
