/**
 * src/lib/three/capability.ts
 *
 * Doc 05 §A.6. The capability gate, and the whole reason no route on this site can be
 * taken offline by a GPU.
 *
 * ## The fallback ladder
 *
 *   `3d`         a live WebGL canvas
 *   `turntable`  a 24-frame sprite sheet dragged with a finger or the arrow keys
 *   `poster`     one still image, and a button that upgrades to the turntable
 *
 * Every rung keeps the page orderable with a live price. Nothing here ever produces
 * an error screen, because a viewer that shows a black box costs a lead.
 *
 * The decision is made once per session and memoised in `sessionStorage`, so a
 * visitor who lands on a weak device does not pay for the probe on every route.
 * `?render=turntable` and `?render=poster` force a rung; doc 05 §build order item 10
 * requires that they ship to production and stay, because they are the only way to
 * test the branches on a real phone.
 */

export type RenderMode = "3d" | "turntable" | "poster";

const STORAGE_KEY = "shai:render-mode";
const ORBITED_KEY = "shai:has-orbited";
/** How many times a live canvas has died this session. See `demoteRenderMode`. */
const INCIDENT_KEY = "shai:render-incidents";

/**
 * A second context loss is a pattern; the first one is an accident.
 *
 * A demotion used to be sticky for the session no matter what caused it, which
 * conflated two different findings. The probe deciding a device cannot run WebGL is a
 * verdict about hardware and should stand. One canvas dying is an incident, and canvases
 * die for reasons that have nothing to do with the device: a backgrounded tab on iOS,
 * a GPU driver reset, another tab taking the context, a hot reload in development.
 *
 * Treating the second as the first is what left a machine with a working GPU showing a
 * flat poster of the customer's photo for the rest of the visit, on a page whose whole
 * job is to show the model in three dimensions. So an incident is counted rather than
 * obeyed, and the device gets one more chance before the session gives up on it.
 */
const MAX_INCIDENTS = 1;

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    // Safari in private mode throws on any sessionStorage access. A capability probe
    // is not worth an exception, so a failed read is simply "nothing remembered".
    return null;
  }
}

function writeSession(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* see readSession */
  }
}

function isRenderMode(value: string | null): value is RenderMode {
  return value === "3d" || value === "turntable" || value === "poster";
}

/** The `?render=` override, read straight from the current URL. */
export function renderModeOverride(): RenderMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = new URLSearchParams(window.location.search).get("render");
    return isRenderMode(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * The probe. Runs once, costs one throwaway canvas, and never touches the network.
 *
 * Software rasterisers are demoted deliberately: SwiftShader will happily report a
 * working WebGL context and then render this scene at three frames per second, which
 * is worse than the sprite sheet in every way a visitor can perceive.
 */
export function probeRenderMode(): RenderMode {
  if (typeof window === "undefined" || typeof document === "undefined") return "poster";

  const canvas = document.createElement("canvas");
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
  } catch {
    gl = null;
  }
  if (!gl) return "turntable";

  let renderer = "";
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
  } catch {
    renderer = "";
  }
  // Release the probe context immediately. Mobile Safari drops the oldest context at
  // about four, and leaking one on every route is how the real canvas goes blank.
  try {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* nothing to do */
  }

  if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(renderer)) return "turntable";

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (cores <= 2 || memory <= 2) return "turntable";

  const saveData = nav.connection?.saveData === true;
  const slow = /^(slow-2g|2g)$/.test(nav.connection?.effectiveType ?? "");
  // Do not spend two megabytes of geometry on a 2G connection or a data-saver session.
  if (saveData || slow) return "poster";

  return "3d";
}

function incidentCount(): number {
  const raw = Number.parseInt(readSession(INCIDENT_KEY) ?? "0", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/** The probe, memoised for the session, with the query-parameter override on top. */
export function detectRenderMode(): RenderMode {
  if (typeof window === "undefined") return "poster";
  const forced = renderModeOverride();
  if (forced) return forced;

  const cached = readSession(STORAGE_KEY);
  if (isRenderMode(cached)) {
    // A rung this session fell to after a single canvas failure is not a verdict about
    // the hardware. Probe again, and let the demotion stand only once the device has
    // proved it twice.
    if (cached !== "3d" && incidentCount() <= MAX_INCIDENTS) {
      const reprobed = probeRenderMode();
      writeSession(STORAGE_KEY, reprobed);
      return reprobed;
    }
    return cached;
  }

  const mode = probeRenderMode();
  writeSession(STORAGE_KEY, mode);
  return mode;
}

/**
 * Called when a context is lost, when a model refuses to load, and by the poster's own
 * upgrade button on the way back up.
 *
 * A downward move is recorded as an incident. The first one is forgiven on the next
 * mount, because canvases die for reasons that are not the device's fault. The second
 * one sticks for the rest of the session, which is the original rule and the right one
 * for hardware that genuinely cannot hold a context.
 */
export function demoteRenderMode(to: RenderMode): void {
  if (typeof window === "undefined") return;
  if (to === "3d") {
    // Back on the top rung: the incident is over and it does not count against the
    // next one. A restored context is evidence about the device, same as the probe.
    writeSession(INCIDENT_KEY, "0");
  } else {
    writeSession(INCIDENT_KEY, String(incidentCount() + 1));
  }
  writeSession(STORAGE_KEY, to);
}

/**
 * Doc 05 §A.7. Once a visitor has orbited successfully, the card owns the gesture
 * outright. Strangers get their scroll, users get their orbit.
 */
export function hasOrbitedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return readSession(ORBITED_KEY) === "1";
}

export function markOrbited(): void {
  if (typeof window === "undefined") return;
  writeSession(ORBITED_KEY, "1");
}

/**
 * Doc 05 §A.6. Reduced motion does not downgrade to a poster. It keeps 3D and turns
 * off auto-rotate, the arrival bounce and the damping glide. Reduced motion means no
 * unrequested movement, and it does not mean no interactivity.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Module workers are blocked outright by a small number of in-app webviews. */
export function canUseModuleWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}
