"use client";

import * as React from "react";

import { V, errorHe } from "./messages";
import { ActionButton, Field, Note } from "./ui";
import { GLB_HEAVY_BYTES, MAX_GLB_BYTES, looksLikeGlb, useUpload } from "./uploads";

/**
 * The .glb of a catalogue model. 06 §C.8.4.
 *
 * `products.attachModel` needs a triangle count and a bounding box, and both are
 * read straight out of the file here rather than guessed at. A GLB is a 12 byte
 * header followed by chunks, the first of which is the glTF JSON, and that JSON
 * already carries `min` and `max` on every POSITION accessor plus the index
 * count of every primitive. So the numbers come from the file itself, with no 3D
 * library on the page and nothing to download before Shai sees them.
 *
 * The box is the union of the mesh extents in glTF's own units, which the format
 * defines as metres, multiplied into millimetres. Node transforms are not applied,
 * so a model that is scaled inside its scene graph reads its unscaled size. That
 * is a number to sanity check a file with, not a slicer measurement, and the
 * label says as much.
 */

type GlbFacts = { triangleCount: number; boundingBoxMm: { x: number; y: number; z: number } };

type GltfAccessor = { type?: string; count?: number; min?: number[]; max?: number[] };
type GltfPrimitive = { attributes?: Record<string, number>; indices?: number };
type GltfMesh = { primitives?: GltfPrimitive[] };
type GltfJson = { accessors?: GltfAccessor[]; meshes?: GltfMesh[] };

export async function readGlbFacts(file: File): Promise<GlbFacts | null> {
  const head = await file.slice(0, Math.min(file.size, 8 * 1024 * 1024)).arrayBuffer();
  const view = new DataView(head);
  if (view.byteLength < 20) return null;
  const jsonLength = view.getUint32(12, true);
  const jsonStart = 20;
  if (jsonStart + jsonLength > view.byteLength) return null;
  const text = new TextDecoder().decode(new Uint8Array(head, jsonStart, jsonLength));

  let json: GltfJson;
  try {
    json = JSON.parse(text) as GltfJson;
  } catch {
    return null;
  }

  const accessors = json.accessors ?? [];
  let triangles = 0;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];

  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const positionIndex = primitive.attributes?.POSITION;
      const position = positionIndex === undefined ? undefined : accessors[positionIndex];
      if (position?.min && position.max && position.min.length >= 3) {
        for (let axis = 0; axis < 3; axis += 1) {
          lo[axis] = Math.min(lo[axis], position.min[axis]);
          hi[axis] = Math.max(hi[axis], position.max[axis]);
        }
      }
      const indices = primitive.indices === undefined ? undefined : accessors[primitive.indices];
      const count = indices?.count ?? position?.count ?? 0;
      triangles += Math.floor(count / 3);
    }
  }

  const mm = (axis: number) =>
    Number.isFinite(lo[axis]) && Number.isFinite(hi[axis])
      ? Math.round((hi[axis] - lo[axis]) * 1000)
      : 0;

  return { triangleCount: triangles, boundingBoxMm: { x: mm(0), y: mm(1), z: mm(2) } };
}

export function GlbUploader({
  onUploaded,
}: {
  onUploaded: (model: {
    storageId: string;
    filename: string;
    sizeBytes: number;
    triangleCount?: number;
    boundingBoxMm: { x: number; y: number; z: number };
  }) => Promise<void> | void;
}) {
  const upload = useUpload();
  const [file, setFile] = React.useState<File | null>(null);
  const [facts, setFacts] = React.useState<GlbFacts | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function take(next: File | null | undefined) {
    setError(null);
    setFacts(null);
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".glb") || !(await looksLikeGlb(next))) {
      setError(V.glbBadType);
      return;
    }
    if (next.size > MAX_GLB_BYTES) {
      setError(V.glbTooBig);
      return;
    }
    setFile(next);
    setFacts(await readGlbFacts(next));
  }

  async function send() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const storageId = await upload(file, "model/gltf-binary");
      await onUploaded({
        storageId,
        filename: file.name,
        sizeBytes: file.size,
        triangleCount: facts?.triangleCount,
        boundingBoxMm: facts?.boundingBoxMm ?? { x: 0, y: 0, z: 0 },
      });
      setFile(null);
      setFacts(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (thrown) {
      setError(errorHe(thrown));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="a-stack">
      <Field label="קובץ GLB" hint="עד 25MB" error={error ?? undefined}>
        <input
          ref={inputRef}
          type="file"
          accept=".glb,model/gltf-binary"
          onChange={(event) => void take(event.target.files?.[0])}
        />
      </Field>

      {file ? (
        <>
          {file.size > GLB_HEAVY_BYTES ? <Note>{V.glbHeavy}</Note> : null}
          <dl className="a-muted a-num" style={{ display: "grid", gap: "0.25rem", margin: 0 }}>
            <div className="a-row">
              <dt className="a-grow">משולשים</dt>
              <dd style={{ margin: 0 }}>
                <bdi dir="ltr">{facts ? facts.triangleCount.toLocaleString("en") : "לא ידוע"}</bdi>
              </dd>
            </div>
            <div className="a-row">
              <dt className="a-grow">מידות מהקובץ</dt>
              <dd style={{ margin: 0 }}>
                <bdi dir="ltr">
                  {facts
                    ? `${facts.boundingBoxMm.x}x${facts.boundingBoxMm.y}x${facts.boundingBoxMm.z}`
                    : "0x0x0"}
                </bdi>{" "}
                מ״מ
              </dd>
            </div>
          </dl>
          <div className="a-row">
            <ActionButton tone="primary" onClick={send} disabled={busy}>
              {busy ? "רגע אחד" : "להעלות את הדגם"}
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
