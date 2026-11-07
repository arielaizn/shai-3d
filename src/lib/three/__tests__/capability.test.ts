/**
 * The rung this session sits on.
 *
 * This logic is invisible when it works and catastrophic when it does not: a wrong
 * demotion replaces the live 3D model with a flat picture of the customer's photo, on
 * the one screen whose entire job is to show the model in three dimensions, and the
 * old rule made that state last for the rest of the visit. It reached Ariel as "the
 * generator looks like a mock". So the ladder gets held down here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A capable machine: WebGL2, a real GPU name, plenty of cores and memory, 4g. */
function installCapableBrowser(renderer = "ANGLE (Apple, Apple M1 Pro)") {
  const store = new Map<string, string>();
  const gl = {
    getExtension: (name: string) =>
      name === "WEBGL_debug_renderer_info"
        ? { UNMASKED_RENDERER_WEBGL: 37446 }
        : { loseContext: () => {} },
    getParameter: () => renderer,
  };
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    location: { search: "" },
  });
  vi.stubGlobal("document", {
    createElement: () => ({ getContext: (kind: string) => (kind === "webgl2" ? gl : null) }),
  });
  vi.stubGlobal("navigator", {
    hardwareConcurrency: 8,
    deviceMemory: 32,
    connection: { saveData: false, effectiveType: "4g" },
  });
  return store;
}

let store: Map<string, string>;

beforeEach(() => {
  vi.resetModules();
  store = installCapableBrowser();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function load() {
  return import("../capability");
}

describe("the fallback ladder", () => {
  it("puts a capable machine on 3d", async () => {
    const { detectRenderMode } = await load();
    expect(detectRenderMode()).toBe("3d");
  });

  it("demotes a software rasteriser, which renders this scene at a crawl", async () => {
    vi.unstubAllGlobals();
    installCapableBrowser("Google SwiftShader");
    const { detectRenderMode } = await load();
    expect(detectRenderMode()).toBe("turntable");
  });

  it("forgives the first lost canvas instead of condemning the session", async () => {
    const { detectRenderMode, demoteRenderMode } = await load();
    expect(detectRenderMode()).toBe("3d");

    // a canvas dies: a backgrounded tab, a driver reset, a hot reload
    demoteRenderMode("poster");
    expect(store.get("shai:render-mode")).toBe("poster");

    // the next mount probes again rather than serving a flat picture all visit
    expect(detectRenderMode()).toBe("3d");
  });

  it("stops arguing once the device has dropped a second canvas", async () => {
    const { detectRenderMode, demoteRenderMode } = await load();
    demoteRenderMode("poster");
    detectRenderMode();
    demoteRenderMode("poster");
    expect(detectRenderMode()).toBe("poster");
  });

  it("clears the count when a context comes back, so later trouble is judged fresh", async () => {
    const { detectRenderMode, demoteRenderMode } = await load();
    demoteRenderMode("poster");
    demoteRenderMode("3d");
    expect(store.get("shai:render-incidents")).toBe("0");
    demoteRenderMode("poster");
    expect(detectRenderMode()).toBe("3d");
  });

  it("keeps a probe verdict without treating it as an incident", async () => {
    vi.unstubAllGlobals();
    const soft = installCapableBrowser("llvmpipe");
    const { detectRenderMode } = await load();
    expect(detectRenderMode()).toBe("turntable");
    // no canvas ever died, so nothing was counted against the device
    expect(soft.get("shai:render-incidents")).toBeUndefined();
    expect(detectRenderMode()).toBe("turntable");
  });
});
