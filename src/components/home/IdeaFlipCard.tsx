"use client";

import * as React from "react";
import Image from "next/image";

import { ChipBadge } from "@/components/ui/ChipBadge";
import { EASE_POINTS, SPRING, type Spring, prefersReducedMotion } from "@/lib/design/motion";

/**
 * היפוך הקלף · the hero moment. Doc 07 §7, in full.
 *
 * The front is the printed object. The back is the picture the customer sent, the
 * thing that existed before Shai made it real. You tap it, or you grab it and drag,
 * and it turns over in your hand with weight.
 *
 * The site has one sentence and this gesture is that sentence.
 * `הופך רעיונות לדברים אמיתיים` is literally turning something over and finding the
 * idea that became the thing. The card is a card because a card is the thing you turn
 * over; the second sentence this block used to lean on was the film quote, and
 * RESOLUTIONS.md ruling 20 deletes it, so nothing here reads back to it.
 *
 * It also does the commercial job in one move: a visitor who has never seen a
 * lithophane does not know what "send me a photo" produces, and one flip shows them
 * the input and the output of the whole business before they read a word of copy.
 *
 * ── the four channels, §7.4 ────────────────────────────────────────────────────
 *  rotation   spring.flip {260, 22, 1.1}. ζ 0.650, first peak 269ms at 192.2deg,
 *             settled within 1deg at 488ms, visually at rest by 560ms.
 *  heft       an independent 560ms keyframe track, times [0,.26,.40,.62,1], ease-toy,
 *             carrying y, scale and rotateZ. A card that only rotates reads as a CSS
 *             trick; a card that also lifts and wobbles reads as an object in a hand.
 *  shadow     a separate absolutely positioned element animating scale and opacity
 *             only. `box-shadow` is never animated: interpolating a blur radius on a
 *             420px card is the single most expensive thing this page could do.
 *  peek       the one idle invitation, §7.6, fired once per load and never repeated.
 *
 * There is no animation library in this project, so the spring is integrated here in
 * one rAF loop that writes CSS custom properties on the element. React state changes
 * only at the ends of a gesture, so a flip costs zero re-renders.
 *
 * RTL, §14.1: `rotateY` runs to `180deg * var(--flow)`, +180 in RTL so the leading
 * edge coming toward the viewer is the left one, the way a page turns in a Hebrew
 * book. The sign lives in CSS and is never read from `dir` in JavaScript (§14.3).
 */

type CssVars = React.CSSProperties & Record<string, string | number | undefined>;

/* ---------------------------------------------------------------- easing */

/** `--ease-toy` as a sampler, for the heft track. Newton solve, three iterations. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 4; i += 1) {
      const slope = slopeX(t);
      if (slope === 0) break;
      t -= (sampleX(t) - x) / slope;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

const easeToy = cubicBezier(...EASE_POINTS.toy);
const easeInOutFlow = cubicBezier(...EASE_POINTS.inoutFlow);

/** Piecewise keyframe sampler: `times` and `values` share a length. */
function keyframe(times: readonly number[], values: readonly number[], progress: number): number {
  if (progress <= 0) return values[0];
  if (progress >= 1) return values[values.length - 1];
  let index = 0;
  while (index < times.length - 2 && progress > times[index + 1]) index += 1;
  const span = times[index + 1] - times[index];
  const local = span === 0 ? 0 : (progress - times[index]) / span;
  const eased = easeToy(local);
  return values[index] + (values[index + 1] - values[index]) * eased;
}

/* ------------------------------------------------------------- the heft */

const HEFT_MS = 560;
const HEFT_TIMES = [0, 0.26, 0.4, 0.62, 1] as const;
const HEFT_Y = [0, -12, -9, 3, 0] as const;
const HEFT_SCALE = [1, 1.055, 1.04, 0.995, 1] as const;
const HEFT_RZ = [-4, -1, 2.5, -5, -4] as const;
const SHADOW_TIMES = [0, 0.5, 1] as const;
const SHADOW_SCALE = [1, 1.18, 1] as const;
const SHADOW_OPACITY = [1, 0.55, 1] as const;

/** §7.5. 140px of drag is a 90 degree quarter turn, so 0.643 degrees per pixel. */
const DEG_PER_PX = 90 / 140;
const RELEASE_DISTANCE = 52;
const RELEASE_VELOCITY = 420;
const BASE_TILT = -4;

export type IdeaFlipCardProps = {
  frontSrc: string;
  frontAlt: string;
  backSrc: string;
  backAlt: string;
  /** §7.3, in Shai's voice, one line under the picture on the back. */
  backCaption: string;
  label: string;
  chipLabel: string;
  priority?: boolean;
  className?: string;
};

export function IdeaFlipCard({
  frontSrc,
  frontAlt,
  backSrc,
  backAlt,
  backCaption,
  label,
  chipLabel,
  priority = true,
  className,
}: IdeaFlipCardProps) {
  const cardRef = React.useRef<HTMLButtonElement | null>(null);
  const shadowRef = React.useRef<HTMLSpanElement | null>(null);
  const [flipped, setFlipped] = React.useState(false);
  /** Swapped on flip completion, §7.3, so the face turned away leaves the a11y tree. */
  const [backVisible, setBackVisible] = React.useState(false);
  const [flat, setFlat] = React.useState(false);
  const [backFailed, setBackFailed] = React.useState(false);

  /* the animation state lives in refs: a flip must not cost a single re-render */
  const angle = React.useRef(0);
  const velocity = React.useRef(0);
  const target = React.useRef(0);
  const spring = React.useRef<Spring>(SPRING.flip);
  const raf = React.useRef(0);
  const heftStart = React.useRef(0);
  const peek = React.useRef(0);
  const dragging = React.useRef(false);
  const touched = React.useRef(false);

  /* §7.8 and §7.9: reduced motion, or no `preserve-3d`, both take the cross-fade */
  React.useEffect(() => {
    const noPreserve3d =
      typeof CSS === "undefined" ||
      typeof CSS.supports !== "function" ||
      !CSS.supports("transform-style", "preserve-3d");
    setFlat(prefersReducedMotion() || noPreserve3d);
  }, []);

  const write = React.useCallback((now: number) => {
    const card = cardRef.current;
    if (!card) return;
    const elapsed = heftStart.current === 0 ? HEFT_MS : now - heftStart.current;
    const progress = Math.min(1, Math.max(0, elapsed / HEFT_MS));

    const y = keyframe(HEFT_TIMES, HEFT_Y, progress);
    const scale = keyframe(HEFT_TIMES, HEFT_SCALE, progress);
    const rz = keyframe(HEFT_TIMES, HEFT_RZ, progress);

    const vars = card.style;
    vars.setProperty("--ry", String(angle.current + peek.current));
    vars.setProperty("--heft-y", `${y}px`);
    vars.setProperty("--heft-scale", String(scale));
    vars.setProperty("--heft-rz", `${rz}deg`);

    const shadow = shadowRef.current;
    if (shadow) {
      shadow.style.setProperty(
        "--shadow-scale",
        String(keyframe(SHADOW_TIMES, SHADOW_SCALE, progress)),
      );
      shadow.style.setProperty(
        "--shadow-opacity",
        String(keyframe(SHADOW_TIMES, SHADOW_OPACITY, progress)),
      );
    }
  }, []);

  /** One integrator for the rotation channel. Semi-implicit Euler at a fixed 1000Hz. */
  const run = React.useCallback(() => {
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.064, (now - last) / 1000);
      last = now;

      if (!dragging.current) {
        const { stiffness, damping, mass } = spring.current;
        let remaining = dt;
        while (remaining > 0) {
          const slice = Math.min(remaining, 1 / 1000);
          const force = -stiffness * (angle.current - target.current) - damping * velocity.current;
          velocity.current += (force / mass) * slice;
          angle.current += velocity.current * slice;
          remaining -= slice;
        }
      }

      write(now);

      const settled =
        !dragging.current &&
        Math.abs(angle.current - target.current) < 0.1 &&
        Math.abs(velocity.current) < 0.5 &&
        (heftStart.current === 0 || now - heftStart.current > HEFT_MS);

      if (settled) {
        angle.current = target.current;
        velocity.current = 0;
        heftStart.current = 0;
        write(now);
        raf.current = 0;
        return;
      }
      raf.current = window.requestAnimationFrame(step);
    };

    if (raf.current === 0) raf.current = window.requestAnimationFrame(step);
  }, [write]);

  React.useEffect(() => () => window.cancelAnimationFrame(raf.current), []);

  const flipTo = React.useCallback(
    (next: boolean, releaseVelocity = 0) => {
      setFlipped(next);
      if (flat) {
        setBackVisible(next);
        return;
      }
      target.current = next ? 180 : 0;
      velocity.current = releaseVelocity;
      spring.current = SPRING.flip;
      heftStart.current = performance.now();
      run();
      // §7.3: the face that ends up turned away leaves the accessibility tree, on
      // completion rather than at the crossing, so it is never briefly hidden mid-turn
      window.setTimeout(() => setBackVisible(next), HEFT_MS);
    },
    [flat, run],
  );

  /* ---------------------------------------------------------- the drag */

  const pointer = React.useRef({ id: -1, startX: 0, lastX: 0, lastT: 0, base: 0, moved: false });

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    touched.current = true;
    peek.current = 0;
    // §7.5: on desktop the card flips on click. A mouse drag on a hero image is far
    // more likely to be an attempted image-drag than an attempted flip.
    if (flat || event.pointerType === "mouse") return;
    dragging.current = true;
    pointer.current = {
      id: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastT: performance.now(),
      base: angle.current,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    heftStart.current = 0;
    run();
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current || event.pointerId !== pointer.current.id) return;
    const dx = event.clientX - pointer.current.startX;
    if (Math.abs(dx) > 4) pointer.current.moved = true;
    angle.current = pointer.current.base + dx * DEG_PER_PX;
    const now = performance.now();
    const dt = Math.max(1, now - pointer.current.lastT);
    velocity.current = ((event.clientX - pointer.current.lastX) / dt) * 1000 * DEG_PER_PX;
    pointer.current.lastX = event.clientX;
    pointer.current.lastT = now;
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current || event.pointerId !== pointer.current.id) return;
    dragging.current = false;
    const dx = event.clientX - pointer.current.startX;
    const speed = Math.abs(velocity.current / DEG_PER_PX);
    const past = Math.abs(dx) > RELEASE_DISTANCE || speed > RELEASE_VELOCITY;

    if (past) {
      flipTo(!flipped, velocity.current);
    } else {
      // a rejected flip snaps back decisively rather than drooping, so the stiffer
      // spring, and no heft: nothing happened
      target.current = flipped ? 180 : 0;
      spring.current = SPRING.nudge;
      heftStart.current = 0;
      run();
    }
  }

  function onClick() {
    if (pointer.current.moved) {
      pointer.current.moved = false;
      return;
    }
    flipTo(!flipped);
  }

  /* ------------------------------------------------- §7.6 idle invitation */

  React.useEffect(() => {
    if (flat) return;
    if (typeof window === "undefined") return;
    if (document.documentElement.dataset.motion === "lite") return;

    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation?.type === "back_forward") return;

    let scrolled = false;
    const onScroll = () => {
      scrolled = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true, once: true });

    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        if (scrolled || touched.current || !document.hasFocus()) return;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / 900);
          // 0 -> 12deg -> 0. Twelve degrees is enough to show a sliver of the back
          // face and the fact that the card has depth.
          const shape = progress < 0.5 ? easeInOutFlow(progress * 2) : easeInOutFlow((1 - progress) * 2);
          peek.current = shape * 12;
          write(now);
          if (progress < 1) window.requestAnimationFrame(tick);
          else {
            peek.current = 0;
            write(performance.now());
          }
        };
        window.requestAnimationFrame(tick);
      }, 1400);
    };

    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) => {
        if (list.getEntries().length > 0) {
          observer?.disconnect();
          arm();
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // no LCP entries in this browser, so the timer starts from mount instead
      arm();
    }

    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [flat, write]);

  /* --------------------------------------------------------------- view */

  const sceneVars: CssVars = {
    "--flow": 1,
    perspective: "1400px",
    perspectiveOrigin: "50% 45%",
  };

  const cardVars: CssVars = {
    "--ry": 0,
    "--heft-y": "0px",
    "--heft-scale": 1,
    "--heft-rz": `${BASE_TILT}deg`,
    transformStyle: flat ? undefined : "preserve-3d",
    transform: flat
      ? `rotate(${BASE_TILT}deg)`
      : "translateY(var(--heft-y)) scale(var(--heft-scale)) rotateZ(var(--heft-rz)) rotateY(calc(var(--ry) * 1deg * var(--flow)))",
    borderRadius: "var(--radius-lg)",
    backgroundColor: "#FFFFFF",
    padding: "14px",
    boxShadow: "var(--shadow-photo)",
    touchAction: "pan-y",
  };

  return (
    <div className={["relative [min-inline-size:0]", className].filter(Boolean).join(" ")} style={sceneVars}>
      <span
        ref={shadowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 bottom-1 -z-[1] block h-8"
        style={
          {
            "--shadow-scale": 1,
            "--shadow-opacity": 1,
            background: "radial-gradient(ellipse at 50% 50%, rgba(61,39,22,0.28), transparent 70%)",
            transform: "scale(var(--shadow-scale))",
            opacity: "var(--shadow-opacity)",
          } as CssVars
        }
      />

      <button
        ref={cardRef}
        type="button"
        aria-pressed={flipped}
        aria-label={label}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-motion="essential"
        className="relative block w-full cursor-pointer [min-inline-size:0]"
        style={cardVars}
      >
        {/* The faces live in the button's 3D context, so this wrapper has to carry
            `preserve-3d` as well: a single flattening ancestor between them and the
            rotated element kills `backface-visibility` and the flip shows the front
            face mirrored instead of the back. Doc 03 §3.1 crops the mobile hero to
            16:11 and keeps the square from 768 up. */}
        <span
          className="relative block aspect-[16/11] w-full md:aspect-square [min-inline-size:0]"
          style={{ transformStyle: flat ? undefined : "preserve-3d" }}
        >
          <span
            className="absolute inset-0 block overflow-hidden"
            style={{
              borderRadius: "var(--radius-md)",
              backfaceVisibility: flat ? undefined : "hidden",
              opacity: flat && backVisible ? 0 : 1,
              transition: flat ? "opacity 120ms linear" : undefined,
            }}
            aria-hidden={backVisible ? true : undefined}
          >
            <Image
              src={frontSrc}
              alt={frontAlt}
              fill
              priority={priority}
              sizes="(max-width: 1023px) 100vw, 46vw"
              style={{ objectFit: "cover" }}
            />
          </span>

          <span
            className="absolute inset-0 flex flex-col overflow-hidden"
            style={{
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-cream-100)",
              backfaceVisibility: flat ? undefined : "hidden",
              transform: flat ? undefined : "rotateY(180deg)",
              opacity: flat && !backVisible ? 0 : 1,
              transition: flat ? "opacity 120ms linear" : undefined,
            }}
            aria-hidden={backVisible ? undefined : true}
          >
            <span className="relative block flex-1 [min-inline-size:0]">
              <Image
                src={backFailed ? "/assets/home/transform-before.webp" : backSrc}
                alt={backAlt}
                fill
                fetchPriority="low"
                sizes="(max-width: 1023px) 100vw, 46vw"
                style={{ objectFit: "cover" }}
                onError={() => setBackFailed(true)}
              />
            </span>
            <span
              className="block px-3 py-2 text-center [min-inline-size:0]"
              style={{
                fontFamily: "var(--font-assistant), system-ui, sans-serif",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
              }}
            >
              {backCaption}
            </span>
          </span>
        </span>
      </button>

      {/* §7.3: motion is never the only affordance. */}
      <span className="pointer-events-none absolute bottom-3 start-3 z-[3]">
        <ChipBadge tone="ink" size="md">
          {chipLabel}
        </ChipBadge>
      </span>
    </div>
  );
}
