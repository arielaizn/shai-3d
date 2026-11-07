"use client";

import * as React from "react";
import Link from "next/link";

import { parseShekels, shekelsInput } from "./format";
import { V } from "./messages";

/**
 * The parts every admin screen is built from. 06 §C.4.
 *
 * Everything here is sized for a thumb on a phone standing next to a running
 * printer: 48px minimum on anything pressable, numbers on a numeric keypad, and
 * a label above every field rather than a placeholder inside it, because a
 * placeholder disappears the moment you start typing.
 */

/* ------------------------------------------------------------------ layout */

export function PageHeader({
  title,
  helpHe,
  actions,
  backHref,
  backLabelHe,
}: {
  title: string;
  helpHe?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabelHe?: string;
}) {
  return (
    <header className="a-pagehead">
      <div className="a-grow">
        {backHref ? (
          /* The arrow points right, which is "back" in an RTL reading order. */
          <Link href={backHref} className="a-muted" style={{ textDecoration: "none" }}>
            <span aria-hidden="true">←</span> {backLabelHe ?? "חזרה"}
          </Link>
        ) : null}
        <h1>{title}</h1>
        {helpHe ? <p className="a-muted">{helpHe}</p> : null}
      </div>
      {actions ? <div className="a-row">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  helpHe,
  actions,
  children,
  id,
}: {
  title?: string;
  helpHe?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section className="a-card" id={id}>
      {title ? (
        <div className="a-row" style={{ alignItems: "flex-start" }}>
          <div className="a-grow">
            <h2 className="a-card-title">{title}</h2>
            {helpHe ? <p className="a-card-help">{helpHe}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function HelpNote({ children }: { children: React.ReactNode }) {
  return <p className="a-help">{children}</p>;
}

export function Note({
  tone = "warn",
  children,
}: {
  tone?: "warn" | "danger" | "ok";
  children: React.ReactNode;
}) {
  return (
    <div className="a-note" data-tone={tone === "warn" ? undefined : tone}>
      {children}
    </div>
  );
}

export function Pill({
  tone,
  children,
}: {
  tone?: "new" | "work" | "done" | "off" | "warn";
  children: React.ReactNode;
}) {
  return (
    <span className="a-pill" data-tone={tone}>
      {children}
    </span>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="a-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="a-skeleton"
          style={{ blockSize: "3.5rem", opacity: 1 - index * 0.15 }}
        />
      ))}
    </div>
  );
}

/**
 * 06 §C.22. One flat illustration, one sentence, one button. The three
 * illustrations that exist ship in `public/assets/admin/`; a screen without one
 * renders the sentence alone rather than a placeholder box.
 */
export function AdminEmpty({
  titleHe,
  bodyHe,
  illustration,
  action,
}: {
  titleHe: string;
  bodyHe?: string;
  illustration?: "products" | "leads" | "gallery";
  action?: React.ReactNode;
}) {
  return (
    <div
      className="a-card"
      style={{ textAlign: "center", paddingBlock: "2.5rem", display: "grid", gap: "0.75rem" }}
    >
      {illustration ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/admin/empty-${illustration}.webp`}
          alt=""
          width={220}
          height={220}
          style={{ inlineSize: "min(13.75rem, 60%)", blockSize: "auto", margin: "0 auto" }}
        />
      ) : null}
      <p className="a-card-title" style={{ margin: 0 }}>
        {titleHe}
      </p>
      {bodyHe ? <p className="a-muted">{bodyHe}</p> : null}
      {action ? (
        <div className="a-row" style={{ justifyContent: "center" }}>
          {action}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ fields */

let fieldSeq = 0;

function useFieldId(prefix: string): string {
  const [id] = React.useState(() => `${prefix}-${++fieldSeq}`);
  return id;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="a-field">
      <label className="a-label" htmlFor={htmlFor}>
        {label}
      </label>
      {hint ? <span className="a-hint">{hint}</span> : null}
      {children}
      {error ? <span className="a-error">{error}</span> : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  value,
  onChange,
  maxLength,
  placeholder,
  disabled,
  type = "text",
  dir,
  inputMode,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "email" | "password" | "url" | "tel" | "date";
  dir?: "rtl" | "ltr";
  inputMode?: "text" | "email" | "numeric" | "decimal" | "tel" | "url";
}) {
  const id = useFieldId("f");
  const counter =
    maxLength !== undefined ? `${value.length} מתוך ${maxLength}` : undefined;
  return (
    <Field label={label} hint={hint ?? counter} error={error} htmlFor={id}>
      <input
        id={id}
        className="a-input"
        type={type}
        dir={dir}
        inputMode={inputMode}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {maxLength !== undefined && hint ? <span className="a-hint">{counter}</span> : null}
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  value,
  onChange,
  maxLength,
  rows = 4,
  disabled,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
}) {
  const id = useFieldId("t");
  return (
    <Field
      label={label}
      hint={hint}
      error={error ?? (maxLength && value.length > maxLength ? V.tooLong(maxLength) : undefined)}
      htmlFor={id}
    >
      <textarea
        id={id}
        className="a-textarea"
        rows={rows}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {maxLength !== undefined ? (
        <span className="a-hint">{`${value.length} מתוך ${maxLength}`}</span>
      ) : null}
    </Field>
  );
}

/**
 * Shekels in, agorot out. The database never sees a float and Shai never sees
 * the word "agorot" (06 §C.1.3).
 *
 * The typed text is kept in local state so a half-typed `1` on the way to `12`
 * does not round-trip through the parent and rewrite itself.
 */
export function MoneyField({
  label,
  hint,
  error,
  agorot,
  onChange,
  disabled,
  minAgorot,
  maxAgorot,
}: {
  label: string;
  hint?: string;
  error?: string;
  agorot: number;
  onChange: (agorot: number) => void;
  disabled?: boolean;
  minAgorot?: number;
  maxAgorot?: number;
}) {
  const id = useFieldId("m");
  const [text, setText] = React.useState(() => shekelsInput(agorot));
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!touched) setText(shekelsInput(agorot));
  }, [agorot, touched]);

  const parsed = parseShekels(text);
  const localError =
    text.trim() === ""
      ? V.required
      : parsed === null
        ? V.numberOnly
        : minAgorot !== undefined && parsed < minAgorot
          ? V.rangeIls(shekelsInput(minAgorot), shekelsInput(maxAgorot ?? parsed))
          : maxAgorot !== undefined && parsed > maxAgorot
            ? V.rangeIls(shekelsInput(minAgorot ?? 0), shekelsInput(maxAgorot))
            : undefined;

  return (
    <Field label={label} hint={hint} error={error ?? (touched ? localError : undefined)} htmlFor={id}>
      <div className="a-money">
        <input
          id={id}
          inputMode="decimal"
          dir="ltr"
          value={text}
          disabled={disabled}
          aria-invalid={touched && localError ? true : undefined}
          onChange={(event) => {
            setTouched(true);
            setText(event.target.value);
            const next = parseShekels(event.target.value);
            if (next !== null) onChange(next);
          }}
          onBlur={() => {
            setTouched(false);
            const next = parseShekels(text);
            setText(shekelsInput(next ?? agorot));
          }}
        />
        <span className="a-money-unit">ש״ח</span>
      </div>
    </Field>
  );
}

/** A plain decimal field for the numbers that are not money: multipliers, hours. */
export function NumberField({
  label,
  hint,
  error,
  value,
  onChange,
  step = 0.1,
  min,
  max,
  disabled,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const id = useFieldId("n");
  const [text, setText] = React.useState(() => String(value));
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!touched) setText(String(value));
  }, [value, touched]);

  const parsed = Number(text);
  const bad = text.trim() === "" || Number.isNaN(parsed);
  const outOfRange =
    !bad && ((min !== undefined && parsed < min) || (max !== undefined && parsed > max));

  return (
    <Field
      label={label}
      hint={hint}
      error={
        error ??
        (touched && bad ? V.numberOnly : undefined) ??
        (touched && outOfRange ? V.rangeIls(String(min ?? ""), String(max ?? "")) : undefined)
      }
      htmlFor={id}
    >
      <input
        id={id}
        className="a-input"
        inputMode="decimal"
        dir="ltr"
        step={step}
        value={text}
        disabled={disabled}
        onChange={(event) => {
          setTouched(true);
          setText(event.target.value);
          const next = Number(event.target.value);
          if (event.target.value.trim() !== "" && !Number.isNaN(next)) onChange(next);
        }}
        onBlur={() => {
          setTouched(false);
          setText(String(value));
        }}
      />
    </Field>
  );
}

/** Plus and minus, because typing on a phone is worse than pressing. */
export function NumberStepper({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 99,
  suffixHe,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffixHe?: string;
}) {
  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
      {hint ? <span className="a-hint">{hint}</span> : null}
      <div className="a-stepper">
        <button
          type="button"
          className="a-iconbtn"
          aria-label={`פחות ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <output aria-live="polite">
          {value}
          {suffixHe ? ` ${suffixHe}` : ""}
        </output>
        <button
          type="button"
          className="a-iconbtn"
          aria-label={`עוד ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="a-field">
      <label className="a-toggle">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="a-label">{label}</span>
      </label>
      {hint ? <span className="a-hint">{hint}</span> : null}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: T;
  options: readonly { value: T; labelHe: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const id = useFieldId("s");
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        className="a-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.labelHe}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Segmented<T extends string | number>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label?: string;
  hint?: string;
  value: T;
  options: readonly { value: T; labelHe: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="a-field">
      {label ? <span className="a-label">{label}</span> : null}
      {hint ? <span className="a-hint">{hint}</span> : null}
      <div className="a-seg">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.labelHe}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Hex field plus the phone's own colour picker plus a live chip. The hex is
 * `dir="ltr"` because `#` is a neutral character and lands after the digits in
 * a Hebrew line, so the value reads `F5333F#`.
 */
export function ColorSwatchField({
  label,
  hex,
  onChange,
  error,
}: {
  label: string;
  hex: string;
  onChange: (hex: string) => void;
  error?: string;
}) {
  const id = useFieldId("c");
  const valid = /^#[0-9A-Fa-f]{6}$/.test(hex);
  return (
    <Field label={label} error={error ?? (valid ? undefined : V.hexBad)} htmlFor={id}>
      <div className="a-row">
        <input
          type="color"
          aria-label={`בורר צבע ל${label}`}
          value={valid ? hex : "#000000"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          style={{
            inlineSize: "3rem",
            blockSize: "3rem",
            padding: 0,
            border: "1px solid var(--admin-line-strong)",
            borderRadius: "0.75rem",
            background: "none",
          }}
        />
        <input
          id={id}
          className="a-input a-grow"
          dir="ltr"
          value={hex}
          maxLength={7}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ buttons */

export function ActionButton({
  children,
  onClick,
  tone,
  size,
  disabled,
  type = "button",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "primary" | "quiet" | "danger";
  size?: "sm";
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      className="a-btn"
      data-tone={tone}
      data-size={size}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function LinkAction({
  href,
  children,
  tone,
  size,
  external,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "quiet" | "danger";
  size?: "sm";
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        className="a-btn"
        data-tone={tone}
        data-size={size}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {children}
      </a>
    );
  }
  return (
    <Link className="a-btn" data-tone={tone} data-size={size} href={href}>
      {children}
    </Link>
  );
}
