"use client";

/**
 * src/components/generator/data.tsx
 *
 * The generator's only conversation with the server, and the seam that lets the whole
 * flow render without one.
 *
 * **Why a provider and not `useQuery` in six components.** The steps read the same
 * catalogue and write the same draft. Mounting the queries once here means one
 * websocket subscription per query instead of six, and it means the fallback below
 * can exist at all: a component that calls `useQuery` cannot run without a
 * `ConvexProvider` above it, so the choice between "live" and "no deployment" has to
 * be made by a component that owns the hooks, not by the components that need data.
 *
 * **Why the client mounts here and not in the root layout.** The rest of the site is
 * static. A visitor who lands on the home page from Instagram should not open a
 * websocket to serve a page that reads nothing, so the client is created inside the
 * generator's own tree and nowhere else (the same reasoning as `AdminProviders`).
 *
 * **The money rule.** Nothing in this file computes a price. `pricing.quote` is asked
 * on every change and its answer is what the screen shows, what the draft stores, and
 * what travels into WhatsApp. RESOLUTIONS: a client-supplied price is never stored.
 */

import * as React from "react";
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

import {
  daysUntil,
  defaultMaterialKey,
  mergeFilaments,
  mergePrintTypes,
  mergeRules,
  type FilamentRowLike,
  type PrintTypeRowLike,
  type PublicConfigLike,
} from "./catalogue";
import { useDebouncedEffect } from "./hooks";
import { readSessionKey } from "./session";
import { useGeneratorStore } from "./store";
import {
  type FilamentInfo,
  type PricingRules,
  type PrintTypeInfo,
  type QuoteState,
  stepNumber,
} from "./types";

/* ------------------------------------------------------------------ */
/* the contract every step reads                                        */
/* ------------------------------------------------------------------ */

/** What `uploadModel` needs: the bytes, and the facts the panel shows beside them. */
export type ModelUploadInput = {
  data: ArrayBuffer;
  format: "stl" | "ply";
  triangles: number;
  boundingMm: { x: number; y: number; z: number };
};

/** Kept beside the upload rather than imported, so this module stays three-free. */
const MODEL_MIME: Record<"stl" | "ply", string> = {
  stl: "model/stl",
  ply: "application/octet-stream",
};

export type UploadInput = {
  blob: Blob;
  width: number;
  height: number;
};

export type LeadResult = {
  whatsappUrl: string;
  /** `/o/{code}`, pulled back out of the message the server wrote. */
  offerUrl: string | null;
};

export type GeneratorData = {
  /** False when `NEXT_PUBLIC_CONVEX_URL` is missing. Everything degrades from here. */
  online: boolean;
  /** True until the catalogue has answered once. */
  loading: boolean;
  printTypes: PrintTypeInfo[];
  filaments: FilamentInfo[];
  rules: PricingRules;
  quote: QuoteState;
  /** Uploads the prepared copy and returns true when the server has it. */
  uploadPhoto: (input: UploadInput) => Promise<boolean>;
  /**
   * Puts the built mesh on the draft, so the order Shai receives carries a file he can
   * print instead of a description he has to rebuild from. Called once per format as
   * soon as the preview finishes, because the mesh only exists while that step is open.
   */
  uploadModel: (input: ModelUploadInput) => Promise<boolean>;
  /**
   * Freezes the lead and returns the WhatsApp address the server built, so the button
   * can be a real `<a href>` before it is touched. Doc 04 §E4: opening a window after
   * an `await` loses the user gesture and is blocked in the Instagram webview.
   */
  createLead: () => Promise<LeadResult | null>;
};

const DataContext = React.createContext<GeneratorData | null>(null);

export function useGeneratorData(): GeneratorData {
  const value = React.useContext(DataContext);
  if (!value) throw new Error("useGeneratorData must be used inside GeneratorDataProvider");
  return value;
}

/* ------------------------------------------------------------------ */
/* the provider                                                         */
/* ------------------------------------------------------------------ */

export type InitialCatalogue = {
  config: PublicConfigLike | null;
  printTypeRows: PrintTypeRowLike[] | null;
  filamentRows: FilamentRowLike[] | null;
};

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export function GeneratorDataProvider({
  initial,
  children,
}: {
  initial: InitialCatalogue;
  children: React.ReactNode;
}) {
  /**
   * Built inside `useMemo` rather than at module scope: `new ConvexReactClient(undefined!)`
   * throws while the module is evaluated, which turns a missing environment variable
   * into a build failure instead of a page that still works.
   */
  const client = React.useMemo(
    () => (CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null),
    [],
  );

  if (!client) {
    return <OfflineData initial={initial}>{children}</OfflineData>;
  }

  return (
    <ConvexProvider client={client}>
      <LiveData initial={initial}>{children}</LiveData>
    </ConvexProvider>
  );
}

/* ------------------------------------------------------------------ */
/* offline: no deployment configured                                    */
/* ------------------------------------------------------------------ */

/**
 * The generator with no server behind it. The seven cards still render from content,
 * the visitor can still see what Shai makes, and every price is simply absent rather
 * than invented. The price step says so in one line and hands over to WhatsApp.
 */
function OfflineData({
  initial,
  children,
}: {
  initial: InitialCatalogue;
  children: React.ReactNode;
}) {
  const value = React.useMemo<GeneratorData>(
    () => ({
      online: false,
      loading: false,
      printTypes: mergePrintTypes(initial.config, initial.printTypeRows),
      filaments: mergeFilaments(initial.filamentRows),
      rules: mergeRules(initial.config),
      quote: { status: "idle" },
      uploadPhoto: async () => false,
      uploadModel: async () => false,
      createLead: async () => null,
    }),
    [initial],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* live                                                                 */
/* ------------------------------------------------------------------ */

/** The offer link the server wrote into the message, so the save button has a target. */
function offerUrlFrom(whatsappUrl: string): string | null {
  try {
    const text = new URL(whatsappUrl).searchParams.get("text") ?? "";
    const match = /https?:\/\/\S+\/o\/[A-Za-z0-9]+/.exec(text);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

function hebrewFromError(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "object" && data !== null && "he" in data) {
      const he = (data as { he: unknown }).he;
      if (typeof he === "string") return he;
    }
  }
  return fallback;
}

function LiveData({
  initial,
  children,
}: {
  initial: InitialCatalogue;
  children: React.ReactNode;
}) {
  const { state, dispatch } = useGeneratorStore();

  /* The session key is read in an effect: `localStorage` does not exist on the
     server, and a value read during render would differ between the server HTML and
     the first client paint. Until it lands, every session-scoped query is skipped. */
  const [sessionKey, setSessionKey] = React.useState<string | null>(null);
  React.useEffect(() => setSessionKey(readSessionKey()), []);

  const config = useQuery(api.pricing.publicConfig, {});
  const printTypeRows = useQuery(api.printTypes.listActive, {});
  const filamentRows = useQuery(api.filaments.listActive, {});
  const draft = useQuery(
    api.drafts.getBySession,
    sessionKey ? { sessionKey } : "skip",
  );

  const saveDraft = useMutation(api.drafts.saveDraft);
  const requestPhotoUpload = useMutation(api.drafts.requestPhotoUpload);
  const attachPhoto = useMutation(api.drafts.attachPhoto);
  const attachModelFile = useMutation(api.drafts.attachModelFile);
  const submitLead = useMutation(api.leads.submit);

  const liveConfig = (config ?? initial.config) as PublicConfigLike | null;
  const printTypes = React.useMemo(
    () => mergePrintTypes(liveConfig, printTypeRows ?? initial.printTypeRows),
    [liveConfig, printTypeRows, initial.printTypeRows],
  );
  const filaments = React.useMemo(
    () => mergeFilaments(filamentRows ?? initial.filamentRows),
    [filamentRows, initial.filamentRows],
  );
  const rules = React.useMemo(() => mergeRules(liveConfig), [liveConfig]);

  /* ---------------------------------------------------------------- */
  /* the quote                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * The price is asked for from the model step onward, one step before it is shown.
   * Doc 04 §0.1 hides the number until the visitor asks for it, and asking Convex
   * early is what makes the reveal land on a number instead of on a spinner. Nothing
   * renders it before step 6.
   */
  const wantsQuote =
    state.printTypeKey !== null &&
    state.sizeKey !== null &&
    state.colorIds.length > 0 &&
    (state.step === "model" || state.step === "price");

  const quoteArgs = wantsQuote
    ? {
        printTypeKey: state.printTypeKey as string,
        materialKey: defaultMaterialKey(liveConfig, state.printTypeKey),
        sizeKey: state.sizeKey as string,
        colorIds: state.colorIds,
        quantity: state.quantity,
        rush: state.rush,
        deliveryMethod: state.delivery,
        requestedInDays: daysUntil(state.neededByIso),
      }
    : "skip";

  const quoteResult = useQuery(api.pricing.quote, quoteArgs);

  const quote: QuoteState = !wantsQuote
    ? { status: "idle" }
    : quoteResult === undefined
      ? { status: "loading" }
      : quoteResult.ok
        ? { status: "ok", breakdown: quoteResult.breakdown }
        : { status: "invalid", messageHe: quoteResult.messageHe };

  /* ---------------------------------------------------------------- */
  /* the draft                                                          */
  /* ---------------------------------------------------------------- */

  const printType = printTypes.find((row) => row.key === state.printTypeKey) ?? null;

  /**
   * One serialised signature of everything the server may store. The debounce below
   * fires on a change to this string and on nothing else, so a re-render caused by
   * the quote arriving does not write the draft again.
   */
  const patchSignature = JSON.stringify({
    printTypeId: printType?.id ?? null,
    sizeKey: state.sizeKey,
    colorIds: state.colorIds,
    quantity: state.quantity,
    rush: state.rush,
    neededByIso: state.neededByIso,
    delivery: state.delivery,
    noteHe: state.noteHe,
    step: stepNumber(state.step),
  });

  const savePatch = React.useCallback(async () => {
    if (!sessionKey || !printType?.id) return;
    try {
      await saveDraft({
        sessionKey,
        patch: {
          printTypeId: printType.id as Id<"printTypes">,
          sizeKey: state.sizeKey ?? undefined,
          colorIds: state.colorIds as Id<"filamentColors">[],
          quantity: state.quantity,
          rush: state.rush,
          neededByDate: state.neededByIso
            ? new Date(`${state.neededByIso}T12:00:00`).getTime()
            : undefined,
          deliveryMethod: state.delivery,
          noteHe: state.noteHe.length > 0 ? state.noteHe : undefined,
          step: stepNumber(state.step),
        },
        userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
        referrer: typeof document === "undefined" ? undefined : document.referrer || undefined,
      });
    } catch {
      /* A draft that failed to save is not something to interrupt a visitor over.
         The configuration lives in `localStorage` either way, and the only thing
         lost is Shai's view of an order nobody finished. */
    }
    // the fields are all carried by `patchSignature`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, printType?.id, patchSignature, saveDraft]);

  useDebouncedEffect(
    () => {
      void savePatch();
    },
    700,
    [patchSignature, sessionKey, printType?.id],
  );

  /**
   * The photo's public URL arrives on the draft, not from the upload call, because
   * `attachPhoto` returns nothing and `getBySession` is already subscribed. This is
   * also the path that restores a photo after a reload.
   */
  const draftPhotoUrl = draft?.photoUrl ?? null;
  React.useEffect(() => {
    if (!draftPhotoUrl) return;
    if (state.photo.remoteUrl === draftPhotoUrl) return;
    dispatch({ type: "photoAttached", remoteUrl: draftPhotoUrl });
  }, [draftPhotoUrl, state.photo.remoteUrl, dispatch]);

  /* ---------------------------------------------------------------- */
  /* actions                                                            */
  /* ---------------------------------------------------------------- */

  const uploadPhoto = React.useCallback(
    async ({ blob, width, height }: UploadInput): Promise<boolean> => {
      if (!sessionKey) return false;
      // `attachPhoto` needs a draft to attach to, and the draft is created by the
      // first `saveDraft`. Waiting for the debounce here would lose the upload.
      await savePatch();

      const { uploadUrl, token } = await requestPhotoUpload({
        sessionKey,
        purpose: "generatorPhoto",
      });

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      if (!response.ok) throw new Error("upload failed");
      const { storageId } = (await response.json()) as { storageId: string };

      await attachPhoto({
        sessionKey,
        token,
        storageId: storageId as Id<"_storage">,
        meta: { width, height, bytes: blob.size, mime: blob.type },
      });
      return true;
    },
    [sessionKey, savePatch, requestPhotoUpload, attachPhoto],
  );

  /**
   * The same three steps as the photo: ask for a single-use URL, PUT the bytes, tell
   * the server what landed. A failure here is deliberately quiet. The visitor is
   * looking at his model and there is nothing he could do about a storage hiccup, and
   * the order still reaches Shai with the photograph and the full configuration on it,
   * which is exactly where this feature stood before the file existed.
   */
  const uploadModel = React.useCallback(
    async ({ data, format, triangles, boundingMm }: ModelUploadInput): Promise<boolean> => {
      if (!sessionKey) return false;
      try {
        await savePatch();
        const { uploadUrl, token } = await requestPhotoUpload({
          sessionKey,
          purpose: "modelFile",
        });
        const blob = new Blob([data], { type: MODEL_MIME[format] });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        if (!response.ok) return false;
        const { storageId } = (await response.json()) as { storageId: string };
        await attachModelFile({
          sessionKey,
          token,
          storageId: storageId as Id<"_storage">,
          format,
          bytes: blob.size,
          triangles,
          boundingMm,
        });
        return true;
      } catch {
        return false;
      }
    },
    [sessionKey, savePatch, requestPhotoUpload, attachModelFile],
  );

  const createLead = React.useCallback(async (): Promise<LeadResult | null> => {
    if (!sessionKey) return null;
    await savePatch();
    try {
      const result = await submitLead({
        sessionKey,
        noteHe: state.noteHe.length > 0 ? state.noteHe : undefined,
      });
      return {
        whatsappUrl: result.whatsappUrl,
        offerUrl: offerUrlFrom(result.whatsappUrl),
      };
    } catch (error) {
      throw new Error(hebrewFromError(error, "משהו השתבש. אפשר לנסות שוב"));
    }
  }, [sessionKey, savePatch, submitLead, state.noteHe]);

  const value = React.useMemo<GeneratorData>(
    () => ({
      online: true,
      loading: config === undefined && initial.config === null,
      printTypes,
      filaments,
      rules,
      quote,
      uploadPhoto,
      uploadModel,
      createLead,
    }),
    [
      config,
      initial.config,
      printTypes,
      filaments,
      rules,
      quote,
      uploadPhoto,
      uploadModel,
      createLead,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
