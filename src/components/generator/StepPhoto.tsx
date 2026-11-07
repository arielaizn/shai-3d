"use client";

/**
 * src/components/generator/StepPhoto.tsx
 *
 * Step 2 · `תמונה`. One picture, and the truth about where it goes.
 *
 * **It uploads immediately, and the line beside the control says so.** RESOLUTIONS
 * §ב.4: three specs gave three different answers, and one of them promised the photo
 * stayed on the device while two others uploaded it the moment it was chosen. The
 * ruling is that it uploads at once, because the abandoned-draft inbox is worth money
 * to Shai, and that the copy states exactly that, including the seven days.
 *
 * **Two buttons, not one.** `capture` is meaningless on a desktop and confusing in a
 * picker, so the camera is its own control and it is only offered on a touch device.
 * The camera is also the escape route from a HEIC that Chrome will not decode: it
 * always returns a JPEG.
 *
 * **A failure never blocks the flow.** A photo that could not be uploaded is still
 * shown from the local copy, the visitor keeps configuring, and the retry sits next to
 * the sentence that says what failed. The only thing lost is the copy Shai receives,
 * and that is what the WhatsApp handoff says instead of pretending.
 */

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { GENERATOR } from "@/content/generator";

import { useGeneratorData } from "./data";
import { PhotoPipelineError, preparePhoto, releasePhotoUrl } from "./photo";
import { StepNote } from "./StepShell";
import { useGeneratorStore } from "./store";
import type { PhotoWarning, PrintTypeKey } from "./types";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/** 09c §6.3: the quality notes, and the two that belong only to a lithophane. */
const WARNING_TEXT: Record<PhotoWarning, string> = {
  small: GENERATOR.quality.small,
  dark: GENERATOR.quality.dark,
  blown: GENERATOR.quality.blown,
  alpha: GENERATOR.quality.alpha,
  flat: GENERATOR.quality.flat,
};

export type StepPhotoProps = {
  printTypeKey: PrintTypeKey | null;
  /** The lithophane's flat-image note offers a relief instead, in one tap. */
  onSwitchToRelief: () => void;
};

export function StepPhoto({ printTypeKey, onSwitchToRelief }: StepPhotoProps) {
  const { state, dispatch } = useGeneratorStore();
  const { uploadPhoto, online } = useGeneratorData();
  const photo = state.photo;

  const fileInput = React.useRef<HTMLInputElement | null>(null);
  const cameraInput = React.useRef<HTMLInputElement | null>(null);
  const retryButton = React.useRef<HTMLButtonElement | null>(null);
  /** Kept so an upload that failed on a dropped connection can be retried as is. */
  const prepared = React.useRef<{ blob: Blob; width: number; height: number } | null>(null);

  const [dragging, setDragging] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);

  const send = React.useCallback(async () => {
    const ready = prepared.current;
    if (!ready) return;

    if (!online) {
      // No deployment behind the site. The picture is still shown from the local copy
      // and the order still reaches WhatsApp, which is what matters.
      dispatch({ type: "photoAttached", remoteUrl: null });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      dispatch({ type: "photoError", error: "offline" });
      return;
    }

    try {
      await uploadPhoto(ready);
      // the public URL arrives on the draft subscription; this ends the busy state
      dispatch({ type: "photoAttached", remoteUrl: null });
    } catch {
      dispatch({ type: "photoError", error: "failed" });
    }
  }, [dispatch, online, uploadPhoto]);

  const handleFile = React.useCallback(
    async (file: File) => {
      releasePhotoUrl(state.photo.localUrl);
      prepared.current = null;
      dispatch({ type: "photoStart" });

      let result;
      try {
        result = await preparePhoto(file);
      } catch (error) {
        dispatch({
          type: "photoError",
          error: error instanceof PhotoPipelineError ? error.kind : "unreadable",
        });
        return;
      }

      prepared.current = { blob: result.blob, width: result.width, height: result.height };
      dispatch({
        type: "photoReady",
        payload: {
          localUrl: result.localUrl,
          width: result.width,
          height: result.height,
          bytes: result.blob.size,
          warnings: result.warnings,
          rows: result.rows,
          analysis: result.analysis,
        },
      });
      await send();
    },
    [dispatch, send, state.photo.localUrl],
  );

  /* `אין חיבור כרגע, אני אנסה שוב לבד` is a promise, so it is kept. */
  React.useEffect(() => {
    if (photo.error !== "offline") return;
    const retry = () => void send();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [photo.error, send]);

  /* Focus event 4 of 4: a failed upload puts the cursor on the way out of it. */
  React.useEffect(() => {
    if (photo.status === "error" && photo.error !== "offline") {
      retryButton.current?.focus({ preventScroll: true });
    }
  }, [photo.status, photo.error]);

  /* The blob URL is deliberately NOT revoked when this step unmounts. It is what the
     summary card, the model step and the price screen show, and revoking it on the way
     to step 3 would blank the visitor's own photo for the rest of the flow. It is
     released when it is replaced, and when the photo is removed. */

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // the value is cleared so choosing the same file twice still fires a change
    event.target.value = "";
    if (file) void handleFile(file);
  }

  const busy = photo.status === "reading" || photo.status === "uploading";
  const hasImage = photo.localUrl !== null || photo.remoteUrl !== null;
  const shownUrl = photo.localUrl ?? photo.remoteUrl;

  const warnings = photo.warnings.filter((warning) =>
    warning === "flat" ? printTypeKey === "lithophane" : true,
  );

  return (
    <div className="flex flex-col gap-4 [min-inline-size:0]">
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={onInputChange}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onInputChange}
      />

      {hasImage ? (
        /* The picture, in a cream frame with the 2-degree tilt the site uses for
           anything that is a photograph. */
        <div className="flex flex-col items-start gap-3 [min-inline-size:0]">
          <div
            className="relative [min-inline-size:0]"
            style={{
              backgroundColor: "var(--color-surface-raised)",
              padding: "0.625rem",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-photo)",
              transform: "rotate(-2deg)",
              maxInlineSize: "min(100%, 22rem)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shownUrl ?? ""}
              alt="התמונה שהעליתם"
              className="block w-full"
              style={{ borderRadius: "var(--radius-xs)", maxBlockSize: "17rem", objectFit: "cover" }}
            />

            {busy ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-2 bottom-2 block overflow-hidden"
                style={{
                  blockSize: "0.25rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "color-mix(in oklab, var(--color-ink-900) 18%, transparent)",
                }}
              >
                <span
                  className="block animate-gitd-pulse"
                  style={{
                    blockSize: "100%",
                    inlineSize: "45%",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--color-turq-500)",
                  }}
                />
              </span>
            ) : null}
          </div>

          <p
            role="status"
            style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-secondary)" }}
          >
            {busy ? GENERATOR.upload.uploading : GENERATOR.upload.done}
          </p>

          <div className="flex flex-wrap gap-2 [min-inline-size:0]">
            <Button variant="play" size="sm" onClick={() => fileInput.current?.click()}>
              {GENERATOR.upload.replace}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                releasePhotoUrl(state.photo.localUrl);
                prepared.current = null;
                dispatch({ type: "photoClear" });
              }}
            >
              {GENERATOR.upload.removeAria}
            </Button>
          </div>
        </div>
      ) : (
        /* The drop zone. On a touch device it is two buttons; on a pointer device the
           whole card is also a drop target, which is what a desktop visitor reaches
           for first. */
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className="flex flex-col items-center gap-3 text-center [min-inline-size:0]"
          style={{
            backgroundColor: dragging ? "var(--color-yellow-50)" : "var(--color-surface-raised)",
            borderWidth: "3px",
            borderStyle: dragging ? "solid" : "dashed",
            borderColor: dragging ? "var(--color-red-500)" : "var(--color-turq-500)",
            borderRadius: "var(--radius-xl)",
            padding: "1.75rem 1.25rem",
            transition: "background-color 140ms linear, border-color 140ms linear",
          }}
        >
          <PrinterGlyph />

          <p
            className="font-[family-name:var(--font-rubik)]"
            style={{ fontSize: "1.125rem", fontWeight: 800 }}
          >
            {dragging ? GENERATOR.upload.dragging : GENERATOR.upload.idle.title}
          </p>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-text-muted)" }}>
            {GENERATOR.upload.idle.sub}
          </p>

          <div className="flex w-full flex-col gap-2 pt-1 sm:flex-row sm:justify-center [min-inline-size:0]">
            <Button
              variant="accent"
              size="md"
              state={busy ? "loading" : "idle"}
              busyLabel={GENERATOR.upload.uploading}
              onClick={() => fileInput.current?.click()}
            >
              {GENERATOR.upload.idle.button}
            </Button>
            <Button
              variant="play"
              size="md"
              className="sm:hidden"
              onClick={() => cameraInput.current?.click()}
            >
              {GENERATOR.upload.mobile.camera}
            </Button>
          </div>

          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
            <bdi>{GENERATOR.upload.idle.formats}</bdi>
          </p>
        </div>
      )}

      {photo.status === "error" && photo.error ? (
        <StepNote tone="danger">
          <p style={{ fontWeight: 700 }}>{errorTitle(photo.error)}</p>
          {errorHelp(photo.error) ? <p>{errorHelp(photo.error)}</p> : null}
          {photo.error === "failed" || photo.error === "offline" ? (
            <p className="pt-2">
              <button
                ref={retryButton}
                type="button"
                onClick={() => void send()}
                className="rounded-sm px-2"
                style={{
                  minBlockSize: "var(--spacing-tap)",
                  fontWeight: 800,
                  color: "var(--color-danger-strong)",
                  textDecorationLine: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                {GENERATOR.upload.error.failedRetry}
              </button>
            </p>
          ) : null}
        </StepNote>
      ) : null}

      {warnings.map((warning) => (
        <StepNote
          key={warning}
          tone="warning"
          actions={
            warning === "flat" ? (
              <>
                <Button variant="play" size="sm" onClick={onSwitchToRelief}>
                  {GENERATOR.quality.flatAccept}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    dispatch({
                      type: "photoReady",
                      payload: {
                        localUrl: photo.localUrl ?? "",
                        width: photo.width,
                        height: photo.height,
                        bytes: photo.bytes,
                        warnings: photo.warnings.filter((w) => w !== "flat"),
                        rows: photo.rows,
                        // the dismissal keeps whatever the read already decided
                        analysis: photo.analysis!,
                      },
                    })
                  }
                >
                  {GENERATOR.quality.flatKeep}
                </Button>
              </>
            ) : undefined
          }
        >
          {WARNING_TEXT[warning]}
        </StepNote>
      ))}

      {/* The privacy line, 09c §8. It sits beside the control, not in a footer. */}
      <div className="flex flex-col gap-2 [min-inline-size:0]">
        <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--color-text-muted)" }}>
          {GENERATOR.photo.privacy}
        </p>

        <button
          type="button"
          aria-expanded={privacyOpen}
          onClick={() => setPrivacyOpen((open) => !open)}
          className="self-start rounded-sm"
          style={{
            minBlockSize: "var(--spacing-tap)",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--color-text-link)",
            textDecorationLine: "underline",
            textDecorationColor: "var(--color-turq-500)",
            textDecorationThickness: "2px",
            textUnderlineOffset: "4px",
          }}
        >
          {GENERATOR.photo.privacyMoreLabel}
        </button>

        <div className="g-disclosure" data-open={privacyOpen}>
          <div>
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.7,
                color: "var(--color-text-secondary)",
                paddingBlockEnd: "0.25rem",
              }}
            >
              {GENERATOR.photo.privacyMore}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function errorTitle(error: string): string {
  switch (error) {
    case "tooBig":
      return GENERATOR.upload.error.tooBig;
    case "wrongType":
      return GENERATOR.upload.error.wrongType;
    case "unreadable":
      return GENERATOR.upload.error.unreadable;
    case "offline":
      return GENERATOR.upload.error.offline;
    default:
      return GENERATOR.upload.error.failed;
  }
}

function errorHelp(error: string): string {
  switch (error) {
    case "tooBig":
      return GENERATOR.upload.error.tooBigHelp;
    case "wrongType":
      return GENERATOR.upload.error.wrongTypeHelp;
    case "unreadable":
      return GENERATOR.upload.error.unreadableHelp;
    default:
      /* `failed` and `offline` carry a retry rather than an explanation. Saying
         something for the sake of a second line would be filler. */
      return "";
  }
}

/** The print head, as a glyph. The same toy shape the wait state builds with. */
function PrinterGlyph() {
  return (
    <svg viewBox="0 0 48 40" width="48" height="40" aria-hidden="true" focusable="false">
      <rect x="4" y="28" width="40" height="6" rx="3" fill="var(--color-cream-300)" />
      <rect x="10" y="20" width="28" height="8" rx="2" fill="var(--color-turq-500)" />
      <path d="M14 6h20l-3 10H17z" fill="var(--color-red-500)" />
      <path d="M23 16h2l-1 4z" fill="var(--color-ink-900)" />
    </svg>
  );
}
