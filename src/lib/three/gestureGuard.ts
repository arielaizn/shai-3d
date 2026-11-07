/**
 * src/lib/three/gestureGuard.ts
 *
 * Doc 05 §A.7. Touch arbitration between orbiting the model and scrolling the page.
 *
 * The classic failure is a full-width canvas that swallows every vertical swipe, so
 * the visitor cannot scroll past the product. The classic overcorrection is
 * `touch-action: pan-y`, which kills vertical orbit and makes the model feel broken.
 *
 * Three mechanisms, together:
 *
 *   1. The canvas is never full bleed on mobile. It sits in a rounded card with cream
 *      margin on both sides, so there is always a strip of page to scroll from. That
 *      is a layout constraint, enforced in `CanvasFrame`.
 *   2. First-gesture axis arbitration, below. Until the visitor has orbited once in
 *      this session, the first 12px of any touch decide who owns the gesture. A
 *      clearly vertical drag belongs to the page. Anything else belongs to the model,
 *      and from then on the card owns the gesture outright, because the visitor has
 *      demonstrated they know what the card is.
 *   3. Zoom is gated to two pointers, which is what makes the mouse wheel never zoom.
 *      A desktop visitor scrolling the page rolls straight past the canvas, which is
 *      what everybody expects and almost no 3D viewer delivers.
 */

import { hasOrbitedThisSession, markOrbited } from "./capability";

/** The subset of `OrbitControls` this file drives, so it needs no three import. */
export type ControlsLike = {
  enabled: boolean;
  enableZoom: boolean;
  autoRotate: boolean;
};

export type GestureGuardOptions = {
  /** The element that carries `touch-action`, which is the canvas wrapper. */
  element: HTMLElement;
  controls: () => ControlsLike | null;
  /** Doc 05 §A.2: auto-rotate stops permanently on first input and never resumes. */
  onFirstInput?: () => void;
  /** Two taps inside `ORBIT.doubleTapMs` and `doubleTapPx`. */
  onDoubleTap?: () => void;
};

const DECIDE_PX = 12;
/** A drag this much taller than it is wide is a scroll, not an orbit. */
const VERTICAL_RATIO = 1.6;
const DOUBLE_TAP_MS = 280;
const DOUBLE_TAP_PX = 24;

export class GestureGuard {
  private readonly el: HTMLElement;
  private readonly getControls: () => ControlsLike | null;
  private readonly onFirstInput?: () => void;
  private readonly onDoubleTap?: () => void;

  private pointers = 0;
  private startX = 0;
  private startY = 0;
  private owner: "undecided" | "page" | "model" = "undecided";
  private trusted: boolean;
  private lastTapAt = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private firstInputSent = false;
  private disposed = false;

  constructor(options: GestureGuardOptions) {
    this.el = options.element;
    this.getControls = options.controls;
    this.onFirstInput = options.onFirstInput;
    this.onDoubleTap = options.onDoubleTap;
    this.trusted = hasOrbitedThisSession();
    this.applyTouchAction();

    this.el.addEventListener("pointerdown", this.handlePointerDown);
    this.el.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    this.el.addEventListener("pointerup", this.handlePointerUp);
    this.el.addEventListener("pointercancel", this.handlePointerUp);
    this.el.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.el.removeEventListener("pointerdown", this.handlePointerDown);
    this.el.removeEventListener("pointermove", this.handlePointerMove);
    this.el.removeEventListener("pointerup", this.handlePointerUp);
    this.el.removeEventListener("pointercancel", this.handlePointerUp);
    this.el.removeEventListener("wheel", this.handleWheel);
  }

  /**
   * A trusted card takes the gesture from `touchstart`. An untrusted one leaves
   * `pan-y` on, so the browser can start scrolling before we have decided.
   */
  private applyTouchAction(): void {
    this.el.style.touchAction = this.trusted ? "none" : "pan-y";
  }

  private notifyFirstInput(): void {
    if (this.firstInputSent) return;
    this.firstInputSent = true;
    const controls = this.getControls();
    if (controls) controls.autoRotate = false;
    this.onFirstInput?.();
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointers += 1;
    this.notifyFirstInput();
    const controls = this.getControls();
    if (!controls) return;

    // Two fingers down means a pinch, and a pinch is always ours.
    if (this.pointers >= 2) {
      controls.enableZoom = true;
      controls.enabled = true;
      this.owner = "model";
      this.el.style.touchAction = "none";
      return;
    }

    this.startX = event.clientX;
    this.startY = event.clientY;

    if (event.pointerType !== "touch" || this.trusted) {
      this.owner = "model";
      controls.enabled = true;
      return;
    }

    this.owner = "undecided";
    controls.enabled = false;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (this.owner !== "undecided" || this.pointers === 0) return;
    const dx = Math.abs(event.clientX - this.startX);
    const dy = Math.abs(event.clientY - this.startY);
    if (Math.hypot(dx, dy) < DECIDE_PX) return;

    if (dy > dx * VERTICAL_RATIO) {
      // Clearly a scroll. Stay out of the way for the rest of this gesture.
      this.owner = "page";
      return;
    }

    this.owner = "model";
    this.trusted = true;
    markOrbited();
    this.el.style.touchAction = "none";
    const controls = this.getControls();
    if (controls) controls.enabled = true;
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.pointers = Math.max(0, this.pointers - 1);
    const controls = this.getControls();
    if (controls && this.pointers < 2) controls.enableZoom = false;
    if (this.pointers === 0) {
      this.owner = "undecided";
      this.applyTouchAction();
      if (controls) controls.enabled = this.trusted || event.pointerType !== "touch";
      this.checkDoubleTap(event);
    }
  };

  private checkDoubleTap(event: PointerEvent): void {
    const now = performance.now();
    const near =
      Math.hypot(event.clientX - this.lastTapX, event.clientY - this.lastTapY) < DOUBLE_TAP_PX;
    if (now - this.lastTapAt < DOUBLE_TAP_MS && near) {
      this.lastTapAt = 0;
      this.onDoubleTap?.();
      return;
    }
    this.lastTapAt = now;
    this.lastTapX = event.clientX;
    this.lastTapY = event.clientY;
  }

  /**
   * A plain wheel is a page scroll and is left alone. A trackpad pinch on macOS
   * arrives as a wheel event with `ctrlKey`, which is a deliberate zoom, so that one
   * is mapped through.
   */
  private handleWheel = (event: WheelEvent): void => {
    const controls = this.getControls();
    if (!controls) return;
    if (event.ctrlKey) {
      event.preventDefault();
      controls.enableZoom = true;
      // OrbitControls reads the same event on the same element right after us.
      window.setTimeout(() => {
        const later = this.getControls();
        if (later && this.pointers < 2) later.enableZoom = false;
      }, 0);
      return;
    }
    controls.enableZoom = false;
  };
}
