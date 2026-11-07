import * as React from "react";

import { LOOP } from "@/lib/design/motion";

/**
 * The button, and with it the tactile signature of the whole site.
 *
 * Doc 01 §7.1: `--shadow-pop` is a zero-blur 4px ink shadow. Hover lifts the button
 * 2px and grows the shadow, press drops it exactly 4px onto its own shadow so it
 * ends the press sitting on the page. That single decision is what makes every
 * control read as a moulded plastic object instead of a rectangle.
 *
 * Doc 07 §5.4: 90ms down, 160ms up. The asymmetry is what makes it feel sprung.
 *
 * RESOLUTIONS §ג: the primary fill is red-600 `#DB1F2B` with a cream-50 label,
 * which measures **4.84:1**. The brand red `#F5333F` with a white label measures
 * 3.87:1 and fails AA, so it never fills a button. It stays the price tag.
 *
 * RESOLUTIONS §11: the focus ring is ink with a cream inner ring. The turquoise
 * halo is decorative and carries no compliance load.
 */

export type ButtonVariant = "accent" | "ink" | "play" | "ghost";
export type ButtonSize = "lg" | "md" | "sm";
export type ButtonState = "idle" | "loading" | "success";

type CssVars = React.CSSProperties & Record<string, string | number>;

/* ----------------------------------------------------------- the tokens */

const RING_GAP = "0 0 0 2px var(--color-focus-gap)";
const RING_HALO = "0 0 0 9px color-mix(in oklab, var(--color-focus-halo) 55%, transparent)";

type Fill = {
  bg: string;
  bgHover: string;
  bgActive: string;
  fg: string;
  pop: string;
  popLg: string;
  borderWidth: string;
  borderColor: string;
};

const FILLS: Record<ButtonVariant, Fill> = {
  /** The conversion button. cream-50 on red-600 = 4.84. */
  accent: {
    bg: "var(--color-accent)",
    bgHover: "var(--color-accent-hover)",
    bgActive: "var(--color-accent-pressed)",
    fg: "var(--color-text-on-accent)",
    // the pop under a red fill is the button's own darker underside, not a black bar
    pop: "var(--shadow-pop-red)",
    popLg: "0 6px 0 0 var(--color-red-800)",
    borderWidth: "0",
    borderColor: "transparent",
  },
  /**
   * The stepped-down primary, for any viewport where the red is already spent on a
   * price tag or a marked headline (doc 01 §5.3). cream-50 on ink-900 = 17.62.
   */
  ink: {
    bg: "var(--color-ink-900)",
    bgHover: "var(--color-ink-800)",
    bgActive: "var(--color-ink-900)",
    fg: "var(--color-cream-50)",
    pop: "0 4px 0 0 var(--color-turq-700)",
    popLg: "0 6px 0 0 var(--color-turq-700)",
    borderWidth: "0",
    borderColor: "transparent",
  },
  /** Secondary, exploratory, reversible (doc 01 §6). turq-800 on turq-50 = 7.53. */
  play: {
    bg: "var(--color-play-soft)",
    bgHover: "var(--color-turq-100)",
    bgActive: "var(--color-turq-200)",
    fg: "var(--color-turq-800)",
    pop: "0 4px 0 0 var(--color-turq-700)",
    popLg: "0 6px 0 0 var(--color-turq-700)",
    borderWidth: "3px",
    borderColor: "var(--color-play-border)",
  },
  /** Tertiary. No shadow, so it never competes with a real button beside it. */
  ghost: {
    bg: "transparent",
    bgHover: "var(--color-cream-200)",
    bgActive: "var(--color-cream-300)",
    fg: "var(--color-ink-900)",
    pop: "none",
    popLg: "none",
    borderWidth: "0",
    borderColor: "transparent",
  },
};

/** Doc 01 §10 and doc 02 §2: 56px primary, 48px standard, 44px floor. */
const SIZES: Record<ButtonSize, React.CSSProperties> = {
  lg: {
    minBlockSize: "var(--spacing-tap-lg)",
    paddingInline: "2rem",
    fontSize: "1.1875rem",
    fontWeight: 800,
  },
  md: {
    minBlockSize: "3rem",
    paddingInline: "1.5rem",
    fontSize: "1.1875rem",
    fontWeight: 800,
  },
  sm: {
    minBlockSize: "var(--spacing-tap)",
    paddingInline: "1.125rem",
    fontSize: "1rem",
    fontWeight: 700,
  },
};

/* ------------------------------------------------------ shared classes */

/**
 * Every state feedback lives here. The travel is dropped under reduced motion and
 * the colour and shadow change stays, because the state still has to be legible
 * (doc 07 §12.2, Tier B).
 *
 * `focus-visible:duration-0` is deliberate: doc 07 §12.3 says the ring never
 * animates in, because a ring that fades in over 140ms is a ring a fast tabbing
 * user cannot see. It still fades out at 140ms, which is harmless.
 */
const BUTTON_BASE = [
  "relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap",
  "rounded-full text-center align-middle no-underline select-none [min-inline-size:0]",
  "font-[family-name:var(--font-rubik)] tracking-[0.01em] leading-[1.15]",
  "transition duration-140 ease-toy translate-y-0",
  "bg-[var(--btn-bg)] text-[var(--btn-fg)] shadow-[var(--btn-shadow)]",
  "hover:-translate-y-0.5 hover:bg-[var(--btn-bg-hover)] hover:shadow-[var(--btn-shadow-hover)]",
  "active:translate-y-1 active:scale-[0.985] active:duration-90",
  "active:bg-[var(--btn-bg-active)] active:shadow-none",
  "focus-visible:duration-0 focus-visible:shadow-[var(--btn-shadow-focus)]",
  "motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0",
  "motion-reduce:active:scale-100 motion-reduce:active:shadow-[var(--btn-shadow)]",
].join(" ");

const BUTTON_SHELL = [
  "relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap",
  "rounded-full text-center align-middle no-underline select-none [min-inline-size:0]",
  "font-[family-name:var(--font-rubik)] tracking-[0.01em] leading-[1.15]",
  "translate-y-0 bg-[var(--btn-bg)] text-[var(--btn-fg)]",
].join(" ");

/** Disabled: no shadow, no transition, no movement of any kind. */
const BUTTON_DISABLED = `${BUTTON_SHELL} transition-none cursor-not-allowed shadow-none`;

/** Busy: the fill and the shadow stay, so the object does not appear to vanish. */
const BUTTON_BUSY = `${BUTTON_SHELL} transition-none cursor-progress shadow-[var(--btn-shadow)]`;

export type ButtonPresentation = {
  className: string;
  style: React.CSSProperties;
};

/**
 * The single place the visual contract is computed, shared by `Button` and
 * `LinkButton` so a link that looks like a button cannot drift from one.
 */
export function buttonPresentation(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}): ButtonPresentation {
  const {
    variant = "accent",
    size = "md",
    state = "idle",
    disabled = false,
    fullWidth = false,
    className = "",
  } = options;

  const fill = FILLS[variant];

  /**
   * Doc 07 §8.1: a disabled button does not shake, wobble or flash when pressed.
   * A shake reads as a scolding, and half of this site's visitors are children.
   * Whatever made it unavailable is stated in text next to it.
   */
  const resolved: Fill = disabled
    ? {
        bg: "var(--color-cream-300)",
        bgHover: "var(--color-cream-300)",
        bgActive: "var(--color-cream-300)",
        fg: "var(--color-text-disabled)",
        pop: "none",
        popLg: "none",
        borderWidth: fill.borderWidth === "0" ? "0" : "3px",
        borderColor: fill.borderWidth === "0" ? "transparent" : "var(--color-ink-200)",
      }
    : state === "success"
      ? {
          bg: "var(--color-success)",
          bgHover: "var(--color-success)",
          bgActive: "var(--color-success)",
          fg: "var(--color-cream-50)", // 5.28 on #0E7A43
          pop: "0 4px 0 0 var(--color-success-strong)",
          popLg: "0 6px 0 0 var(--color-success-strong)",
          borderWidth: "0",
          borderColor: "transparent",
        }
      : fill;

  const style: CssVars = {
    ...SIZES[size],
    borderWidth: resolved.borderWidth,
    borderColor: resolved.borderColor,
    "--btn-bg": resolved.bg,
    "--btn-bg-hover": resolved.bgHover,
    "--btn-bg-active": resolved.bgActive,
    "--btn-fg": resolved.fg,
    "--btn-shadow": resolved.pop,
    "--btn-shadow-hover": resolved.popLg,
    "--btn-shadow-focus":
      resolved.pop === "none"
        ? `${RING_GAP}, ${RING_HALO}`
        : `${RING_GAP}, ${RING_HALO}, ${resolved.pop}`,
  };

  const shell = disabled
    ? BUTTON_DISABLED
    : state === "loading"
      ? BUTTON_BUSY
      : BUTTON_BASE;

  return {
    className: [shell, fullWidth ? "w-full" : "", className].filter(Boolean).join(" "),
    style,
  };
}

/* ------------------------------------------------------ inner contents */

/**
 * Doc 07 §8.1 locks the pill's width while it is busy, because
 * `להפוך תמונה להדפסה` collapsing to a glyph reflows the sticky bar mid-tap.
 * The label keeps its box and drops to `opacity: 0`, so the width is preserved by
 * layout instead of by a measurement, and the lock cannot be lost on a re-render.
 */
function ButtonContents({
  children,
  state,
  iconStart,
  iconEnd,
  busyLabel,
  successLabel,
}: {
  children: React.ReactNode;
  state: ButtonState;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  busyLabel?: string;
  successLabel?: string;
}) {
  const busy = state === "loading";

  return (
    <>
      {/* The label keeps its box and its accessible name while busy. It is only
          visually hidden, so the button never becomes a nameless control. */}
      <span
        className="inline-flex items-center justify-center gap-2 [min-inline-size:0]"
        style={{ opacity: busy ? 0 : 1, transition: "opacity 120ms var(--ease-in-quick)" }}
      >
        {iconStart ? (
          <span aria-hidden="true" className="inline-flex shrink-0">
            {iconStart}
          </span>
        ) : null}
        {state === "success" ? <SuccessCheck /> : null}
        <span className="[min-inline-size:0]">{children}</span>
        {iconEnd ? (
          <span aria-hidden="true" className="inline-flex shrink-0">
            {iconEnd}
          </span>
        ) : null}
      </span>

      {busy ? <BuildingIndicator /> : null}

      {busy && busyLabel ? (
        <span className="sr-only" role="status">
          {busyLabel}
        </span>
      ) : null}
      {state === "success" && successLabel ? (
        <span className="sr-only" role="status">
          {successLabel}
        </span>
      ) : null}
    </>
  );
}

/**
 * Three voxels stepping through the glow pulse, one layer behind the next. It is
 * the printer's own idiom rather than a spinner, and it reuses the one looping
 * keyframe the theme already ships, so no new motion enters the system.
 */
function BuildingIndicator() {
  const step = Math.round(LOOP.gitd / 3);
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="animate-gitd-pulse"
          style={{
            inlineSize: "0.5rem",
            blockSize: "0.5rem",
            borderRadius: "0.14rem",
            backgroundColor: "currentColor",
            animationDelay: `${-step * index}ms`,
          }}
        />
      ))}
    </span>
  );
}

/** The confirmation glyph. `pop` is exactly its home in doc 07 §5.1. */
function SuccessCheck() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className="animate-pop inline-block size-5 shrink-0"
    >
      <path
        d="M4 10.6 8.2 15 16 5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------ the API */

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** `loading` locks the width and blanks the label. `success` holds the green fill. */
  state?: ButtonState;
  fullWidth?: boolean;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  /** Announced while busy, e.g. `רגע אחד`. */
  busyLabel?: string;
  /** Announced once on success. */
  successLabel?: string;
};

export function Button({
  children,
  variant = "accent",
  size = "md",
  state = "idle",
  fullWidth = false,
  iconStart,
  iconEnd,
  busyLabel,
  successLabel,
  className,
  disabled = false,
  type = "button",
  ...rest
}: ButtonProps) {
  const busy = state === "loading";
  const presentation = buttonPresentation({
    variant,
    size,
    state,
    disabled,
    fullWidth,
    className,
  });

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      data-motion="state"
      data-variant={variant}
      data-red-object={variant === "accent" && !disabled && state === "idle" ? "button" : undefined}
      className={presentation.className}
      style={presentation.style}
    >
      <ButtonContents
        state={state}
        iconStart={iconStart}
        iconEnd={iconEnd}
        busyLabel={busyLabel}
        successLabel={successLabel}
      >
        {children}
      </ButtonContents>
    </button>
  );
}

export { ButtonContents as ButtonInner };
