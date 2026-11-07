# 05 · The 3D System

Owner: 3D / WebGL
Scope: the catalog `.glb` viewer, the generator's client-side photo-to-3D engine, the honesty
microcopy around the preview, and the "building your model" wait state.

Hard constraint that shapes every decision below: **there is no GPU server and there never will be.**
Everything renders in the visitor's browser, on a phone, frequently inside the Instagram or WhatsApp
in-app webview. Every choice here is made against that. Where a decision costs bytes over the wire or
milliseconds on a mid-range Android, it is stated in bytes and milliseconds.

Second constraint: the site is a lead engine. The 3D exists to make the visitor want to press the
WhatsApp button. A viewer that stalls, spins forever, or shows a black box costs a lead. Every failure
path in this document ends with a working page and a live price, never with an error screen.

---

## 0. Global conventions

### 0.1 World units

**1 three.js unit = 1 centimetre.** Every model, generated or uploaded, lives at real-world scale.

Why: pieces run 40mm to 250mm. In centimetres that is 4 to 25 units, which sits comfortably inside
float32 precision, keeps `near`/`far` sane, and makes every mm-based admin parameter a single `/10`
away from a scene value. Metres would put a keychain at 0.05 units and force fiddly near planes;
millimetres would put a wall piece at 250 units and make the lighting rig distances unreadable.

glTF files are metres by convention, so an uploaded `.glb` gets `scale = 100 * model.sourceUnitScale`
applied at the root group. `sourceUnitScale` is stored per model and defaults to `1`.

| quantity | unit in code | conversion |
|---|---|---|
| admin parameters | mm | `mm / 10` → units |
| layer height | mm (`0.2`) | `0.02` units |
| geometry positions | units (cm) | n/a |
| bounding box reported to admin | mm | `units * 10` |

### 0.2 Colour tokens consumed

Defined in the Tailwind v4 `@theme` block (owned by the design-system spec). This document consumes
them and adds three that only the 3D layer uses.

```css
/* consumed */
--color-cream:     #FFF7EC;
--color-red:       #F5333F;
--color-turquoise: #12BFB8;
--color-yellow:    #FFC531;
--color-ink:       #1A1420;

/* added by this spec, in the same @theme block */
--color-night:     #0B0A10;  /* the "lights off" ground for glow-in-the-dark */
--color-glow:      #5BFF9E;  /* charged GITD emission */
--color-bed:       #F0E6D6;  /* the print-bed surface in the wait animation */
```

### 0.3 One WebGL context per page. Hard rule.

WebGL contexts are capped by the browser (mobile Safari drops the oldest at around 4, Chrome at 16).
A grid of nine product cards each with its own `<Canvas>` is how you get blank tiles on an iPhone.

- Catalog grid (`/products`): **posters and sprite-sheet turntables only. No canvas.**
- Product detail (`/products/[slug]`): **one canvas.**
- Generator (`/generator`): **one canvas.**
- Admin poster studio: **one canvas**, and it is on its own route so it can never coexist with another.

### 0.4 Renderer configuration, identical on both canvases

```tsx
<Canvas
  frameloop="demand"
  dpr={dprRange}                    // see §A.8
  shadows={false}                   // ContactShadows only, never a shadow map
  gl={{
    antialias: true,
    alpha: true,                    // the cream page shows through
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,   // true ONLY in the admin poster studio
    failIfMajorPerformanceCaveat: false,
  }}
  onCreated={({ gl }) => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }}
  camera={{ fov: 35, near: 1, far: 400, position: [0, 0, 30] }}
/>
```

**Tone mapping is `NeutralToneMapping` (Khronos PBR Neutral), not ACES.** ACES pulls saturated reds
toward orange and desaturates exactly the candy colours this brand is built on; a `#F5333F` filament
renders as a dull brick. PBR Neutral was designed for product viewers and holds hue on saturated
albedo while still rolling off highlights. This is the single most visible renderer setting on the
site and it must not be left at the default.

`ColorManagement` stays enabled (three's default since r155). All filament hexes go through
`new THREE.Color().setStyle(hex, THREE.SRGBColorSpace)` so they land in linear space correctly.

---

# PART A · The catalog viewer

Real `.glb` files that Shai uploads through the admin panel. Component tree:

```
src/components/three/
  ProductViewer.tsx        // public entry, decides 3D vs turntable vs poster
  ViewerCanvas.tsx         // the <Canvas>, dynamic({ ssr:false })
  ModelStage.tsx           // loads the glb, normalizes, fits camera
  StudioRig.tsx            // lights + baked lightformer environment
  ContactPad.tsx           // ContactShadows + the cream halo
  PrintedMaterial.ts       // material normalisation + layer-line shader patch
  CameraFit.ts             // bounding-sphere fit maths
  GestureGuard.ts          // touch arbitration between orbit and page scroll
  usePerfGovernor.ts       // three-step quality ladder
  useCanRender3d.ts        // capability gate
  PosterFallback.tsx
  TurntableFallback.tsx    // sprite-sheet drag-to-spin
  loaders.ts               // local meshopt + draco decoders
```

## A.1 Camera

`PerspectiveCamera`, **fov 35°**, `near 1`, `far 400` (units = cm, so 1cm to 4m).

35° is roughly an 62mm lens on full frame. Wide enough that a keychain has some tactile perspective
and you can feel the depth of a relief panel, narrow enough that a wall piece does not bow at the
edges. Orthographic was rejected: it flattens exactly the thing being sold, which is that the surface
has real height you could run a thumb over.

No orthographic toggle, no fov slider. One camera, always.

**Fit on load** (`CameraFit.ts`):

```ts
const box = new THREE.Box3().setFromObject(root);
const sphere = box.getBoundingSphere(new THREE.Sphere());
const fitDist = (sphere.radius / Math.sin((fov * Math.PI) / 360)) * 1.18;
// 1.18 = 18% breathing room so the silhouette never kisses the canvas edge
camera.position.set(fitDist * 0.28, fitDist * 0.22, fitDist * 0.93);
controls.target.copy(sphere.center);
```

The start position is deliberately off-axis (about 17° azimuth, 13° elevation). A dead-on front view
reads as a photograph and the visitor does not realise the thing is draggable. A three-quarter view
reads as an object.

`fitDist` is computed once at load and cached on the model doc as `cameraDistance` so the poster
studio and the site frame identically.

## A.2 Controls

drei `<OrbitControls>`:

```ts
{
  makeDefault: true,
  enablePan: false,                    // panning loses the object, and there is nothing to pan to
  enableDamping: true,
  dampingFactor: 0.075,                // ~9 frames of glide, springy without feeling greasy
  rotateSpeed: 0.62,
  zoomSpeed: 0.6,
  minDistance: fitDist * 0.55,         // stops you entering the mesh
  maxDistance: fitDist * 2.10,         // stops the object becoming a speck
  minPolarAngle: 0.30,                 // ~17°, never straight down onto the top face
  maxPolarAngle: 1.92,                 // ~110°, 20° below horizon and no further
  target: sphereCenter,                // locked; there is no way to move it
  autoRotate: true,
  autoRotateSpeed: 0.85,               // one revolution / 42s
  keyPanSpeed: 0,
  enableZoom: false,                   // see A.7, zoom is re-enabled per-gesture
}
```

`maxPolarAngle: 1.92` is the important one. It keeps you from orbiting under the contact shadow, which
is the single ugliest thing a naive product viewer does: the object appears to float over a hole.
`minPolarAngle: 0.30` keeps the rig's key light from ever being directly behind the camera, which
flattens the print.

**Auto-rotate stops permanently on first user input** (`pointerdown`, `keydown`, or the reset button)
and never resumes in that session. A turntable that restarts while you are looking at something is a
UI fighting its user.

Keyboard: arrow keys orbit 4°/press, `+`/`-` dolly 6%, `Home` resets to the fit pose over 420ms with
`easeOutBack(1.15)` so it lands with a small overshoot. The canvas wrapper is `tabIndex={0}` with
`role="img"` and `aria-label={product.altHe}`.

## A.3 Lighting rig

`StudioRig.tsx`. Everything is defined in scene units (cm) and scaled by `fitDist` so the rig is
model-size independent.

```tsx
const D = fitDist; // fit distance from A.1

<ambientLight intensity={0.42} color="#FFF7EC" />

{/* KEY: warm white, upper camera-right */}
<directionalLight
  position={[D * 0.62, D * 0.78, D * 0.55]}
  intensity={2.05}
  color="#FFFFFF"
/>

{/* FILL: cool turquoise-tinted, lower camera-left. This is the toy-store move. */}
<directionalLight
  position={[-D * 0.78, D * 0.26, D * 0.42]}
  intensity={0.72}
  color="#CFF4F2"
/>

{/* RIM: sunshine kicker from behind, gives the silhouette a candy edge */}
<directionalLight
  position={[-D * 0.18, D * 0.55, -D * 0.85]}
  intensity={1.35}
  color="#FFD36B"
/>

{/* GROUND BOUNCE: cream up-light so the underside never goes dead */}
<hemisphereLight args={['#FFFFFF', '#FFF0DC', 0.30]} />
```

The warm-key / cool-fill split is the whole difference between "toy" and "artisan". An all-warm rig
with a golden bounce reads as a craft workshop, which the brief explicitly forbids. One cool light at
28% of the key's power is enough to shift the read without tinting the plastic.

**Environment: a hand-built lightformer rig baked to a 64px cube render target. No file, no fetch.**

```tsx
<Environment resolution={64} frames={1} background={false} blur={0.6}>
  {/* big softbox overhead */}
  <Lightformer form="rect" intensity={2.2} color="#FFFFFF"
    position={[0, D * 1.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[D * 2.2, D * 1.6, 1]} />
  {/* cool strip camera-left */}
  <Lightformer form="rect" intensity={1.1} color="#9FE9E5"
    position={[-D * 1.3, D * 0.3, D * 0.4]} rotation={[0, Math.PI / 2, 0]} scale={[D * 1.4, D * 1.1, 1]} />
  {/* warm strip camera-right */}
  <Lightformer form="rect" intensity={0.9} color="#FFE2AE"
    position={[D * 1.3, D * 0.2, D * 0.3]} rotation={[0, -Math.PI / 2, 0]} scale={[D * 1.2, D * 1.0, 1]} />
  {/* cream floor card, kills the black underside reflection */}
  <Lightformer form="rect" intensity={0.5} color="#FFF7EC"
    position={[0, -D * 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[D * 2.0, D * 2.0, 1]} />
</Environment>
```

### Why this and not the alternatives

| option | cost | verdict |
|---|---|---|
| Real `.hdr` in `/public` | a usable 1k HDRI is 1.5-4 MB, larger than the model itself; blows the mobile budget before a single triangle arrives | **rejected** |
| drei `<Environment preset="city" />` | fetches 1-3 MB from `raw.githack.com/pmndrs/drei-assets`, an external CDN. Fails or stalls behind restrictive in-app webviews and corporate proxies, and the brief requires no external fetch | **rejected** |
| Hand-built lightformers, `frames={1}` | 0 bytes over the wire, bakes in one frame (~3ms at resolution 64), fully art-directable to the exact palette | **chosen** |

`frames={1}` bakes once and never re-renders. `resolution={64}` is deliberately tiny: the environment
here supplies broad ambient direction and a soft specular sheen, not legible reflections. Matte PLA at
roughness 0.62 destroys any detail above about 32px anyway. Raising it to 256 costs about 12ms of
setup and changes nothing you can see.

## A.4 Material treatment for printed plastic

Uploaded glTF materials are **normalised, not replaced.** Shai may legitimately export a model with
two materials for a two-colour print, and that intent must survive.

`PrintedMaterial.ts`, run over every `MeshStandardMaterial` in the loaded scene:

```ts
const FINISH = {
  matte: { roughness: 0.72, metalness: 0.0, envMapIntensity: 0.45, clearcoat: 0.0 },
  silk:  { roughness: 0.28, metalness: 0.18, envMapIntensity: 0.95, clearcoat: 0.0 },
  glow:  { roughness: 0.66, metalness: 0.0, envMapIntensity: 0.40, emissiveBase: 0.06 },
};
```

Applied on top of whatever the file carried:

```ts
mat.metalness  = FINISH[finish].metalness;
mat.roughness  = THREE.MathUtils.clamp(mat.roughness ?? 0.5, 0.55, 0.85); // for matte
mat.envMapIntensity = FINISH[finish].envMapIntensity;
mat.flatShading = false;
mat.side = THREE.FrontSide;    // never DoubleSide; it doubles fragment cost and hides bad normals
mat.dithering = true;          // kills banding on the large flat cream-lit gradients
```

`dithering = true` matters more than it sounds. A matte white print lit by a big soft key produces
exactly the wide, low-contrast gradient that shows 8-bit banding on a phone panel, and it is free.

### Layer lines without modelling them

An FDM print's signature is a stack of squashed round beads, one per layer, running perpendicular to
the build direction. Modelling them is out of the question (a 60mm panel at 0.2mm is 300 layers).
Baking them into a normal map fails because uploaded glTF UVs are arbitrary.

**Solution: an object-space procedural ridge injected into the material via `onBeforeCompile`, keyed
to the model's build axis, with a screen-space fade so it can never alias.**

```ts
// PrintedMaterial.ts
export function patchLayerLines(
  mat: THREE.MeshStandardMaterial,
  { layerHeightCm, strength = 0.055, upAxis = 'y' as 'x'|'y'|'z' },
) {
  mat.userData.uLayerHeight = { value: layerHeightCm };   // 0.2mm -> 0.02
  mat.userData.uLayerStrength = { value: strength };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLayerHeight = mat.userData.uLayerHeight;
    shader.uniforms.uLayerStrength = mat.userData.uLayerStrength;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying float vLayerCoord;`)
      .replace('#include <begin_vertex>',
        `#include <begin_vertex>\nvLayerCoord = position.${upAxis};`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        `#include <common>\nvarying float vLayerCoord;\nuniform float uLayerHeight;\nuniform float uLayerStrength;`)
      .replace('#include <normal_fragment_maps>', `
        #include <normal_fragment_maps>
        {
          float p   = uLayerHeight;
          float t   = fract(vLayerCoord / p);
          float tri = abs(t - 0.5) * 4.0 - 1.0;              // -1..1, bead cross-section
          float sspp = fwidth(vLayerCoord) / p;              // periods per pixel
          float vis = 1.0 - smoothstep(0.30, 0.80, sspp);    // fade before Nyquist
          normal = normalize(normal + vec3(0.0, tri * uLayerStrength * vis, 0.0));
          roughnessFactor = clamp(roughnessFactor + tri * 0.055 * vis, 0.05, 1.0);
        }
      `);
  };
  mat.customProgramCacheKey = () => `layer-${layerHeightCm}-${upAxis}`;
}
```

Three things make this work rather than turn into moiré:

1. `fwidth` measures how many layer periods fall inside one pixel. When that crosses 0.30 the ridges
   start to alias, so `vis` ramps them out and by 0.80 they are gone. Zoomed in you feel the layers;
   zoomed out you see a clean matte surface. No mip pyramid, no texture, no aliasing, ever.
2. The wave is a **triangle**, not a sine or a sawtooth. A triangle perturbation of the normal reads
   as a row of rounded beads, which is what a layer actually is. A sawtooth gives a hard flip that
   looks like a scratched surface.
3. Roughness is modulated in step with the normal. Real layer crests catch specular slightly
   differently to the valleys, and moving both together is what sells it.

`upAxis` comes from the model doc (`printUpAxis`, default `'y'`). It matters: a model Shai printed
lying on its side has layers running along Z, and ridges in the wrong direction look like a
manufacturing defect.

`customProgramCacheKey` prevents three from recompiling the shader per material instance.

## A.5 Contact shadows and the pad

```tsx
<ContactShadows
  position={[0, boxMinY - 0.02, 0]}
  scale={sphere.radius * 3.4}
  resolution={512}
  blur={2.6}
  far={sphere.radius * 1.4}
  opacity={0.44}
  color="#1A1420"
  frames={1}              // the object never moves; the camera does. Bake once.
/>
```

`frames={1}` is a straight saving of one depth pass per frame. The model is static and only the camera
orbits, so a re-render every frame buys nothing.

Under it, **not in WebGL**: a CSS radial gradient on the canvas wrapper,
`radial-gradient(ellipse 62% 46% at 50% 78%, #F6E9D6 0%, #FFF7EC 72%)`. This gives the object a warm
pool to sit in without a floor plane in the scene. A real floor plane would need to be lit, would
clip on wide models, and would be visible as an edge when the camera goes low.

## A.6 Loading

### Compression: meshopt, with DRACO kept as a read-only fallback

**Chosen: `EXT_meshopt_compression`.**

| | meshopt | DRACO |
|---|---|---|
| decoder payload | 25 KB, plain JS + a tiny inline wasm | 190 KB wasm + 30 KB glue |
| decode speed, 150k tris, mid Android | ~35 ms | ~210 ms |
| where the decoder normally comes from | ours | most tutorials point at `gstatic.com`, an external fetch |
| encoder in a Convex Node action | `@gltf-transform/functions` `meshopt()`, pure JS, no build step | `draco3dgltf`, wasm, more fragile in a serverless isolate |

Both decoders are vendored to `/public/decoders/` at build time by a `postinstall` script that copies
from `node_modules/three/examples/jsm/libs/`. Nothing is ever fetched from a third-party host.

```ts
// src/components/three/loaders.ts
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export const configureLoader = (loader: GLTFLoader) => {
  loader.setMeshoptDecoder(MeshoptDecoder);
  const draco = new DRACOLoader();
  draco.setDecoderPath('/decoders/draco/');   // local, for files that arrive pre-compressed
  draco.setDecoderConfig({ type: 'wasm' });
  loader.setDRACOLoader(draco);
};
```

The DRACO path exists only so a `.glb` Shai downloaded from a model site and uploaded as-is still
loads. Our own pipeline always outputs meshopt.

`useGLTF.preload(url)` is called on the product card's `pointerenter` / `focus` on desktop, so by the
time the detail page mounts the file is usually in the HTTP cache.

### Progressive loading state

Three layers, all present simultaneously, revealed in order:

1. **t=0**: the poster `.webp` is already on screen as the card's background (it was the catalog
   thumbnail, so it is in cache and paints instantly). `filter: saturate(0.85)`.
2. **t=0**: over the poster, the small print-head loader from PART D, 90px wide, sweeping. Under it
   a 3px turquoise progress bar driven by drei's `useProgress().progress`, `transition: width 180ms`.
3. **on `loaded`**: the canvas fades in over 320ms `cubic-bezier(.2,.8,.2,1)` while the poster fades
   out over 260ms with a 60ms delay, so there is never a frame of empty cream. The model itself does a
   single 380ms `scale 0.94 → 1.0` with `easeOutBack(1.2)` on the root group. One small bounce on
   arrival, which is the whole toy-store motion language in 380 milliseconds.

`useProgress` reports real bytes, so the bar is honest. If `total` is 0 (cached response, no
content-length) the bar goes straight to 100% and the fade runs; no fake crawl.

### When WebGL is missing or the device is weak

`useCanRender3d.ts`, evaluated once per session and memoised in `sessionStorage`:

```ts
export function canRender3d(): '3d' | 'turntable' | 'poster' {
  if (typeof window === 'undefined') return 'poster';
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return 'turntable';                                    // no WebGL at all

  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(renderer)) return 'turntable';

  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 4;
  if (cores <= 2 || mem <= 2) return 'turntable';

  const saveData = (navigator as any).connection?.saveData;
  const slow = /^(slow-2g|2g)$/.test((navigator as any).connection?.effectiveType ?? '');
  if (saveData || slow) return 'poster';                          // do not spend 3 MB on a 2G user

  return '3d';
}
```

`prefers-reduced-motion: reduce` does **not** downgrade to poster. It keeps 3D and disables
`autoRotate`, the arrival bounce, and the damping glide (`dampingFactor: 0.25`). Reduced motion means
no unrequested movement; it does not mean no interactivity.

- **`'turntable'`** → `TurntableFallback.tsx`. A 24-frame sprite sheet, 6×4 tiles of 384px
  (2304×1536 webp, ~110 KB at q82), driven by `background-position` steps from a horizontal drag or a
  left/right arrow key. Zero JS decode per frame, works in any browser back to IE-era layout engines,
  and it still spins, which is the thing the visitor wanted. The drag has the same 0.62 rotate speed
  feel: 14px of drag = one frame.
- **`'poster'`** → `PosterFallback.tsx`. The 1200px webp with a caption and a button that upgrades to
  the turntable on demand ("לראות מכל הכיוונים"). Nothing auto-downloads.

### Context loss

In-app webviews kill WebGL contexts when the app is backgrounded, and they do not always restore them.

```ts
gl.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  setMode('turntable');           // silent, instant, no error UI
});
gl.domElement.addEventListener('webglcontextrestored', () => setMode('3d'));
```

The visitor sees the turntable appear where the 3D was. No dialog, no reload prompt.

## A.7 Touch, pinch, and the page-scroll fight

The classic failure: a full-width canvas swallows every vertical swipe and the visitor cannot scroll
past the product. The classic overcorrection: `touch-action: pan-y`, which kills vertical orbit and
makes the model feel broken.

**Three mechanisms together.**

1. **The canvas is never full-bleed on mobile.** It sits in a rounded card with `24px` of cream
   margin on each side and `padding-block: 32px`. There is always a strip of page to scroll from.
   Non-negotiable layout constraint on the product page.

2. **First-gesture axis arbitration** (`GestureGuard.ts`). Until the visitor has successfully orbited
   once in this session, the first 12px of any touch decide who owns the gesture:

```ts
// on touchstart: record (x0, y0), set controls.enabled = false, wrapper touchAction = 'pan-y'
// on touchmove, before 12px of travel:
const dx = Math.abs(x - x0), dy = Math.abs(y - y0);
if (Math.hypot(dx, dy) < 12) return;                 // undecided, let the browser scroll
if (dy > dx * 1.6 && !hasOrbitedThisSession) {
  ownedBy = 'page';                                  // clearly a scroll, stay out of the way
} else {
  ownedBy = 'model';
  wrapper.style.touchAction = 'none';
  controls.enabled = true;
  hasOrbitedThisSession = true;                      // persisted to sessionStorage
}
```

   After the first successful orbit the card owns the gesture outright (`touch-action: none`,
   `controls.enabled = true` from `touchstart`) because the visitor has demonstrated they know what
   the card is. This is the correct trade: strangers get their scroll, users get their orbit.

3. **Zoom is gated to two pointers.** `enableZoom` starts `false` and is toggled by pointer count:

```ts
onPointerDown: () => { if (++pointers >= 2) controls.enableZoom = true; }
onPointerUp:   () => { if (--pointers < 2)  controls.enableZoom = false; }
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
```

   Because `enableZoom` is false whenever zero pointers are down, **the mouse wheel never zooms.** A
   desktop visitor scrolling down the page rolls straight past the canvas, which is the behaviour
   everyone expects and almost no 3D viewer delivers. Desktop zoom is the `+` / `−` buttons on the
   card (each step 12% of the current distance, animated over 260ms) and pinch on a trackpad works
   because macOS pinch arrives as a `ctrlKey` wheel event, which we map explicitly.

**Double-tap** (two `pointerup` within 280ms and 24px) resets to the fit pose over 420ms. On desktop,
double-click does the same.

An affordance chip sits bottom-centre over the canvas: `גררו לסובב`, cream pill on `--color-ink` at
82% opacity, fading out over 400ms on first interaction and never returning.

## A.8 Performance budget and the quality ladder

### Asset budget, enforced at upload

| | target | warn | hard reject |
|---|---|---|---|
| triangles | ≤ 120,000 | > 180,000 | > 400,000 |
| meshes (draw calls) | ≤ 8 | > 16 | > 60 |
| materials | ≤ 4 | > 6 | > 20 |
| largest texture | ≤ 1024² | > 1024² (auto-resized) | > 4096² |
| `.glb` after optimize | ≤ 2.5 MB | > 2.5 MB | > 6 MB |
| upload size, `.glb` | n/a | n/a | > 40 MB |
| upload size, `.stl` | n/a | n/a | > 60 MB |

Warn means the admin sees an amber row and a one-click "לדחוס אותו בשבילי" that reruns the optimize
action with `simplify({ ratio: 0.5, error: 0.001 })`. Reject means the model never reaches `ready`.

### Runtime dpr

```ts
const dprRange: [number, number] =
  deviceMemory <= 4 || cores <= 4 ? [1, 1.25] : [1, 1.75];
```

Capping at 1.75 rather than the device's native 3 costs nothing visible on a matte object with no
fine texture detail and saves roughly 60% of the fragment work on a modern phone.

### The quality ladder (`usePerfGovernor.ts`)

Driven by drei `<PerformanceMonitor>` with `bounds={(refresh) => [50, 90]}` and a 90-frame window.
On each `onDecline`, step down one rung. Steps are never reversed within a session; oscillation is
worse than a slightly lower setting.

| rung | change | expected saving |
|---|---|---|
| 0 | full quality | n/a |
| 1 | `dpr → 1.0` | ~45% fragment cost |
| 2 | drop `<ContactShadows>`, `Environment resolution → 32`, `antialias` stays (can't change post-init) | ~15% |
| 3 | layer-line shader `strength → 0` (skips the `fwidth` branch) | ~6% |
| 4 | **unmount the canvas, mount `TurntableFallback`** | all of it |

Rung 4 fires only if the rolling average frame time is still above 34ms (under 30fps) after rungs 1-3
have been applied and 120 further frames have elapsed. The swap is a 260ms crossfade and the visitor
is told nothing; the turntable spins, the price is unchanged, the WhatsApp button is unchanged.

### Not rendering off screen

`frameloop="demand"` is the base state. Frames are requested by drei's OrbitControls on change, and
continuously only while all of these hold:

```ts
const shouldLoop = isIntersecting && !documentHidden && (autoRotating || dampingActive || isAnimating);
```

- `isIntersecting` from an `IntersectionObserver` on the wrapper, `threshold: 0.12`,
  `rootMargin: '80px'`.
- `documentHidden` from `visibilitychange`.
- When `shouldLoop` goes false, `setFrameloop('demand')`, and one final `invalidate()` so the last
  state is painted rather than left mid-damp.

Result: a visitor who scrolls past the product section spends zero GPU on it, and a visitor who
switches tabs with the page open spends zero battery.

## A.9 Admin upload contract

### Accepted formats

**`.glb` and `.stl`.**

`.stl` is not a concession, it is the primary case. Shai's slicer and his CAD both hand him STL; a
13-year-old should not have to learn Blender to put a model on his own website. Rejecting his native
format would mean the admin panel gets used once.

Rejected with an explicit message: `.gltf` + `.bin` + textures (multi-file, no reliable upload story),
`.obj`, `.3mf`, `.step`, `.fbx`. Message: `אני מקבל כאן קבצי GLB ו-STL. אם יש לך פורמט אחר, תייצא ל-STL מהסלייסר.`

### Pipeline

`convex/modelPipeline.ts`, a `"use node"` action chain. Each stage writes `status` so the admin sees
live progress via the Convex subscription.

```
uploading → validating → converting (stl only) → optimizing → awaiting_poster → ready
                     ↘ failed (with failureCode + failureDetail)
```

1. **`validateUpload`**: magic bytes (`glTF` / STL 80-byte header + `uint32` triangle count matching
   `(size - 84) / 50`), size caps, and for `.glb` a `@gltf-transform/core` read that must produce at
   least one mesh primitive.

2. **`convertStlToGlb`** (STL only): binary STL is parsed directly (80-byte header, `uint32 count`,
   then 50 bytes per triangle: 12 floats + 2 attribute bytes). No three.js loader and no DOM shim
   needed. Vertices are welded on a 1e-4 grid via a hash map, normals recomputed from the welded
   result, and the mesh written with `@gltf-transform/core`'s `Document` API with a single
   `MeshStandardMaterial` at `baseColorFactor` = the admin-chosen default filament and
   `roughnessFactor: 0.72`. ASCII STL is detected (`solid ` prefix and no valid binary triangle count)
   and parsed with a line scanner; it is rare but a slicer export can produce it.

3. **`optimizeGlb`**: `@gltf-transform/functions`:
   ```ts
   await doc.transform(
     dedup(),
     weld({ tolerance: 1e-4 }),
     simplify({ simplifier: MeshoptSimplifier, ratio: targetRatio, error: 0.0012 }),  // only if tris > 180k
     resample(),
     prune(),
     textureCompress({ targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
     quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
     meshopt({ encoder: MeshoptEncoder, level: 'high' }),
   );
   ```
   `textureCompress` to webp at q82 is the same setting proven on the site's 2D assets (3.3 MB → 142 KB).
   `EXT_texture_webp` is supported by three's `GLTFLoader`, so no runtime cost.
   Quantisation to 14-bit positions is imperceptible at these object sizes and roughly halves the
   position buffer before meshopt even runs.

4. **`measureModel`**: triangles, vertices, mesh count, material count, max texture dimension,
   bounding box in mm, `sourceUnitScale`, and the precomputed `cameraDistance`. Written to the doc.

5. **`awaiting_poster`**: see below.

### Automatic poster generation, with no GPU server

The poster and the turntable sheet are rendered **in the admin's own browser**, in the same rig the
site uses, immediately after optimize completes.

`src/app/(admin)/admin/models/[id]/PosterStudio.tsx` mounts a `<Canvas>` at 1200×1200 with
`preserveDrawingBuffer: true` and `frameloop="never"`, loads the optimized glb, applies the identical
`StudioRig` and `PrintedMaterial`, then:

```ts
// poster: the exact hero pose from CameraFit
gl.render(scene, camera);
const poster = await new Promise<Blob>(r => gl.domElement.toBlob(b => r(b!), 'image/webp', 0.82));

// turntable: 24 frames at 384px into a 6x4 offscreen sheet
for (let i = 0; i < 24; i++) {
  orbitTo((i / 24) * Math.PI * 2);
  gl.render(scene, camera);
  sheetCtx.drawImage(gl.domElement, (i % 6) * 384, Math.floor(i / 6) * 384, 384, 384);
}
const sheet = await sheetCanvas.convertToBlob({ type: 'image/webp', quality: 0.82 });
```

Both blobs go to Convex storage and the doc flips to `ready`.

This is the right answer for three reasons: it costs nothing, it uses the one GPU that is guaranteed
to exist at that moment, and **the admin is watching the render happen**, which makes poster
generation double as the QA step. If it looks wrong in the poster studio, it looks wrong on the site,
and he sees that before a customer does. A `נסה זווית אחרת` control lets him nudge the hero azimuth
by ±30° and re-render; the chosen azimuth is stored as `posterAzimuth` and the site's start pose uses
it, so the poster and the first 3D frame match exactly. The crossfade from poster to canvas then has
no visible jump, which is the detail that makes the whole load sequence feel expensive.

If the admin closes the tab mid-render the doc stays `awaiting_poster` and the models list shows an
amber `להשלים תצוגה מקדימה` button that resumes it.

### What the admin sees when a model fails

A red-left-border card in `admin/models`, with the real numbers. Never a generic error.

| `failureCode` | what the admin sees |
|---|---|
| `BAD_MAGIC` | `הקובץ הזה לא GLB ולא STL. בדוק שהוא לא ZIP או תיקייה.` |
| `TOO_LARGE` | `הקובץ 63MB. המקסימום ל-STL הוא 60MB. תייצא ברזולוציה נמוכה יותר מהסלייסר.` |
| `TOO_MANY_TRIS` | `במודל 812,000 משולשים. המקסימום הוא 400,000.` + a `לדחוס אותו בשבילי` button |
| `NO_MESH` | `לא מצאתי גיאומטריה בקובץ. אולי נשמרה רק מצלמה או תאורה.` |
| `DEGENERATE_BOX` | `כל הנקודות במודל באותו מקום. הקובץ כנראה נשמר באמצע ייצוא.` |
| `NAN_GEOMETRY` | `יש קואורדינטות לא חוקיות במודל. תייצא שוב.` |
| `CONVERT_FAILED` | `ההמרה מ-STL נכשלה.` + the raw error in a collapsible `פרטים טכניים` |
| `RUNTIME_LOAD_FAILED` | reported from the public site by a `models.reportLoadFailure` mutation, with `userAgent`. `המודל נטען אצלך בסדר, ואצל 3 מבקרים הוא נכשל.` |

Every failed card carries `הורדת הקובץ המקורי` (the original storage id is always kept) and
`נסה שוב`. The product page falls back to the poster and stays fully functional and orderable while a
model is broken. A broken model must never take the product offline.

## A.10 Convex schema (3D-owned tables)

```ts
// convex/schema.ts
models: defineTable({
  productId: v.optional(v.id('products')),
  titleHe: v.string(),
  altHe: v.string(),                                  // aria-label for the canvas

  originalStorageId: v.id('_storage'),
  originalFormat: v.union(v.literal('glb'), v.literal('stl')),
  storageId: v.optional(v.id('_storage')),            // optimized .glb, meshopt
  posterStorageId: v.optional(v.id('_storage')),      // 1200x1200 webp q82
  turntableStorageId: v.optional(v.id('_storage')),   // 2304x1536 webp sprite sheet, 6x4 @384

  status: v.union(
    v.literal('uploading'), v.literal('validating'), v.literal('converting'),
    v.literal('optimizing'), v.literal('awaiting_poster'), v.literal('ready'), v.literal('failed'),
  ),
  failureCode: v.optional(v.string()),
  failureDetail: v.optional(v.string()),

  triangles: v.number(),
  vertices: v.number(),
  meshCount: v.number(),
  materialCount: v.number(),
  maxTextureSize: v.number(),
  bytesOriginal: v.number(),
  bytesOptimized: v.optional(v.number()),

  boundingMm: v.object({ x: v.number(), y: v.number(), z: v.number() }),
  sourceUnitScale: v.number(),                        // glTF units -> metres, usually 1
  cameraDistance: v.number(),                         // scene units, from CameraFit
  posterAzimuth: v.number(),                          // radians, chosen in the poster studio
  printUpAxis: v.union(v.literal('x'), v.literal('y'), v.literal('z')),
  defaultFinish: v.union(v.literal('matte'), v.literal('silk'), v.literal('glow')),

  runtimeFailures: v.number(),                        // incremented by reportLoadFailure
  createdAt: v.number(),
  updatedAt: v.number(),
  uploadedBy: v.id('users'),
}).index('by_product', ['productId']).index('by_status', ['status']),
```

---

# PART B · The generator's photo-to-3D engine

The flagship. A visitor drops in a photo, picks a print type, picks up to 4 filament colours, picks a
size, and about three seconds later they are orbiting a real 3D object built from their own picture,
with a price under it. All of it in the browser, on their phone, with no upload.

**The photo never leaves the device during preview.** It is read as a `File`, decoded locally, and
turned into geometry locally. Upload to Convex storage happens exactly once, at the moment the visitor
presses the WhatsApp button, so Shai receives a link to the picture alongside the spec. This is worth
saying out loud in the microcopy (§C) because it is both true and reassuring.

```
src/components/generator/
  PreviewStage.tsx          // canvas + wait state + honesty copy + lights-off switch
  GeneratorCanvas.tsx
  PreviewMesh.tsx
  LightsOffSwitch.tsx
  PrintBuildAnimation.tsx   // PART D
  previewTypes.ts

src/workers/
  heightmap.worker.ts       // module worker, owns every per-pixel and per-vertex loop

src/lib/geometry/
  readImage.ts              // decode, orient, downsample
  heightmap.ts              // luminance, auto-levels, blur, quantise  (pure, shared)
  posterize.ts              // 1D k-means on the histogram
  buildPanel.ts             // the core displaced-panel kernel
  buildRingHole.ts
  buildFrame.ts
  buildStand.ts
  buildMagnetPocket.ts
  metrics.ts                // volume -> grams -> minutes
  litho.ts                  // Beer-Lambert thickness mapping + shader patch
```

## B.1 The shared pipeline

### Stage 1 · Read and downsample

```ts
// readImage.ts, runs on the main thread only long enough to hand off an ImageBitmap
const bitmap = await createImageBitmap(file, {
  imageOrientation: 'from-image',      // respects EXIF; phone portraits arrive rotated otherwise
  premultiplyAlpha: 'none',
  colorSpaceConversion: 'default',
  resizeWidth,  resizeHeight,          // computed to fit the grid, see below
  resizeQuality: 'high',               // browser-native Lanczos-ish, far better than canvas drawImage
});
worker.postMessage({ type: 'build', bitmap, params }, [bitmap]);   // transferable, zero copy
```

`createImageBitmap` does the decode and the resample on a browser-internal thread. A 12 MP phone JPEG
goes to a 320px working grid in 180-320ms on a mid Android without touching the main thread's frame
budget. Doing this with `<img>` + `canvas.drawImage` instead would block the main thread for the whole
decode and produce a worse downsample.

Fallback if `createImageBitmap` options are unsupported (older Safari): decode via `<img>`, draw into
an `OffscreenCanvas` at the target size with `imageSmoothingQuality: 'high'`, and pass the
`ImageData`. Costs about 90ms more.

The grid's long edge (`gridLong`) comes from the print type row (§B.3) and is clamped by device:

```ts
const gridLong = Math.min(
  printType.gridLong,                                   // 256 for most types
  (navigator.hardwareConcurrency ?? 4) >= 8 ? 320 : 224, // desktop gets more resolution
);
// short edge follows the photo's aspect, rounded to even
```

At 256×256 the panel is 65,536 vertices and 130,050 triangles, which sits right at the catalog budget.
At 320 it is 102k verts / 203k tris, acceptable on a machine that reported 8+ cores.

The visitor's crop box (a square/portrait/landscape frame they can drag over the photo before pressing
the build button) is applied here as a source rect, so the grid always maps to the region they chose.

### Stage 2 · Luminance and levels

All inside the worker, on `ImageData.data`.

```ts
const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

// per pixel
const l = 0.2126 * srgbToLinear(r/255) + 0.7152 * srgbToLinear(g/255) + 0.0722 * srgbToLinear(b/255);
```

Rec.709 luma on **linearised** channels. Doing it on raw sRGB bytes (the common shortcut) makes
mid-tones about 18% too bright and flattens every relief; skin tones in particular collapse.

Then, in order:

1. **Auto-levels.** Build a 256-bin histogram, take the 1.0 and 99.0 percentiles as black and white
   points, remap linearly, clamp. This is what rescues an underexposed phone snapshot, which is most
   of them. If `p99 - p01 < 0.08` (a nearly flat image) the remap is skipped and a
   `lowContrast: true` flag is returned so the UI can say something useful.
2. **Midtone lift**, `l = Math.pow(l, 0.86)`. Relief and lithophane both read better with the
   mid-tones opened; without it, faces sit in the bottom third of the thickness range and the print
   looks like a shadow.
3. **3×3 Gaussian**, σ = 0.8, one pass, separable. JPEG chroma noise and block artefacts become
   visible ridges in a displaced mesh, and they are the single most common reason an unfiltered
   lithophane looks like sandpaper. One blur pass at the working resolution costs about 4ms.
4. **Optional edge preservation** for `relief` and `keychain`: after the blur, `l = mix(lBlur, lRaw, 0.35)`
   only where the local gradient magnitude exceeds 0.12. Keeps eyes and lettering crisp while the
   flat areas stay smooth. Roughly 3ms.

Output: `Float32Array height[w*h]` in `0..1`, plus the histogram (reused by §B.4).

### Stage 3 · Geometry

**Real vertex displacement on the CPU, in the worker. Not `displacementMap`.**

`displacementMap` is a vertex-shader offset. It would give a correct silhouette and nothing else:

- The price depends on **estimated filament grams**, which needs the actual displaced volume. A
  shader offset is invisible to JavaScript.
- `ContactShadows` renders the undisplaced flat plane, so the object would cast the shadow of a sheet
  of paper.
- Normals from `normalScale` guesswork on a displaced plane are wrong at every crest, and the whole
  point of the preview is that you can see the surface relief catch the light.
- Ring holes, magnet pockets, side walls and back plates are topology changes. A displacement map
  cannot cut a hole.

So the worker builds real buffers and transfers them:

```ts
// buildPanel.ts: the kernel. Returns transferable ArrayBuffers.
export interface PanelResult {
  position: Float32Array;   // (w*h + wall verts) * 3
  normal:   Float32Array;
  uv:       Float32Array;
  color:    Float32Array;   // per-vertex filament colour, linear RGB
  thickness: Float32Array;  // per-vertex thickness in cm, used by the lithophane shader
  index:    Uint32Array;
  volumeMm3: number;
  boundingMm: { x: number; y: number; z: number };
}
```

Vertex layout: a `w × h` grid for the front face, then a duplicated `w × h` grid (or a single quad if
the back is flat) for the back face, then a welded skirt of `2*(w + h) - 4` wall quads joining the two
rims. The result is a closed, watertight solid, which matters visually (a floating sheet reads fake
the instant you orbit past 60°) and numerically (a closed mesh has a defined volume).

**Normals are computed analytically from the heightmap**, not with `computeVertexNormals`:

```ts
// central differences in heightmap space
const dzdx = (H[i + 1] - H[i - 1]) * heightScale / (2 * cellX);
const dzdy = (H[i + w] - H[i - w]) * heightScale / (2 * cellY);
n = normalize(-dzdx, -dzdy, 1);
```

Two array reads per vertex instead of an accumulate-over-faces pass. About 6× faster, and smoother,
because face-averaged normals on a terraced surface produce a soft mush exactly where you want the
terraces to read.

Main thread receives the buffers and does only this:

```ts
const g = new THREE.BufferGeometry();
g.setAttribute('position',  new THREE.BufferAttribute(position, 3));
g.setAttribute('normal',    new THREE.BufferAttribute(normal, 3));
g.setAttribute('uv',        new THREE.BufferAttribute(uv, 2));
g.setAttribute('color',     new THREE.BufferAttribute(color, 3));
g.setAttribute('aThickness',new THREE.BufferAttribute(thickness, 1));
g.setIndex(new THREE.BufferAttribute(index, 1));
g.boundingSphere = new THREE.Sphere(center, radius);   // precomputed in the worker
```

No loops, no `computeBoundingSphere`. Total main-thread work: under 8ms.

### Stage 4 · Where the work happens, and the fallback

```ts
const worker = new Worker(new URL('../workers/heightmap.worker.ts', import.meta.url), { type: 'module' });
```

Next 16 with Turbopack bundles module workers from a `new URL` specifier correctly. All of
`src/lib/geometry/*` is pure and imported by both the worker and the fallback path, so there is one
implementation.

If `new Worker` throws (a small number of in-app webviews block module workers), the same pure
functions run on the main thread through a slicing scheduler:

```ts
// runs the identical kernel in ~8ms slices so the wait animation never drops a frame
for (const chunk of sliceRows(h, 8 /* ms budget */)) {
  await new Promise(r => (window.scheduler?.postTask
    ? scheduler.postTask(r, { priority: 'user-visible' })
    : setTimeout(r, 0)));
  chunk();
}
```

Slower by roughly 40% wall-clock, but it never freezes and the animation in PART D keeps running.

### Stage 5 · Time budget

Measured target on a mid-range Android (Snapdragon 6-series class), 12 MP input, 256 grid:

| stage | budget | thread |
|---|---|---|
| `createImageBitmap` decode + resize | 350 ms | browser internal |
| luminance + levels + blur | 120 ms | worker |
| k-means posterise (12 iters on 256 bins) | 15 ms | worker |
| panel build, walls, normals, colours | 400 ms | worker |
| extras (frame / stand / hole / pocket) | 90 ms | worker |
| buffer transfer | 30 ms | n/a |
| geometry upload + first render | 200 ms | main |
| **total** | **~1.2 s** | |

Desktop lands around 450ms. Both are **faster than the wait animation**, which is deliberate:
`PrintBuildAnimation` has a **2,600ms minimum**. Work that finishes in 400ms and snaps to a result
reads as "nothing happened"; the visitor does not believe a model was built. The build is gated as
`Promise.all([buildPromise, delay(2600)])`. Above 9,000ms the UI switches to a slower message and at
15,000ms it offers a smaller grid ("לנסות ברזולוציה נמוכה יותר").

## B.2 Colour mapping · posterising into filament bands

This is the feature the whole "choose up to 4 colours" flow rests on, so it gets the most exact
treatment in this document.

### The method

**Posterise the luminance into N bands, one band per chosen filament, applied as a per-vertex colour
attribute.** `MeshStandardMaterial` with `vertexColors: true` and `color: 0xffffff`.

Why posterising and not per-region segmentation: a multi-colour FDM print of a photo **is** a banded
colour swap. Shai changes filament at a layer boundary, or prints separate regions and glues them.
The bands are not a stylisation of the product, they are an accurate drawing of it. Region
segmentation would need a model, a GPU, and would predict a print he cannot actually make.

### Choosing the band edges: 1D k-means, not equal steps

Equal-luminance steps put band boundaries in arbitrary places; on a portrait against a bright wall you
get three bands of background and one band containing the entire face.

```ts
// posterize.ts
export function bandEdges(hist: Uint32Array /* 256 */, n: number): number[] {
  // init: quantiles, which is already a decent guess and makes Lloyd converge in <12 iters
  let centres = quantiles(hist, n);
  for (let iter = 0; iter < 12; iter++) {
    const sum = new Float64Array(n), cnt = new Float64Array(n);
    for (let b = 0; b < 256; b++) {
      if (!hist[b]) continue;
      const k = nearestCentre(b / 255, centres);
      sum[k] += (b / 255) * hist[b];
      cnt[k] += hist[b];
    }
    let moved = 0;
    for (let k = 0; k < n; k++) if (cnt[k]) { const c = sum[k] / cnt[k]; moved += Math.abs(c - centres[k]); centres[k] = c; }
    if (moved < 1e-4) break;
  }
  centres.sort((a, b) => a - b);
  return midpoints(centres);   // n-1 edges
}
```

Runs on a 256-bin histogram, so it is O(256 · n · 12) regardless of image size. About 15ms.

Degenerate cases:
- An empty cluster keeps its previous centre and is nudged by `+1/256` so it cannot collapse onto a
  neighbour.
- If the whole histogram is inside 8 bins, fall back to equal quantiles.

### Assigning filaments to bands

Sort the visitor's chosen filament hexes by **relative luminance** (`0.2126R + 0.7152G + 0.0722B`, on
linearised channels) and pair rank to rank: darkest filament → darkest band.

This is not cosmetic. If a visitor picks black, red, yellow and white, the only arrangement that reads
as a picture is black in the shadows and white in the highlights. Letting them drag to reorder is
offered as a secondary control (`להחליף סדר`), and reordering re-renders the vertex colour attribute
only, in under 20ms, with no rebuild.

### Legibility guard

```ts
// metrics.ts
const MIN_SEPARATION = 0.06;   // in relative luminance
```

If two chosen filaments are within `0.06` of each other, the bands they produce will be almost
indistinguishable in the print. The engine returns `bandContrastWarning: { a: 'טורקיז', b: 'ירוק מנטה' }`
and the UI shows it near the palette, not as an error, as information (copy in §C.5). The preview
still renders exactly what they chose, honestly flat.

### Writing the colours

```ts
// per grid vertex, in the worker
const band = bandOf(H[i], edges);                      // 0..n-1
const c = filamentLinearRGB[band];                     // precomputed sRGB->linear
color[i*3] = c[0]; color[i*3+1] = c[1]; color[i*3+2] = c[2];
```

**No dithering.** Ordered or error-diffusion dithering across a band boundary looks like noise in
plastic, because plastic has no half-tone. The boundary is a hard step, exactly as it prints.

**One-sample boundary smoothing** is applied only to the *normals*, not the colours: at a band edge,
blend the analytic normal with its neighbour over one cell so the colour step lands on a geometric
terrace rather than mid-slope. The eye reads a colour change that sits on an edge as intentional and
one that sits on a gradient as a rendering error.

Finish presets modulate the band's material behaviour by writing a second per-vertex attribute
`aFinish` (0 = matte, 1 = silk, 2 = glow), used by a small `onBeforeCompile` patch to shift
`roughnessFactor` (0.72 / 0.28) and `emissive`. One material, one draw call, four colours, three
finishes.

### Lithophane is the exception

A lithophane's image comes from **thickness**, not colour. Printing it in four filaments produces mud.

So: when `printType.backlit === true`, the colour picker collapses to **one body filament** (white,
cream or a light natural is strongly recommended in the UI copy) plus, if the type has a frame or a
stand, **one accessory filament** for that part. The picker visibly changes, and the microcopy in §C.4
explains why in one sentence. `maxFilamentColors` is a `printTypes` field, so this is data, not a
special case in code.

## B.3 Print types

Every print type is a **row** in `printTypes`, selecting one of six geometry kernels and supplying its
parameters. Adding a size variant, a new thickness range or a new keychain shape is an admin action.
Adding a genuinely new kernel is a code change. That line is drawn deliberately and stated here so
nobody promises Shai something the schema cannot do.

```ts
// convex/schema.ts
printTypes: defineTable({
  slug: v.string(),                  // 'lithophane' | 'relief' | 'glow' | 'shelf' | 'keychain' | 'magnet' | 'framed'
  nameHe: v.string(),
  blurbHe: v.string(),
  kernel: v.union(
    v.literal('panel'), v.literal('panelHole'), v.literal('panelFrame'),
    v.literal('panelStand'), v.literal('panelPocket'), v.literal('panelFrameStand'),
  ),
  sortOrder: v.number(),
  active: v.boolean(),

  gridLong: v.number(),              // heightmap samples on the long edge
  invertLuminance: v.boolean(),      // true for lithophane
  backlit: v.boolean(),              // enables the Beer-Lambert shader + the light plane
  quantizeToLayer: v.boolean(),      // true for relief-style, false for lithophane

  thicknessMinMm: v.number(),
  thicknessMaxMm: v.number(),
  backPlateMm: v.number(),           // flat solid behind the relief
  borderMm: v.number(),              // raised rim around the panel

  sizePresetsMm: v.array(v.object({ labelHe: v.string(), longEdgeMm: v.number() })),
  maxLongEdgeMm: v.number(),
  maxFilamentColors: v.number(),     // 4 normally, 1 for lithophane body
  defaultFinish: v.union(v.literal('matte'), v.literal('silk'), v.literal('glow')),

  // kernel extras
  ringHoleMm: v.optional(v.number()),
  ringBossMm: v.optional(v.number()),
  magnetPocketMm: v.optional(v.object({ dia: v.number(), depth: v.number() })),
  frameWidthMm: v.optional(v.number()),
  frameDepthMm: v.optional(v.number()),
  standAngleDeg: v.optional(v.number()),
  standThicknessMm: v.optional(v.number()),

  createdAt: v.number(), updatedAt: v.number(),
}).index('by_slug', ['slug']).index('by_active_order', ['active', 'sortOrder']),
```

### 1 · ליטופן · `lithophane` · kernel `panel`, `backlit: true`

Seed row: `gridLong 288`, `invertLuminance true`, `quantizeToLayer false`,
`thicknessMinMm 0.8`, `thicknessMaxMm 3.0`, `borderMm 3.0`, `backPlateMm 0`,
`maxFilamentColors 1`, `maxLongEdgeMm 200`, sizes 100 / 140 / 180mm.

**Thickness mapping.** Bright pixel → thin wall → more light passes. Real lithophane transmission is
exponential, so a linear map produces a preview whose midtones are far too dark:

```ts
// litho.ts
const tMm = tMin + (tMax - tMin) * Math.pow(1 - L, 1 / 2.2);
```

0.8mm is four layers at 0.2 and is the thinnest wall that prints reliably without light leaking
through as pinholes. 3.0mm is where the darkest tone stops getting darker for white PLA. Both are
admin fields because Shai's printer and filament will move them.

`quantizeToLayer` is **false** here. A lithophane is printed in vase-ish thin walls and the terracing
is not the feature; forcing it in adds banding to a smooth gradient.

**Rendering the backlight without `transmission`.** `MeshPhysicalMaterial.transmission` costs a
full-screen backbuffer copy per frame and roughly halves the frame rate on a phone. It is also the
wrong physics: it models refraction through a clear medium, and a lithophane is a diffusing solid.

Instead, Beer-Lambert directly in the fragment shader, driven by the `aThickness` attribute the worker
already produced:

```glsl
// injected before <emissivemap_fragment>
// uBacklight = the light colour behind the panel, uMu = absorption per cm (white PLA ~ 11.0 /cm)
float trans = exp(-uMu * vThickness);          // vThickness in cm
totalEmissiveRadiance += uBacklight * trans * uBacklightStrength;
```

`uMu` default `11.0 /cm` (1.1/mm) for white PLA, an admin field `lithoAbsorption`. This is physically
what a lithophane does, it costs three instructions, and it responds correctly when the visitor
changes size (a bigger panel with the same thickness range looks identical, which is correct).

Behind the panel, at `z = -1.4cm`, a real emissive mesh: a rounded rect 1.15× the panel size,
`MeshBasicMaterial` with `color #FFF3DC`, plus a matching `rectAreaLight` at intensity 3.2 so the
panel's rim and frame catch a warm edge. The visitor can toggle it (`אור מאחור`), default **on**,
because a lithophane with the light off is a grey rectangle and would sell nothing.

### 2 · תבליט מורם · `relief` · kernel `panel`

Seed row: `gridLong 256`, `invertLuminance false`, `quantizeToLayer true`, `backlit false`,
`thicknessMinMm 1.6` (the solid back), `thicknessMaxMm 5.6` (so relief = 4.0mm),
`backPlateMm 1.6`, `borderMm 2.5`, `maxFilamentColors 4`, sizes 80 / 120 / 160mm.

Bright = tall. Front-lit, opaque, and this is the type where the four colours earn their money.

**Layer quantisation.**

```ts
const layer = settings.layerHeightMm / 10;                    // 0.02 cm
const t = base + Math.round((relief * L) / layer) * layer;
```

At 4.0mm of relief and 0.2mm layers that is 20 discrete terraces, which reads clearly at any zoom
without looking like a contour map. Quantising is done **before** the normals are computed, so the
analytic normals produce genuinely flat treads and vertical risers, and the layer-line shader from
§A.4 then adds the bead detail inside each terrace. The two effects stack correctly: big honest steps
from the geometry, fine beads from the shader.

**Crevice darkening.** A cheap ambient-occlusion term is folded into the vertex colour:

```ts
const lap = 4 * H[i] - H[i-1] - H[i+1] - H[i-w] - H[i+w];     // discrete Laplacian
const ao = 1 - clamp(-lap * aoStrength, 0, 0.34);             // concave -> darker
color[i*3+k] *= ao;
```

`aoStrength` default 2.2. One pass over the grid, roughly 2ms, and it is the difference between a
relief that looks embossed and one that looks like a printed picture.

### 3 · זוהר בחושך · `glow` · kernel `panel`, finish `glow`

Same geometry as `relief`. What changes is the material and the toggle.

Glow-in-the-dark PLA is a strontium-aluminate loaded filament: pale mint green in daylight, greenish
cyan when charged.

```ts
const GITD = {
  daylightColor: '#C9F3D8',        // what the filament actually looks like with the lights on
  emissive: '#5BFF9E',             // --color-glow
  emissiveLightsOn: 0.06,
  emissiveLightsOff: 1.90,
  overshoot: 2.30,                 // charges past target, then settles
};
```

**The "lights off" switch.** This is a delight moment, so it is specified as one.

`LightsOffSwitch.tsx` renders a chunky toy light switch, not a checkbox: a 64×96px turquoise
`--color-turquoise` plate with a 4px `--color-ink` outline, `border-radius: 14px`, an inset cream
`--color-cream` rocker that travels 28px. Pressing it moves the rocker in 140ms with
`cubic-bezier(.34,1.56,.64,1)` so it snaps and slightly overshoots, like a real switch. The plate gets
a 2px downward `translate` on `:active`. Label above it: `כבו את האור`.

On flip to off, over 520ms, all with `cubic-bezier(.2,.8,.2,1)`:

| t | what happens |
|---|---|
| 0 ms | the card background begins `--color-cream` → `--color-night` (`#0B0A10`) |
| 0 ms | every scene light's `intensity` begins ramping to `× 0.05` |
| 0 ms | the CSS ground halo fades to `radial-gradient(..., #16131C, #0B0A10)` |
| 180 ms | `emissiveIntensity` starts ramping `0.06 → 2.30` |
| 180 ms | the additive halo sprite (below) starts fading in |
| 420 ms | `emissiveIntensity` eases back `2.30 → 1.90`, so it flares and settles like a real charge |
| 520 ms | done. `autoRotate` restarts at 0.5 speed for exactly one 8-second pass, then stops |

The final autorotate pass is the payoff: a glowing object turning slowly in the dark, for eight
seconds, then it stops and waits. That is the shot a 13-year-old shows his friends.

**The halo without a post-processing pass.** No `postprocessing` package (adds ~48 KB and a second
render target). Instead, a single billboarded `<sprite>` behind the mesh:

- Texture: a 128×128 `DataTexture` generated once at runtime, a radial gradient
  `alpha = pow(1 - r, 2.4)`, tinted `--color-glow`.
- `SpriteMaterial` with `blending: THREE.AdditiveBlending`, `depthWrite: false`, `depthTest: true`.
- `scale = boundingRadius * 1.75`, opacity ramps `0 → 0.62` alongside the emissive.

One quad, additive, zero extra passes, and it reads as bloom because bloom around a glowing object is
mostly a soft radial falloff anyway.

`prefers-reduced-motion: reduce`: no ramps. The state swaps in a single 120ms crossfade and the final
autorotate pass is skipped.

The switch state is **not** part of the order spec and is not sent to WhatsApp. It is a way to look at
the object.

### 4 · קישוט מדף · `shelf` · kernel `panelStand`

Seed row: `gridLong 256`, relief as type 2, `standAngleDeg 12`, `standThicknessMm 8`,
`maxFilamentColors 4`, sizes 90 / 130mm.

Panel plus a separate stand mesh, and the stand is where the second filament colour becomes obvious.

**Stand geometry** (`buildStand.ts`): a `THREE.Shape` wedge with a rounded front lip, extruded to
`standThicknessMm`, with `bevelEnabled: true, bevelSize: 0.08cm, bevelSegments: 2`. Foot depth =
`0.38 × panelHeight`, foot width = `0.72 × panelWidth`. A slot is cut through it at `standAngleDeg`
from vertical, `panelThicknessMax + 0.4mm` wide (a real print clearance, and it looks right because
the panel sits *in* the slot rather than balancing on it). The panel group is rotated by
`standAngleDeg` and translated so its bottom edge is `4mm` into the slot.

The stand is its own `<mesh>` with its own `MeshStandardMaterial` and its own filament colour slot in
the picker, labelled `צבע המעמד`. It does not consume one of the four image colours; it is a fifth
slot that does not trigger the surcharge, because it is a separate part and Shai prints it separately.
`printTypes.standIsSeparateColor: true` governs this.

### 5 · מחזיק מפתחות · `keychain` · kernel `panelHole`

Seed row: `gridLong 200` (the piece is small; more samples are invisible and cost time),
`thicknessMinMm 2.4`, `thicknessMaxMm 4.0` (relief clamped to 1.6mm so it survives a pocket),
`maxLongEdgeMm 60`, sizes 40 / 50 / 60mm, `ringHoleMm 5.0`, `ringBossMm 2.0`, `maxFilamentColors 3`.

**The ring hole is real geometry, punched in the worker**, not a texture or a decal.

```ts
// buildRingHole.ts
// centre: 6mm from the top edge on the panel's centre line
// 1. mark grid vertices whose distance to centre < r + boss
// 2. raise those in the annulus [r, r+boss] by ringBossMm  (a printed eyelet needs meat around it)
// 3. drop every triangle with any vertex inside r
// 4. stitch an inner wall: 24 segments, front rim -> back rim, welded to the surviving rim vertices
```

The raised boss is the detail that makes a maker nod: a flat 2mm keychain tears at the ring, so you
add a doughnut of material around the hole. It also catches the rim light and reads instantly as
"keychain" from across the page.

A **split ring** is added as a separate decorative mesh: `TorusGeometry(0.6cm, 0.09cm, 8, 40)`, opened
by a 14° gap, `MeshStandardMaterial { color: '#C9CDD4', metalness: 0.92, roughness: 0.24 }`. It is
excluded from the volume and price calculation and flagged `isDecor: true` so it never appears in the
WhatsApp spec. It exists purely so the object is legible at a glance.

### 6 · מגנט · `magnet` · kernel `panelPocket`

Seed row: `gridLong 200`, `thicknessMinMm 3.0`, `thicknessMaxMm 4.6`, `maxLongEdgeMm 70`,
sizes 45 / 55 / 70mm, `magnetPocketMm { dia: 10, depth: 2.2 }`, `maxFilamentColors 3`.

Flat back plate with a **recessed circular pocket** for a 10×2mm neodymium disc, centred. Built by
`buildMagnetPocket.ts` the same way as the ring hole but as a blind cavity: the back-face grid is
pushed forward by `depth` inside the circle, and a 24-segment cylindrical wall joins the pocket floor
to the back surface.

Inside the pocket sits a non-priced decorative disc,
`CylinderGeometry(0.5cm, 0.5cm, 0.2cm, 32)`, `metalness 0.85`, `roughness 0.32`, `color '#8F949C'`.

Orbiting to the back is the payoff here, so the viewer's `maxPolarAngle` is unchanged (you can get all
the way round the equator) and the affordance chip for this type reads `סובבו לראות את הגב`.

### 7 · תמונת קיר במסגרת · `framed` · kernel `panelFrame`

Seed row: `gridLong 288`, `frameWidthMm 14`, `frameDepthMm 8`, `maxLongEdgeMm 240`,
sizes 140 / 190 / 240mm, `maxFilamentColors 4`, and `backlit` is a **per-order option**: choosing it
switches the body to the lithophane thickness mapping and collapses the image to one colour, while the
frame keeps its own colour.

**Frame geometry** (`buildFrame.ts`): an outer rounded rect `THREE.Shape` with the panel opening as a
`THREE.Path` hole, extruded `frameDepthMm` with `bevelEnabled: true, bevelSize: 0.1cm,
bevelThickness: 0.08cm, bevelSegments: 3`. The bevel is not decoration; an unbevel extrusion has a
razor silhouette that reads as CAD, and 1mm of bevel is what makes it read as an object. A rebate
2mm deep on the back holds the panel, and the panel is inset so a shadow line appears between the two
parts. The frame is a separate mesh with its own colour slot, `צבע המסגרת`, again outside the four.

Two keyhole slots are cut in the back rail (`4mm × 9mm`, 30% in from each end). Nobody will notice
them consciously. Everyone will believe the object more.

## B.4 Metrics out of the engine

The generator does not own pricing. It owns the physical facts, and hands them to the pricing module
(spec 04) as a typed object.

```ts
// src/components/generator/previewTypes.ts
export interface PreviewMetrics {
  volumeMm3: number;              // closed-mesh volume, divergence theorem over the index buffer
  shellVolumeMm3: number;         // walls + top/bottom skins at settings.perimeterMm
  estimatedGrams: number;         // (shell + infillFactor * (volume - shell)) / 1000 * densityGCm3
  estimatedPrintMinutes: number;  // grams * settings.minutesPerGram + settings.setupMinutes
  boundingMm: { x: number; y: number; z: number };
  triangles: number;
  bandCount: number;              // = chosen filament count actually used on the image
  colorChangeCount: number;       // bandCount - 1, each one is a manual swap for Shai
  layerCount: number;             // ceil(boundingMm.z / layerHeightMm)
  lowContrast: boolean;
  bandContrastWarning: { a: string; b: string } | null;
  buildMs: number;                // real elapsed worker time, logged for tuning
}
```

Volume is the exact signed-volume sum over the closed mesh:

```ts
// metrics.ts
let v6 = 0;
for (let t = 0; t < index.length; t += 3) {
  const a = tri(0), b = tri(1), c = tri(2);
  v6 += a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x);
}
const volumeMm3 = Math.abs(v6) / 6 * 1000;   // cm^3 -> mm^3
```

Because the mesh is watertight this is exact, not an estimate, and it runs in the same pass that
already walks the index buffer for the bounding box. Roughly 8ms at 130k triangles.

`colorChangeCount` matters commercially: every band boundary is Shai standing at the printer swapping
filament. The pricing spec can charge for it, and the WhatsApp message tells him how many to expect.

Admin settings backing all of this, one document:

```ts
generatorSettings: defineTable({
  layerHeightMm: v.number(),        // 0.2
  nozzleMm: v.number(),             // 0.4
  perimeterMm: v.number(),          // 1.2  (3 walls)
  densityGCm3: v.number(),          // 1.24 PLA
  infillFactor: v.number(),         // 0.22
  minutesPerGram: v.number(),       // 2.4
  setupMinutes: v.number(),         // 12
  lithoAbsorptionPerCm: v.number(), // 11.0
  aoStrength: v.number(),           // 2.2
  maxFreeColors: v.number(),        // 4
  extraColorSurcharge: v.number(),  // per additional colour, ILS
  updatedAt: v.number(), updatedBy: v.id('users'),
}),
```

## B.5 The generator canvas

Same renderer config, same tone mapping, same `StudioRig` as PART A, with three differences:

1. **The camera starts closer and swings.** On first reveal, the camera animates from `azimuth -34°`
   to `+8°` over 900ms with `easeOutCubic` while the model does the 380ms arrival bounce. The visitor
   sees the object move without touching it, which is the fastest way to teach them it is 3D.
2. **`autoRotate` is off from the start** here (unlike the catalog). The visitor just made this thing;
   they will reach for it. A turntable competing with their finger is friction.
3. **The rig dims for `backlit` types**: key drops to 0.9, fill to 0.35, and the emissive backlight
   plane carries the image. Otherwise a lithophane preview is washed out by the studio key and looks
   like a flat grey slab, which is exactly what it looks like in real daylight and exactly not what
   sells it.

Rebuilds triggered by a parameter change are scoped:

| change | what re-runs | cost |
|---|---|---|
| filament colour or order | vertex colour attribute only | < 20 ms, no wait state |
| finish (matte/silk/glow) | `aFinish` attribute + uniforms | < 10 ms |
| size preset | root `scale` + metrics recompute | < 15 ms |
| quantity | metrics only | < 1 ms |
| backlight on/off | uniform | 0 |
| print type | full rebuild | wait state |
| new photo or new crop | full rebuild | wait state |

Only the last two show `PrintBuildAnimation`. Everything else updates live under the visitor's finger,
because a wait state for a colour swatch would kill the whole feature.

---

# PART C · Honesty microcopy around the preview

Rules this copy obeys: no negative parallelism, no spaced em dash, no closing summary, no emoji,
short lines, concrete nouns, first person, Shai's own voice. He is thirteen and he says so, because a
thirteen-year-old who measures, prints, checks and reprints is more impressive than a studio, not less.

The copy's job is confidence. It never apologises for the preview and never hedges with "כמובן ש",
"ייתכן", or "לא מדויק לחלוטין". It states what the preview is, states what the print adds, and moves
on. A visitor who reads it should trust the number under it more, not less.

All strings live in `src/content/generator.he.ts` as a typed record so the admin can edit them later
without touching components.

## C.1 The main block, directly under the canvas

Heading, 1.125rem, `font-weight: 800`, `--color-ink`:

> **מה רואים כאן**

Body, 1rem, `line-height: 1.7`, `--color-ink` at 78%:

> התצוגה הזאת נבנית מהתמונה שלכם ישר בדפדפן. התמונה נשארת אצלכם במכשיר עד הרגע שאתם שולחים לי אותה בוואטסאפ.
>
> היא מראה את הגובה, את הצבעים ואת הגודל האמיתי של החתיכה.
>
> את קובץ ההדפסה אני בונה אחר כך בעצמי, ואז אני מתקן ידנית כל מקום שיצא עקום.

Third paragraph is the load-bearing one. It says a human does the last step, which is exactly the
thing that makes a hand-made order feel safe.

## C.2 The texture line, in a turquoise-bordered strip

`border-inline-start: 4px solid var(--color-turquoise)`, `padding-inline-start: 14px`:

> בהדפסה אמיתית מרגישים באצבע את קווי השכבות.
> זה החלק שהכי אוהבים כשמקבלים את זה ליד.

## C.3 The maker line, with his photo at 44px, circular

> אני שי, בן 13, ואני מדפיס בתלת מימד.
> אני מודד, מדפיס, בודק, ואם יצא עקום אני מדפיס שוב.
> כל הזמנה עוברת דרך הידיים שלי לפני שהיא יוצאת.

## C.4 Contextual lines, shown only when their condition is true

**Colour count**, under the palette, updates live:

- 1 colour: `בחרתם צבע אחד, אז התמונה יוצאת מהגובה ומהצללים.`
- 2 or more: `בחרתם ${n} צבעים, אז התמונה מתחלקת ל-${n} שכבות צבע. ככה זה יוצא גם בהדפסה.`
- 5 or more: `מ-5 צבעים אני מחליף גליל באמצע ההדפסה, ולכן יש תוספת של ${surcharge} שקלים.`

**Lithophane collapses the palette** (`printType.backlit`):

> ליטופן עובד מהאור שעובר דרך החומר, לכן הוא מודפס בצבע אחד. לבן נותן את התוצאה הכי חדה.

**Two chosen filaments too close** (`bandContrastWarning`), amber strip, never red:

> ${a} ו${b} קרובים מאוד אחד לשני, ובהדפסה קשה להבחין ביניהם. אפשר להחליף אחד מהם לצבע כהה יותר.

**Flat photo** (`lowContrast`):

> התמונה הזאת בהירה מאוד, והתבליט יוצא ממנה שטוח. תמונה עם צללים ברורים עובדת הכי טוב.

**Glow type**, next to the switch:

> החומר סופג אור ביום ומחזיר אותו בחושך. אחרי כמה שעות ליד חלון הזוהר חזק.

**Size**, next to the millimetres, chosen by `maxLongEdgeMm`:

| long edge | line |
|---|---|
| ≤ 50mm | `בערך בגודל של קופסת גפרורים.` |
| 51-90mm | `בערך בגודל של כרטיס אשראי.` |
| 91-150mm | `בערך בגודל של כף יד.` |
| 151-250mm | `בערך בגודל של דף A5.` |

## C.5 Failure and fallback lines

**No WebGL / weak device**, over the turntable:

> הדפדפן הזה לא מציג תלת מימד. יש כאן תמונה שמסתובבת, והמידות והמחיר נשארים מדויקים.

**Catalog model failed to load**, over the poster:

> התצוגה התלת ממדית לא נטענה. אפשר להזמין גם ככה, ואני שולח צילום של ההדפסה לפני שהיא יוצאת אליכם.

**Photo the browser cannot read** (HEIC on a desktop browser, a corrupt file):

> לא הצלחתי לפתוח את הקובץ הזה. צילום רגיל מהגלריה כמעט תמיד עובד.

**Photo too small** (< 400px on the long edge after crop):

> התמונה קטנה מדי בשביל תבליט. מ-800 פיקסלים ומעלה יוצא חד.

## C.6 Interface labels

| element | label |
|---|---|
| build button | `לבנות את הדגם` |
| rebuild after a change | `לבנות מחדש` |
| drag affordance chip | `גררו לסובב` |
| magnet type chip | `סובבו לראות את הגב` |
| reset camera | `לחזור להתחלה` |
| glow switch, lights on | `כבו את האור` |
| glow switch, lights off | `הדליקו את האור` |
| lithophane backlight | `אור מאחור` |
| turntable fallback button | `לראות מכל הכיוונים` |
| reorder filaments | `להחליף סדר` |
| stand colour slot | `צבע המעמד` |
| frame colour slot | `צבע המסגרת` |
| lower resolution retry | `לנסות ברזולוציה נמוכה יותר` |

---

# PART D · The wait state · "בונה את הדגם"

A spinner says "the computer is busy". This has to say "a machine is building your thing", and it has
to be worth watching for two and a half seconds on a phone. It is also the moment the visitor first
sees their own photo become an object, which makes it the second most emotional beat on the site
after the price.

`src/components/generator/PrintBuildAnimation.tsx`. Pure SVG plus the Web Animations API. No
animation library, no WebGL, under 6 KB. It must be WebGL-free because it runs *while* the worker is
busy and *before* the canvas has a context, and it must keep running if the GPU path fails entirely.

## D.1 What is on screen

A 320×260 SVG (240×200 under 480px viewport), sitting on `--color-cream`.

**The bed.** A `--color-bed` (`#F0E6D6`) rounded rect, 280×14, at the bottom, with a turquoise grid of
1px lines every 8px at 8% opacity drawn above it and masked to the bed. Under it, a 2px `--color-ink`
line at 12% opacity for the machine frame.

**The gantry.** A 1px horizontal `--color-ink` rail at 22% opacity, at the current print height,
spanning the full width. It steps upward with the stack.

**The print head.** A chunky rounded trapezoid, 34×26, fill `--color-red`, `rx: 7`, with a 2px
`--color-ink` outline at 18%. A turquoise nozzle triangle, 8×7, hangs off its bottom centre. It is
deliberately toy-shaped: no fan ducts, no belts, no realism. This is the print head a kid draws.

**The stack.** Rows of 3px-tall rounded rects that accumulate from the bed upward.

**The stack is the visitor's own photo.** By the time the animation starts, the worker has already
posted `stage: 'height'` with a 24×18 thumbnail of the height map and the posterised band colours.
Each row `i` is drawn with:

- width = the silhouette width of the photo at that height, from the thumbnail
- x offset = the silhouette's left edge at that height, so an off-centre subject builds off-centre
- fill = the posterised band colour at that row, which is one of the visitor's chosen filaments

So they watch **their picture rise out of a print bed, in the colours they picked.** Before the fallback
data arrives (the first ~400ms) the rows use a generic rounded silhouette in `--color-red`, and they
swap to the real shape on the first `height` message with a 200ms crossfade.

**Sparks.** At each direction change, a 4px `--color-yellow` circle appears at the nozzle and animates
`scale 1 → 0`, `opacity 1 → 0` over 200ms with a 6px upward drift. Three per second at the animation's
pace. This is the only place yellow appears in the generator, which is what makes it register.

## D.2 Timing

| | |
|---|---|
| rows total | 20 |
| one traverse (left↔right) | 400 ms, `cubic-bezier(.42,0,.58,1)` |
| dwell at each end | 60 ms |
| row appears | at the midpoint of its traverse, `scaleX 0 → 1` from the head's current side, 260 ms `easeOutCubic` |
| gantry step up | 3px, 120 ms, `easeOutCubic`, on the dwell |
| total build | 20 × 460 ms = **9.2 s at full pace**, so the pace is compressed to fit |

The pace compresses to the real work: rows are emitted on a schedule of
`min(460, remainingBudget / remainingRows)` ms, recomputed each row, where the budget targets 2,600ms
minimum and the actual worker completion. In practice each traverse lands at 110-130ms, which is a
fast, purposeful, slightly comic sweep. That speed is correct for a toy store; a realistic 400ms
traverse is boring.

**Ending.** When the last row lands:

1. the head lifts 22px over 220 ms, `easeOutCubic`
2. the whole stack does a squash and stretch, `scaleY 1 → 0.92 → 1.06 → 1` over 300 ms,
   `transform-origin: bottom center`
3. a single `--color-turquoise` ring expands from the stack's centre, `r 0 → 90`, `opacity 0.5 → 0`,
   over 340 ms
4. 260 ms crossfade to the live canvas, which arrives mid-bounce with its own 380 ms arrival scale, so
   the two bounces read as one continuous motion

The handoff must overlap. A gap between "the animation finished" and "the model appeared" is where the
illusion dies.

## D.3 The stage list, and why there is no percentage

Under the SVG, three lines. Each starts at `--color-ink` 42% with an empty 14px circle, and on
completion the circle fills `--color-turquoise` with a cream checkmark and the text goes to
`--color-ink` 100%, over 180 ms.

1. `קורא את התמונה`
2. `מחשב גבהים`
3. `בונה שכבות`

These are the worker's real messages:

```ts
type WorkerProgress =
  | { stage: 'read';   thumb?: ImageData }
  | { stage: 'height'; thumb: Uint8ClampedArray; bandColors: string[]; silhouette: Uint8Array }
  | { stage: 'mesh';   done: number; total: number }
  | { stage: 'done';   result: PanelResult; metrics: PreviewMetrics };
```

**No percentage bar.** A percentage on a job with three unequal stages and an unknown decode time is a
number you invent, and the visitor watches it stall at 80%. Three honest ticks that actually
correspond to work are better information and better theatre.

## D.4 Slow and stuck

- **> 9,000 ms**: a fourth line fades in under the stages,
  `זה לוקח קצת יותר זמן. התמונה גדולה.` The animation keeps its pace and does not restart.
- **> 15,000 ms**: a `--color-turquoise` outlined pill appears, `לנסות ברזולוציה נמוכה יותר`, which
  aborts the worker and reruns at `gridLong = 160`. That path completes on essentially any device.
- **worker error**: the animation stops on its current row, the stack tips 6° with a 400ms
  `easeOutBack`, and the copy from §C.5 appears with a `לנסות שוב` button. The tipped stack is a small
  joke a kid will get, and it is far better than an error icon.

## D.5 Reduced motion

`prefers-reduced-motion: reduce`:

- no traverse, no head, no sparks
- the 20 rows appear in 3 groups of 6/7/7, each group fading in over 240 ms with a 120 ms gap
- the stage list behaves identically
- no squash, no ring; a straight 200 ms crossfade to the canvas

The visitor still sees their photo build in their colours. The motion is what is removed, not the
information.

## D.6 The small variant

The same component at `size="sm"` (90×70, no bed grid, no stage list, head only, 3px rows) is the
catalog viewer's loading state from §A.6. One loading language across the whole site: whenever
something is being made or fetched, a little red print head sweeps and rows stack up.

---

# Build order

1. `loaders.ts`, `StudioRig.tsx`, `CameraFit.ts`, `ViewerCanvas.tsx` with a hardcoded test `.glb`.
   Ship nothing else until a matte white print looks right under this rig on a real phone.
2. `PrintedMaterial.ts` including the layer-line patch. Verify the `fwidth` fade by zooming out; if
   you see moiré at any distance the `smoothstep` bounds are wrong.
3. `GestureGuard.ts` and the perf governor. Test in the WhatsApp in-app webview on Android, not in
   Chrome's device emulator. They behave differently and only one of them is the customer.
4. `PrintBuildAnimation.tsx` standalone with faked worker messages. It has to be enjoyable before
   anything is wired to it.
5. `heightmap.worker.ts` + `buildPanel.ts` + `posterize.ts` + `metrics.ts`, type `relief` only.
6. The remaining six print types, each as a `printTypes` row plus its kernel extra.
7. `litho.ts` and the Beer-Lambert patch.
8. `LightsOffSwitch.tsx`.
9. `convex/modelPipeline.ts` and the admin poster studio.
10. Fallbacks last, tested by forcing each branch of `canRender3d()` with a query param
    (`?render=turntable`, `?render=poster`) that ships to production and stays.

# Acceptance checklist

- [ ] Product page holds 60fps on an iPhone 12 and above 30fps on a 2021 mid Android.
- [ ] Scrolling the page with the pointer over the canvas scrolls the page. Always.
- [ ] The first vertical swipe on mobile scrolls the page. The second, after an orbit, orbits.
- [ ] No request leaves the origin except to the Convex file URLs. Verified in the network panel with
      a cleared cache.
- [ ] Killing WebGL (`about://gpu` disable, or the `?render=` param) leaves a fully orderable page
      with a live price on every route.
- [ ] The generator's photo appears in no network request until the WhatsApp button is pressed.
- [ ] Changing a filament colour updates the preview in under 50ms with no wait state.
- [ ] `PrintBuildAnimation` never displays for less than 2,600ms and never for more than 15,000ms
      without offering the lower-resolution path.
- [ ] Every Hebrew string in this document passes the copy law: no negative parallelism, no spaced em
      dash, no closing summary, no emoji.
- [ ] The lights-off toggle works on a phone, in a bright room, and still reads as a glowing object.
- [ ] An admin model that fails validation shows the real measured number next to the real limit.
