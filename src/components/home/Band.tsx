import * as React from "react";

/**
 * The page container and the section rhythm, doc 03 §0.5.
 *
 * container   max-inline-size 1240px; padding-inline 20 / 32 / 40
 * band        padding-block 72 (mobile) / 112 (>=768) / 128 (>=1280)
 *
 * RESOLUTIONS §12: every grid track inside a band ships as `minmax(0, 1fr)` and
 * every flex child carries `min-inline-size: 0`. A `1fr` track carries an implicit
 * `min-width: auto`, refuses to shrink under its content, and in RTL the overflow
 * leaves to the left and puts a horizontal scrollbar on the whole document.
 */

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export const CONTAINER_CLASS =
  "mx-auto w-full max-w-[77.5rem] px-5 sm:px-8 lg:px-10 [min-inline-size:0]";

export function Container({ children, className, ...rest }: ContainerProps) {
  return (
    <div {...rest} className={[CONTAINER_CLASS, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export type BandProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  /** Section ground. `bleed` skips the container so the child can break the grid. */
  ground?: "cream" | "sunken" | "inverse" | "red" | "none";
  bleed?: boolean;
  as?: "section" | "div";
  /** Trims the block padding, for a band that sits directly under another one. */
  tight?: boolean;
};

const GROUNDS: Record<NonNullable<BandProps["ground"]>, string | undefined> = {
  cream: "var(--color-surface)",
  sunken: "var(--color-surface-sunken)",
  inverse: "var(--color-surface-inverse)",
  red: "var(--color-red-500)",
  none: undefined,
};

export function Band({
  children,
  ground = "none",
  bleed = false,
  tight = false,
  as = "section",
  className,
  style,
  ...rest
}: BandProps) {
  const Tag = as;
  return (
    <Tag
      {...rest}
      className={[
        // RESOLUTIONS §12: a band clips on the inline axis so a tilted card, a bleed
        // or a marquee can never put a horizontal scrollbar on the document. `clip`
        // rather than `hidden`, so it does not become a scroll container.
        "relative [overflow-x:clip] [min-inline-size:0]",
        tight ? "py-10 md:py-14" : "py-18 md:py-28 xl:py-32",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: GROUNDS[ground], ...style }}
    >
      {bleed ? children : <Container>{children}</Container>}
    </Tag>
  );
}
