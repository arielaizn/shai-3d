/**
 * TS mirror of the palette declared in `src/app/globals.css` (@theme).
 *
 * Why this file exists: react-three-fiber, canvas/OG generation and Convex seeds
 * cannot read CSS custom properties, so the hex values live here a second time.
 * `src/app/globals.css` stays the single source of truth. Doc 01 §14 lists
 * `scripts/gen-color-mirror.mjs` as the generator that keeps the two in sync and
 * fails CI on drift; until that script exists, edit both files together.
 *
 * Every ratio quoted in a comment is a measured WCAG 2.1 value from doc 01 §2-§4.
 */

/* ---------------------------------------------------------------- ramps */

export const cream = {
  50: "#FFFCF7",
  100: "#FFF7EC", // brand: the page ground
  200: "#FBEFDE",
  300: "#F4E3CB",
  400: "#E8D2B3",
  500: "#D6BC96",
  600: "#B99C74",
  700: "#927858",
  800: "#6A563E",
  900: "#453728",
} as const;

export const red = {
  50: "#FFF1F1",
  100: "#FFDDDE",
  200: "#FFB9BC",
  300: "#FF8A90",
  400: "#FB5C65", // the on-stage red
  500: "#F5333F", // brand: identity object. ink label on it = 4.66
  600: "#DB1F2B", // CTA fill. cream-50 label on it = 4.84
  700: "#B2151F", // red as text on cream = 6.55
  800: "#8A1018",
  900: "#5E0B10",
} as const;

export const turq = {
  50: "#EDFCFB",
  100: "#D0F7F4",
  200: "#9DEDE8",
  300: "#63DED7",
  400: "#2ECCC4",
  500: "#12BFB8", // brand: fill only. 2.16 on cream, never text, never a control edge
  600: "#0E9C96",
  700: "#0B7A75", // turquoise as text or control border = 4.87
  800: "#085B57", // link colour = 7.48
  900: "#063E3B",
} as const;

export const yellow = {
  50: "#FFFAEB",
  100: "#FFF2CC",
  200: "#FFE49B",
  300: "#FFD463",
  400: "#FFC531", // brand: fill only. 1.49 on cream
  500: "#F0AE0C",
  600: "#C98C06",
  700: "#9C6A06",
  800: "#6F4B06", // warning text = 7.36
  900: "#4A3205",
} as const;

export const ink = {
  50: "#F5F3F6",
  100: "#E6E2EA",
  200: "#CFC9D5", // skeleton bar
  300: "#ADA3B6",
  400: "#8B8095", // control borders, clears the 3:1 floor of SC 1.4.11
  500: "#665C70", // text-muted = 5.94
  600: "#4E4557", // text-secondary = 8.55
  700: "#372F3F",
  800: "#26202C",
  900: "#1A1420", // brand: text-primary, toy outline, focus ring
} as const;

/** The 3D backdrop, and only the 3D backdrop. */
export const stage = {
  950: "#0C0812",
  900: "#120E18",
  800: "#191320",
  700: "#221B2C",
  600: "#2E2639",
} as const;

export const palette = { cream, red, turq, yellow, ink, stage } as const;

/* -------------------------------------------------------- flat aliases */

/** The five locked brand hexes from DECISIONS.md. */
export const brand = {
  cream: cream[100],
  red: red[500],
  turquoise: turq[500],
  yellow: yellow[400],
  ink: ink[900],
} as const;

/* ------------------------------------------------------ semantic roles */

export const role = {
  surface: "#FFF7EC",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#FBEFDE",
  surfaceInverse: "#1A1420",
  surfaceStage: "#191320",

  borderSubtle: "#E8D2B3",
  borderStrong: "#8B8095",
  borderToy: "#1A1420",
  borderStage: "#2E2639",

  textPrimary: "#1A1420",
  textSecondary: "#4E4557",
  textMuted: "#665C70",
  textOnRed: "#1A1420",
  textOnAccent: "#FFFCF7",
  textOnTurquoise: "#1A1420",
  textOnYellow: "#1A1420",
  textOnInverse: "#FFFCF7",
  textOnStage: "#FFFCF7",
  textStageMuted: "#ADA3B6",
  textLink: "#085B57",
  textDisabled: "#8B8095",

  accent: "#DB1F2B",
  accentHover: "#B2151F",
  accentPressed: "#8A1018",
  accentSoft: "#FFF1F1",

  play: "#12BFB8",
  playHover: "#0E9C96",
  playPressed: "#0B7A75",
  playSoft: "#EDFCFB",
  playBorder: "#0B7A75",

  focusRing: "#1A1420",
  focusGap: "#FFFCF7",
  focusHalo: "#9DEDE8",

  priceTagBg: "#F5333F",
  priceTagText: "#1A1420",
  priceTagSub: "#5E0B10",
  priceTagString: "#1A1420",
  priceBurst: "#FFE49B",

  success: "#0E7A43",
  successSoft: "#E4F5EA",
  successStrong: "#0A5B32",
  warning: "#FFC531",
  warningSoft: "#FFF2CC",
  warningText: "#6F4B06",
  danger: "#B2151F",
  dangerSoft: "#FFF1F1",
  dangerStrong: "#8A1018",
} as const;

/* ------------------------------------------------------- the focus ring */

/**
 * Doc 01 §4.6 and RESOLUTIONS §11. The ring is ink, never turquoise: turquoise on
 * cream measures 2.16:1 against a 3:1 requirement, so a turquoise ring is invisible
 * to a low-vision keyboard user. The turquoise halo is decorative and carries no
 * compliance load, which is why it is allowed to be low contrast.
 *
 * `globals.css` supplies this on bare `:focus-visible`, but any component that sets
 * a `box-shadow` utility clobbers it, so those components rebuild it from here.
 */
export const focusRing = {
  outlineWidth: "3px",
  outlineColor: role.focusRing,
  outlineOffset: "2px",
  gap: `0 0 0 2px ${role.focusGap}`,
  halo: `0 0 0 9px color-mix(in oklab, ${role.focusHalo} 55%, transparent)`,
} as const;

/** `box-shadow` value for the ring, optionally stacked over an existing shadow. */
export function focusRingShadow(under?: string): string {
  const rings = `${focusRing.gap}, ${focusRing.halo}`;
  return under && under !== "none" ? `${rings}, ${under}` : rings;
}

/* ------------------------------------------------------------- shadows */

/** Doc 01 §7. Warm espresso on cream, violet-ink on the stage. Never neutral grey. */
export const shadow = {
  xs: "0 1px 2px rgba(61,39,22,0.08)",
  sm: "0 2px 4px rgba(61,39,22,0.10), 0 1px 1px rgba(61,39,22,0.06)",
  md: "0 6px 14px -2px rgba(61,39,22,0.14), 0 2px 4px rgba(61,39,22,0.08)",
  lg: "0 14px 30px -6px rgba(61,39,22,0.18), 0 4px 8px rgba(61,39,22,0.10)",
  xl: "0 28px 56px -12px rgba(61,39,22,0.22), 0 8px 16px rgba(61,39,22,0.10)",
  photo: "0 18px 40px -10px rgba(61,39,22,0.24), 0 3px 8px rgba(61,39,22,0.10)",
  /** The tactile signature: zero blur, 4px down, ink. Doc 01 §7.1. */
  pop: `0 4px 0 0 ${ink[900]}`,
  popLg: `0 6px 0 0 ${ink[900]}`,
  popRed: `0 4px 0 0 ${red[800]}`,
  glowRed: "0 12px 40px -8px rgba(245,51,63,0.45)",
  glowPlay: "0 12px 40px -8px rgba(18,191,184,0.42)",
  glowGitd: "0 0 64px 0 rgba(166,255,126,0.42)",
  stage: "0 32px 70px -16px rgba(12,8,18,0.45), 0 6px 14px rgba(12,8,18,0.22)",
  well: "inset 0 2px 4px rgba(61,39,22,0.10)",
} as const;

/* --------------------------------------------------------- the 3D stage */

/** Doc 01 §11. Everything react-three-fiber needs as a literal value. */
export const stage3d = {
  clearColor: stage[900],
  fog: { color: stage[950], near: 6, far: 18 },
  backdrop: { center: stage[700], edge: stage[950] },
  rimLight: { color: turq[400], intensity: 0.35 },
  fillLight: { color: yellow[300], intensity: 0.18 },
  environment: { preset: "studio", intensity: 0.6 },
  panelFrame: "#FFFFFF",
} as const;

/** Doc 01 §11.3. The glow-in-the-dark two-state toggle. */
export const glowFilament = {
  dayHex: "#CFF3B8",
  emissiveHex: "#A6FF7E",
  emissiveIntensity: 1.4,
  darkStateLightIntensity: 0.05,
} as const;

/* ------------------------------------------------------------ helpers */

/** `"#12BFB8"` to `0x12BFB8`, which is what a three.js Color constructor wants. */
export function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

/** `"#12BFB8"` to `[18, 191, 184]`. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = hexToInt(hex);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `"#12BFB8"` at 0.55 to `"rgba(18, 191, 184, 0.55)"`, for canvas and SVG. */
export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
