import * as React from "react";

/**
 * Bidi isolation. Doc 02 §4.4.
 *
 * The rule is short: **every run that is not Hebrew gets isolated, with no
 * exceptions.** `<bdi>` is the default wrapper because it carries
 * `unicode-bidi: isolate` from the user agent and needs no CSS to work.
 *
 * The reason it is compulsory even for a single word is that the failure is
 * invisible until someone edits the sentence. `אני מדפיס ב-PLA Silk, שזה חומר` looks
 * fine until a comma or a bracket lands next to the Latin run, and then the
 * punctuation migrates to the other side of the word.
 *
 * RESOLUTIONS §18: a price is the one case where isolating the *whole* string is
 * wrong. `45 ש״ח` is already correct; only the digits are isolated. That lives in
 * `Price.tsx`, not here.
 */

/* ---------------------------------------------------------------- Bidi */

export type BidiProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  /** Force LTR ordering inside the isolate. Needed for runs that open with a
   *  neutral character such as `+`, `#` or a digit. */
  ltr?: boolean;
};

export function Bidi({ children, ltr = false, ...rest }: BidiProps) {
  return (
    <bdi {...rest} {...(ltr ? { dir: "ltr" as const } : {})}>
      {children}
    </bdi>
  );
}

/* ------------------------------------------------------------ LatinRun */

export type LatinRunProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  /** BCP-47 tag for the run, so a screen reader switches voice. Defaults to `en`. */
  lang?: string;
};

/**
 * A Latin word or phrase inside a Hebrew sentence: `PLA Silk`, `PETG`, `Bambu`.
 * `lang` matters as much as the isolation: without it a Hebrew synthesiser spells
 * `PLA` out letter by letter in Hebrew phonetics.
 */
export function LatinRun({ children, lang = "en", ...rest }: LatinRunProps) {
  return (
    <bdi {...rest} lang={lang}>
      {children}
    </bdi>
  );
}

/* --------------------------------------------------------------- Phone */

/**
 * Turns `+972585845083` into `058-584-5083`.
 * Any other shape is returned untouched rather than mangled.
 */
export function formatIsraeliPhone(e164: string): string {
  const digits = e164.replace(/[^\d+]/g, "");
  const national = digits.startsWith("+972")
    ? `0${digits.slice(4)}`
    : digits.startsWith("972")
      ? `0${digits.slice(3)}`
      : digits;
  if (!/^0\d{9}$/.test(national)) return e164;
  return `${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
}

export type PhoneProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> & {
  /** E.164, e.g. `+972585845083`. Lives in `href` only, never on screen. */
  e164: string;
  /** Overrides the derived `058-584-5083`. */
  display?: string;
  /** Accessible name. Doc 09c has no locked string for this, so callers pass one. */
  label?: string;
  /** Renders the number as plain text with no `tel:` link. */
  asText?: boolean;
};

/**
 * The number is deliberately a prop with no default. DECISIONS.md rules that Shai's
 * number is never a raw literal in the markup and is assembled at run time, and that
 * assembly belongs to `src/lib/whatsapp.ts` and the contact layer that own the
 * number. This primitive owns only the bidi behaviour.
 *
 * Why the isolation is needed: the hyphens in `058-584-5083` and the `+` in the
 * `tel:` form are neutral characters, so inside a Hebrew sentence they migrate to
 * the wrong end of the number and it reads as `5083-584-058`.
 */
export function Phone({ e164, display, label, asText = false, className, ...rest }: PhoneProps) {
  const shown = display ?? formatIsraeliPhone(e164);
  const body = (
    <bdi dir="ltr" className="tabular-nums">
      {shown}
    </bdi>
  );

  if (asText) {
    return <span className={className}>{body}</span>;
  }

  return (
    <a {...rest} href={`tel:${e164}`} aria-label={label} className={className}>
      {body}
    </a>
  );
}

/* ------------------------------------------------------------- Hex */

export type HexProps = React.HTMLAttributes<HTMLSpanElement> & {
  hex: string;
  /** The Hebrew filament name, shown before the code. */
  label?: string;
  /** The 12px colour tile. Off inside an admin table that already shows one. */
  swatch?: boolean;
};

/**
 * A filament hex code. `#` is a neutral character, so without `dir="ltr"` inside a
 * Hebrew sentence it lands after the digits and the visitor reads `F5333F#`.
 */
export function Hex({ hex, label, swatch = true, className, ...rest }: HexProps) {
  const value = hex.toUpperCase();
  return (
    <span
      {...rest}
      className={["inline-flex items-center gap-1.5 [min-inline-size:0]", className]
        .filter(Boolean)
        .join(" ")}
    >
      {swatch ? (
        <span
          aria-hidden="true"
          className="inline-block size-3 shrink-0"
          style={{
            backgroundColor: value,
            borderRadius: "3px",
            // every swatch carries the ink ring, so a near-white filament is still a
            // visible object on cream (doc 01 §12.3)
            boxShadow: "inset 0 0 0 1px var(--color-ink-900)",
          }}
        />
      ) : null}
      {label ? <span className="[min-inline-size:0] truncate">{label}</span> : null}
      <bdi dir="ltr" className="font-mono text-[0.8125rem] tabular-nums">
        {value}
      </bdi>
    </span>
  );
}

/* ---------------------------------------------------------- FileName */

/**
 * Shortens from the middle, never from the end. The extension is the information the
 * visitor actually needs on this site: `.jpg` against `.heic` decides whether an
 * iPhone upload will work, and a normal end-truncation deletes exactly that.
 */
export function truncateMiddle(name: string, max = 26): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const headLength = Math.max(1, max - ext.length - 3);
  return `${name.slice(0, headLength)}...${ext}`;
}

export type FileNameProps = React.HTMLAttributes<HTMLElement> & {
  name: string;
  max?: number;
};

export function FileName({ name, max = 26, className, ...rest }: FileNameProps) {
  return (
    <bdi
      {...rest}
      dir="ltr"
      title={name}
      className={["font-mono text-[0.8125rem]", className].filter(Boolean).join(" ")}
    >
      {truncateMiddle(name, max)}
    </bdi>
  );
}
