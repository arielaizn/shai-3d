import * as React from "react";

/**
 * The panel every block on this page sits in.
 *
 * `TiltCard` is the site's card and it is not used here, for one mechanical reason:
 * it sets `overflow: hidden` so a photo can take its corner radius, and every panel
 * on this page contains a control. The focus ring is drawn with a 9px box-shadow
 * halo, and `overflow: hidden` on the parent clips it, which would make a keyboard
 * user's ring disappear on exactly the four inputs and three buttons that need it
 * most. So the contact panels are plain surfaces with the same radius, the same warm
 * shadow and the same white ground, and nothing is clipped.
 *
 * `accent` is the WhatsApp card of doc 03 §6.1: a red tinted ground with a 3px red
 * edge. It is the page's one red object, which is why the form's own submit steps
 * down to ink (doc 01 §5.3, and the `פעם אחת במסך` rule in DECISIONS.md).
 */

export type CardTone = "raised" | "accent";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  tone?: CardTone;
  as?: "div" | "section";
};

const TONES: Record<CardTone, React.CSSProperties> = {
  raised: {
    backgroundColor: "var(--color-surface-raised)",
    boxShadow: "var(--shadow-md)",
  },
  accent: {
    backgroundColor: "var(--color-accent-soft)",
    borderWidth: "3px",
    borderColor: "var(--color-red-500)",
    boxShadow: "var(--shadow-md)",
  },
};

export function Card({
  children,
  tone = "raised",
  as = "div",
  className,
  style,
  ...rest
}: CardProps) {
  // `as` is always an intrinsic tag with the same attribute surface as a div, so the
  // cast keeps the JSX honest without a generic polymorphic component (same shape as
  // `Reveal` in the home page).
  const Tag = as as "div";
  return (
    <Tag
      {...rest}
      className={["flex flex-col p-6 sm:p-8 [min-inline-size:0]", className]
        .filter(Boolean)
        .join(" ")}
      style={{ borderRadius: "var(--radius-xl)", ...TONES[tone], ...style }}
    >
      {children}
    </Tag>
  );
}

/**
 * A block heading inside a panel. It is an `h2` by default because each panel on
 * this page is a section of the document, and doc 02 §7 sizes it as `h3` type on a
 * card so it does not outweigh the page's own `h1`.
 */
export function CardHeading({
  children,
  level = 2,
  id,
}: {
  children: React.ReactNode;
  level?: 2 | 3;
  id?: string;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag
      id={id}
      className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
      style={{
        fontSize: "clamp(1.375rem, 1.21rem + 0.67vw, 1.75rem)",
        fontWeight: 700,
        lineHeight: 1.25,
        color: "var(--color-text-primary)",
      }}
    >
      {children}
    </Tag>
  );
}
