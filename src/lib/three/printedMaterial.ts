/**
 * src/lib/three/printedMaterial.ts
 *
 * Doc 05 §A.4 and §B.3.1. Everything that makes a `MeshStandardMaterial` look like a
 * matte FDM print rather than a smooth CAD render.
 *
 * Three separate shader injections live here, and they compose on one material:
 *
 *   1. layer lines, an object-space procedural ridge with a screen-space fade
 *   2. per-vertex finish, so four filament colours and three finishes stay one draw call
 *   3. Beer-Lambert backlighting for a lithophane, driven by a real thickness attribute
 *
 * All three go in through `onBeforeCompile`, which means the material stays a plain
 * `MeshStandardMaterial`: it still receives the environment, still respects tone
 * mapping, and still works if a future three release changes how lighting is done.
 */

import * as THREE from "three";

import { FINISH, GITD, LITHO_ABSORPTION_PER_CM, LITHO_BACKLIGHT_HEX, type Finish } from "./constants";

/* ------------------------------------------------------------ colour helpers */

/**
 * All filament hexes go through `setStyle(hex, SRGBColorSpace)` so they land in
 * linear space correctly. Passing a hex straight into `new THREE.Color(hex)` skips
 * the conversion and every candy colour comes back washed out.
 */
export function filamentColor(hex: string): THREE.Color {
  return new THREE.Color().setStyle(hex, THREE.SRGBColorSpace);
}

/* ------------------------------------------------------------- layer lines */

export type LayerLineOptions = {
  /** Layer height in scene units. 0.2mm is 0.02. */
  layerHeightCm: number;
  /** Normal perturbation. Above about 0.08 it stops reading as beads and starts reading as corrugation. */
  strength?: number;
  /** The build axis. A model printed on its side has layers running along Z. */
  upAxis?: "x" | "y" | "z";
};

type PatchedMaterial = THREE.MeshStandardMaterial & {
  userData: {
    uLayerHeight?: { value: number };
    uLayerStrength?: { value: number };
    uBacklight?: { value: THREE.Color };
    uBacklightStrength?: { value: number };
    uMu?: { value: number };
    uGlowMix?: { value: number };
    patches?: string[];
  };
};

/**
 * An FDM print's signature is a stack of squashed round beads, one per layer, running
 * perpendicular to the build direction. Modelling them is out of the question: a 60mm
 * panel at 0.2mm is 300 layers. Baking them into a normal map fails because an
 * uploaded glTF's UVs are arbitrary.
 *
 * So the ridge is procedural, in object space, with a screen-space fade:
 *
 *   1. `fwidth` measures how many layer periods fall inside one pixel. Past 0.30 the
 *      ridges start to alias, so `vis` ramps them out, and by 0.80 they are gone.
 *      Zoomed in you feel the layers, zoomed out you see clean matte plastic. No mip
 *      pyramid, no texture, no aliasing at any distance.
 *   2. The wave is a triangle, not a sine and not a sawtooth. A triangle perturbation
 *      reads as a row of rounded beads, which is what a layer is. A sawtooth gives a
 *      hard flip that looks like a scratched surface.
 *   3. Roughness moves in step with the normal, because real layer crests catch
 *      specular differently to the valleys, and moving both together is what sells it.
 */
export function patchLayerLines(material: THREE.MeshStandardMaterial, options: LayerLineOptions): void {
  const mat = material as PatchedMaterial;
  const axis = options.upAxis ?? "y";
  const strength = options.strength ?? 0.055;
  mat.userData.uLayerHeight = { value: options.layerHeightCm };
  mat.userData.uLayerStrength = { value: strength };
  mat.userData.patches = [...(mat.userData.patches ?? []), `layer-${options.layerHeightCm}-${axis}`];

  const previous = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    previous?.call(mat, shader, renderer);
    shader.uniforms.uLayerHeight = mat.userData.uLayerHeight!;
    shader.uniforms.uLayerStrength = mat.userData.uLayerStrength!;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vLayerCoord;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n  vLayerCoord = position.${axis};`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vLayerCoord;
uniform float uLayerHeight;
uniform float uLayerStrength;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
  {
    float layerPeriod = uLayerHeight;
    float t = fract( vLayerCoord / layerPeriod );
    float tri = abs( t - 0.5 ) * 4.0 - 1.0;
    float periodsPerPixel = fwidth( vLayerCoord ) / layerPeriod;
    float vis = 1.0 - smoothstep( 0.30, 0.80, periodsPerPixel );
    normal = normalize( normal + vec3( 0.0, tri * uLayerStrength * vis, 0.0 ) );
    roughnessFactor = clamp( roughnessFactor + tri * 0.055 * vis, 0.05, 1.0 );
  }`,
      );
  };

  // Without this three compiles a fresh program per material instance, which on the
  // generator (one material, many rebuilds) is a visible stall on every colour change.
  mat.customProgramCacheKey = () => (mat.userData.patches ?? []).join("|");
  mat.needsUpdate = true;
}

/* ------------------------------------------------------------ per-vertex finish */

/**
 * Doc 05 §B.2. The generator writes a second per-vertex attribute `aFinish`
 * (0 matte, 1 silk, 2 glow) so one material, one draw call, carries four colours and
 * three finishes. Splitting by material instead would mean up to twelve draw calls on
 * a phone for what is physically one printed object.
 */
export function patchVertexFinish(material: THREE.MeshStandardMaterial): void {
  const mat = material as PatchedMaterial;
  mat.userData.uGlowMix = mat.userData.uGlowMix ?? { value: GITD.emissiveLightsOn };
  mat.userData.patches = [...(mat.userData.patches ?? []), "vfinish"];

  const previous = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    previous?.call(mat, shader, renderer);
    shader.uniforms.uGlowMix = mat.userData.uGlowMix!;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aFinish;\nvarying float vFinish;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vFinish = aFinish;");

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFinish;\nuniform float uGlowMix;")
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
  {
    float silk = clamp( 1.0 - abs( vFinish - 1.0 ), 0.0, 1.0 );
    roughnessFactor = mix( roughnessFactor, ${FINISH.silk.roughness.toFixed(2)}, silk );
  }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  {
    float gitd = clamp( 1.0 - abs( vFinish - 2.0 ), 0.0, 1.0 );
    totalEmissiveRadiance += diffuseColor.rgb * gitd * uGlowMix;
  }`,
      );
  };
  mat.customProgramCacheKey = () => (mat.userData.patches ?? []).join("|");
  mat.needsUpdate = true;
}

/** Ramps the glow-in-the-dark emissive without recompiling anything. */
export function setGlowMix(material: THREE.MeshStandardMaterial, value: number): void {
  const mat = material as PatchedMaterial;
  if (mat.userData.uGlowMix) mat.userData.uGlowMix.value = value;
}

/* --------------------------------------------------------------- backlight */

export type BacklightOptions = {
  /** Absorption per centimetre. White PLA is about 11.0. */
  mu?: number;
  colorHex?: string;
  strength?: number;
};

/**
 * Doc 05 §B.3.1. A lithophane's image comes out of thickness, so the preview has to
 * model transmission, and `MeshPhysicalMaterial.transmission` is the wrong tool twice
 * over: it costs a full-screen backbuffer copy every frame and roughly halves the
 * frame rate on a phone, and it models refraction through a clear medium when a
 * lithophane is a diffusing solid.
 *
 * Beer-Lambert instead, three instructions, driven by the `aThickness` attribute the
 * worker already produced. It is what a lithophane physically does, and it responds
 * correctly when the visitor changes size: a bigger panel with the same thickness
 * range looks identical, which is correct.
 */
export function patchBacklight(material: THREE.MeshStandardMaterial, options: BacklightOptions = {}): void {
  const mat = material as PatchedMaterial;
  mat.userData.uMu = { value: options.mu ?? LITHO_ABSORPTION_PER_CM };
  mat.userData.uBacklight = { value: filamentColor(options.colorHex ?? LITHO_BACKLIGHT_HEX) };
  mat.userData.uBacklightStrength = { value: options.strength ?? 1 };
  mat.userData.patches = [...(mat.userData.patches ?? []), "backlit"];

  const previous = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    previous?.call(mat, shader, renderer);
    shader.uniforms.uMu = mat.userData.uMu!;
    shader.uniforms.uBacklight = mat.userData.uBacklight!;
    shader.uniforms.uBacklightStrength = mat.userData.uBacklightStrength!;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aThickness;\nvarying float vThickness;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vThickness = aThickness;");

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vThickness;
uniform float uMu;
uniform vec3 uBacklight;
uniform float uBacklightStrength;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  totalEmissiveRadiance += uBacklight * exp( -uMu * vThickness ) * uBacklightStrength;`,
      );
  };
  mat.customProgramCacheKey = () => (mat.userData.patches ?? []).join("|");
  mat.needsUpdate = true;
}

/** Toggles `אור מאחור` without a rebuild or a recompile. Doc 05 §B.5. */
export function setBacklightStrength(material: THREE.MeshStandardMaterial, value: number): void {
  const mat = material as PatchedMaterial;
  if (mat.userData.uBacklightStrength) mat.userData.uBacklightStrength.value = value;
}

/* ------------------------------------------------ normalising a loaded glTF */

/**
 * Doc 05 §A.4. Uploaded glTF materials are normalised, never replaced: Shai may have
 * exported two materials for a two-colour print and that intent has to survive.
 *
 * `dithering` matters more than it sounds. A matte white print under a big soft key
 * produces exactly the wide low-contrast gradient that shows 8-bit banding on a phone
 * panel, and switching it on is free.
 */
export function normalisePrintedMaterials(
  root: THREE.Object3D,
  options: { finish?: Finish; layerHeightCm?: number; upAxis?: "x" | "y" | "z" } = {},
): THREE.MeshStandardMaterial[] {
  const finish = options.finish ?? "matte";
  const preset = FINISH[finish];
  const touched: THREE.MeshStandardMaterial[] = [];

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of list) {
      const mat = raw as THREE.MeshStandardMaterial;
      if (!mat || !(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) continue;

      mat.metalness = preset.metalness;
      mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.5, 0.55, 0.85);
      if (finish === "silk") mat.roughness = preset.roughness;
      mat.envMapIntensity = preset.envMapIntensity;
      mat.flatShading = false;
      // FrontSide, never DoubleSide: DoubleSide doubles the fragment cost and hides
      // bad normals instead of showing them, which is the opposite of useful here.
      mat.side = THREE.FrontSide;
      mat.dithering = true;
      if (finish === "glow") {
        mat.emissive = filamentColor(GITD.emissiveHex);
        mat.emissiveIntensity = preset.emissive;
      }

      if (options.layerHeightCm) {
        patchLayerLines(mat, { layerHeightCm: options.layerHeightCm, upAxis: options.upAxis });
      }
      mat.needsUpdate = true;
      touched.push(mat);
    }
  });

  return touched;
}
