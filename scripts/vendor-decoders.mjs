#!/usr/bin/env node
/**
 * scripts/vendor-decoders.mjs
 *
 * Copies the DRACO glTF decoder out of `node_modules/three` into
 * `public/decoders/draco/`, so `DRACOLoader.setDecoderPath('/decoders/draco/')`
 * resolves against our own origin.
 *
 * Doc 05 §A.6 and the acceptance checklist: no request may leave the origin except
 * to the Convex file URLs. three's DRACOLoader defaults to a Google host and drei's
 * `useGLTF` defaults to `gstatic.com`, both of which fail behind the restrictive
 * in-app webviews that most of this site's traffic arrives in.
 *
 * meshopt needs no vendoring: `three/examples/jsm/libs/meshopt_decoder.module.js` is
 * a plain ES module with an inlined wasm blob, so the bundler ships it inside our own
 * JS. That is the whole reason meshopt is the primary path and DRACO is the fallback.
 *
 * Usage:  node scripts/vendor-decoders.mjs
 */

import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const FROM = join(ROOT, "node_modules/three/examples/jsm/libs/draco/gltf");
const TO = join(ROOT, "public/decoders/draco");
const FILES = ["draco_decoder.js", "draco_decoder.wasm", "draco_wasm_wrapper.js"];

if (!existsSync(FROM)) {
  console.error(`vendor-decoders: ${FROM} is missing. Is three installed?`);
  process.exit(1);
}

mkdirSync(TO, { recursive: true });
for (const file of FILES) copyFileSync(join(FROM, file), join(TO, file));
console.log(`vendor-decoders: copied ${FILES.length} files to public/decoders/draco/`);
