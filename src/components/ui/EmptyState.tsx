import * as React from "react";

/**
 * The empty state. Doc 03 §4.5 and doc 06 §1475: an illustration slot, one sentence,
 * and the action.
 *
 * On the public site an empty state is a conversion surface, not an apology, so it
 * carries the page's action rather than a shrug. Doc 09c §4.5 supplies the strings:
 * `אין לי דגם כזה עדיין.` with `אפשר לבקש ממני להדפיס בדיוק את מה שחיפשתם.` under it.
 *
 * `pop` is its listed entrance in doc 07 §5.1.
 */

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  /** One line, ending in a full stop. Never an accusation. */
  title: string;
  /** One sentence of what to do instead. */
  body?: string;
  /** Artwork or a glyph, at roughly 160-240px. Always decorative. */
  illustration?: React.ReactNode;
  /** Buttons. The primary one belongs here, not below the block. */
  actions?: React.ReactNode;
  tone?: "onCream" | "onRaised";
  pop?: boolean;
};

export function EmptyState({
  title,
  body,
  illustration,
  actions,
  tone = "onCream",
  pop = true,
  className,
  style,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      {...rest}
      className={[
        "flex flex-col items-center gap-4 text-center [min-inline-size:0]",
        pop ? "animate-pop" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        paddingBlock: "3rem",
        paddingInline: "var(--spacing-gutter)",
        borderRadius: "var(--radius-xl)",
        backgroundColor:
          tone === "onRaised" ? "var(--color-surface-raised)" : "var(--color-surface-sunken)",
        ...style,
      }}
    >
      {illustration ? (
        <div aria-hidden="true" className="flex max-w-60 items-center justify-center">
          {illustration}
        </div>
      ) : null}

      <p
        className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "clamp(1.375rem, 1.21rem + 0.67vw, 1.75rem)",
          fontWeight: 700,
          lineHeight: 1.25,
          color: "var(--color-text-primary)",
          maxInlineSize: "24ch",
        }}
      >
        {title}
      </p>

      {body ? (
        <p
          className="[min-inline-size:0]"
          style={{
            fontFamily: "var(--font-assistant), system-ui, sans-serif",
            fontSize: "1.0625rem",
            lineHeight: 1.75,
            color: "var(--color-text-secondary)",
            maxInlineSize: "34rem",
            textWrap: "pretty",
          }}
        >
          {body}
        </p>
      ) : null}

      {actions ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 [min-inline-size:0]">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
