"use client";

import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Getting a file from Shai's phone into Convex storage.
 *
 * `ctx.storage.generateUploadUrl()` has exactly one caller in this backend:
 * `drafts.requestPhotoUpload`, which hands out a short lived upload URL against a
 * uuid session key and is rate limited to twelve files an hour per key and four
 * hundred an hour in total (06 §A.5). The panel uses that same door, with a fresh
 * key per file so an evening of adding product photos never trips a visitor's
 * quota, and it never calls `attachPhoto`, so nothing is bound to a draft: the
 * storage id comes straight back and goes to `products.addImage`,
 * `gallery.create` or `printTypes.update`, each of which checks `requireAdmin`
 * before it writes.
 *
 * WHEN `convex/files.ts` LANDS (06 §A.4 specifies `generateAdminUploadUrl`),
 * swap the one call inside `useUpload` for it and delete this note. Nothing else
 * in the panel has to change.
 */

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_GLB_BYTES = 25 * 1024 * 1024;
const GLB_HEAVY_BYTES = 8 * 1024 * 1024;
const LONG_EDGE = 2000;

export type UploadedImage = {
  storageId: Id<"_storage">;
  width: number;
  height: number;
  blurDataUrl?: string;
};

export function isImageType(type: string): boolean {
  return IMAGE_TYPES.includes(type) || type === "image/heic" || type === "image/heif";
}

export { MAX_IMAGE_BYTES, MAX_GLB_BYTES, GLB_HEAVY_BYTES };

/** uuid v4, the shape `drafts.assertSessionKey` insists on. */
function newSessionKey(): string {
  return crypto.randomUUID();
}

/**
 * Down to 2000px on the long edge and WebP at quality 82, which is the same
 * compression every generated asset on this site already carries, done before
 * the upload so a 12MB photo off an iPhone never crosses the network.
 */
export async function prepareImage(
  file: File,
): Promise<{ blob: Blob; width: number; height: number; blurDataUrl?: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return { blob: file, width: bitmap.width, height: bitmap.height };
  }
  context.drawImage(bitmap, 0, 0, width, height);

  /* A 4x4 downscale as the blur placeholder, so the public grid never jumps
     while an image loads (06 §C.26). */
  let blurDataUrl: string | undefined;
  try {
    const tiny = document.createElement("canvas");
    tiny.width = 4;
    tiny.height = 4;
    tiny.getContext("2d")?.drawImage(canvas, 0, 0, 4, 4);
    blurDataUrl = tiny.toDataURL("image/webp", 0.6);
  } catch {
    blurDataUrl = undefined;
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  bitmap.close();
  return { blob: blob ?? file, width, height, blurDataUrl };
}

/** The first four bytes of a .glb file are the ascii letters `glTF`. */
export async function looksLikeGlb(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return (
    header[0] === 0x67 && header[1] === 0x6c && header[2] === 0x54 && header[3] === 0x46
  );
}

export function useUpload() {
  const requestUpload = useMutation(api.drafts.requestPhotoUpload);

  return async function upload(blob: Blob, contentType: string): Promise<Id<"_storage">> {
    const { uploadUrl } = await requestUpload({
      sessionKey: newSessionKey(),
      purpose: "generatorPhoto",
    });
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!response.ok) {
      throw new Error("upload failed");
    }
    const body = (await response.json()) as { storageId: string };
    return body.storageId as Id<"_storage">;
  };
}
