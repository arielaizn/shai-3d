import * as React from "react";

/**
 * One labelled field, and the whole accessibility contract of the form.
 *
 * Doc 02 §7 sizes the label as `h4` (18px, weight 600, display face) and the error
 * as `body-sm` (15px, weight 600, text face), ink on a red wash. Doc 03 §6.3 is
 * explicit that the error is NOT red text: red at 13px on cream is under 4.5:1, so
 * the colour is carried by the wash and the 3px bar on the start edge of the field
 * while the words stay in ink.
 *
 * Three things here are load bearing rather than decorative:
 *
 * · the label is a real `<label for>` and never a placeholder. A placeholder is
 *   gone the moment typing starts, and on this form the placeholder is a second
 *   sentence (`שם פרטי מספיק`), not a repeat of the label.
 * · `aria-describedby` points at the error, so a screen reader reads the field's
 *   name, then `invalid`, then the sentence that says what to change.
 * · fields carrying Latin content get `dir="ltr"` and are aligned to the start edge
 *   of the RTL form, per doc 02 §4.4.ז. A phone typed into an RTL field puts its
 *   hyphens and its leading `+` at the wrong end, and the visitor cannot see why.
 *
 * The control is 52px tall, which clears the 44px floor with room for the tap to
 * land on a phone held one handed.
 */

const CONTROL_BASE: React.CSSProperties = {
  inlineSize: "100%",
  minInlineSize: 0,
  minBlockSize: "3.25rem",
  borderRadius: "var(--radius-sm)",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "var(--color-border-strong)",
  backgroundColor: "var(--color-cream-200)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-assistant), system-ui, sans-serif",
  fontSize: "1.0625rem",
  lineHeight: 1.5,
  paddingInline: "0.875rem",
  paddingBlock: "0.75rem",
};

const ERROR_EDGE: React.CSSProperties = {
  borderInlineStartWidth: "3px",
  borderInlineStartColor: "var(--color-accent)",
};

const PLACEHOLDER_CLASS = "placeholder:text-[color:var(--color-text-muted)]";

export type FieldDirection = "rtl" | "ltr";

type SharedProps = {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  /** The message under the field. Its presence is what marks the field invalid. */
  error?: string;
  /** `false` puts nothing in the markup: the email label already says `(לא חובה)`. */
  required?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  /** `ltr` for Latin content inside this Hebrew form: a phone, an address. */
  direction?: FieldDirection;
};

export type FieldProps = SharedProps & {
  type?: "text" | "tel" | "email";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  /** Renders a textarea instead of an input. */
  multiline?: false;
};

export type TextAreaFieldProps = SharedProps & {
  multiline: true;
  rows?: number;
};

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
      style={{
        fontSize: "1.125rem",
        fontWeight: 600,
        lineHeight: 1.4,
        color: "var(--color-text-primary)",
      }}
    >
      {children}
    </label>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      className="[min-inline-size:0]"
      style={{
        fontFamily: "var(--font-assistant), system-ui, sans-serif",
        fontSize: "0.9375rem",
        fontWeight: 600,
        lineHeight: 1.5,
        color: "var(--color-text-primary)",
        backgroundColor: "color-mix(in oklab, var(--color-red-500) 12%, transparent)",
        borderRadius: "var(--radius-xs)",
        paddingInline: "0.625rem",
        paddingBlock: "0.375rem",
      }}
    >
      {children}
    </p>
  );
}

/** An LTR control inside an RTL form still hugs the form's start edge. */
function directionStyle(direction: FieldDirection): React.CSSProperties {
  return direction === "ltr" ? { textAlign: "right" } : {};
}

export function Field(props: FieldProps | TextAreaFieldProps) {
  const {
    id,
    name,
    label,
    placeholder,
    error,
    required = false,
    value,
    onValueChange,
    onBlur,
    autoComplete,
    direction = "rtl",
  } = props;

  const errorId = `${id}-error`;
  const invalid = typeof error === "string" && error.length > 0;

  const shared = {
    id,
    name,
    value,
    placeholder,
    autoComplete,
    dir: direction,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? errorId : undefined,
    "aria-required": required || undefined,
    onBlur,
    className: PLACEHOLDER_CLASS,
  };

  return (
    <div className="flex flex-col gap-2 [min-inline-size:0]">
      <Label htmlFor={id}>{label}</Label>

      {props.multiline === true ? (
        <textarea
          {...shared}
          rows={props.rows ?? 4}
          onChange={(event) => onValueChange(event.target.value)}
          style={{
            ...CONTROL_BASE,
            ...directionStyle(direction),
            ...(invalid ? ERROR_EDGE : {}),
            minBlockSize: "7.5rem",
            resize: "vertical",
          }}
        />
      ) : (
        <input
          {...shared}
          type={props.type ?? "text"}
          inputMode={props.inputMode}
          onChange={(event) => onValueChange(event.target.value)}
          style={{
            ...CONTROL_BASE,
            ...directionStyle(direction),
            ...(invalid ? ERROR_EDGE : {}),
          }}
        />
      )}

      {invalid ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
