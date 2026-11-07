"use client";

import * as React from "react";

import { V, errorHe } from "./messages";
import { ActionButton, Field } from "./ui";
import { MAX_IMAGE_BYTES, isImageType, prepareImage, useUpload, type UploadedImage } from "./uploads";

/**
 * Pick a photo, describe it, upload it. 06 §C.4 `ImageDropzone`.
 *
 * The alt text is asked for BEFORE the file is sent, not after, because every
 * mutation that stores an image in this backend refuses an empty `altHe`, and
 * because a description written while you are still looking at the photo is a
 * real description. `accept` plus `capture` opens the camera directly on a phone.
 */
export function ImageDropzone({
  labelHe,
  onUploaded,
  altHintHe,
}: {
  labelHe: string;
  altHintHe?: string;
  onUploaded: (image: UploadedImage & { altHe: string }) => Promise<void> | void;
}) {
  const upload = useUpload();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [altHe, setAltHe] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function take(next: File | null | undefined) {
    setError(null);
    if (!next) return;
    if (!isImageType(next.type)) {
      setError(V.imageBadType);
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      setError(V.imageTooBig);
      return;
    }
    setFile(next);
  }

  async function send() {
    if (!file) return;
    if (altHe.trim() === "") {
      setError(V.altRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareImage(file);
      const storageId = await upload(prepared.blob, prepared.blob.type || "image/webp");
      await onUploaded({
        storageId,
        width: prepared.width,
        height: prepared.height,
        blurDataUrl: prepared.blurDataUrl,
        altHe: altHe.trim(),
      });
      setFile(null);
      setAltHe("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (thrown) {
      setError(errorHe(thrown));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="a-stack">
      <Field label={labelHe} error={error ?? undefined}>
        <div
          className="a-card"
          style={{ borderStyle: "dashed", boxShadow: "none", textAlign: "center" }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            take(event.dataTransfer.files?.[0]);
          }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              style={{
                maxBlockSize: "12rem",
                inlineSize: "auto",
                margin: "0 auto 0.75rem",
                borderRadius: "0.75rem",
              }}
            />
          ) : (
            <p className="a-muted" style={{ marginBlockEnd: "0.75rem" }}>
              אפשר לגרור לכאן תמונה, או לבחור אחת מהמכשיר
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            style={{ display: "block", margin: "0 auto", maxInlineSize: "100%" }}
            onChange={(event) => take(event.target.files?.[0])}
          />
        </div>
      </Field>

      {file ? (
        <>
          <Field
            label="מה רואים בתמונה"
            hint={altHintHe ?? "המשפט הזה הוא מה שקורא המסך יקריא"}
          >
            <input
              className="a-input"
              value={altHe}
              onChange={(event) => setAltHe(event.target.value)}
            />
          </Field>
          <div className="a-row">
            <ActionButton tone="primary" onClick={send} disabled={busy}>
              {busy ? "רגע אחד" : "להוסיף את התמונה"}
            </ActionButton>
            <ActionButton tone="quiet" onClick={() => setFile(null)} disabled={busy}>
              ביטול
            </ActionButton>
          </div>
        </>
      ) : null}
    </div>
  );
}
