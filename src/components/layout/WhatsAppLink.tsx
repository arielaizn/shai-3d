"use client";

import * as React from "react";

import { ButtonInner, buttonPresentation, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { buildWaUrl, type WaMessageConfig, type WaSource } from "@/lib/whatsapp";

/**
 * Every outbound WhatsApp link on the site.
 *
 * DECISIONS.md: the number is Shai's personal line, so it never sits in the served
 * HTML as a contiguous string. `src/lib/whatsapp.ts` keeps it as separate digits and
 * joins them at call time, which only helps if the join happens **in the browser**.
 * So the `href` is written in an effect after mount, and the server response carries
 * an `<a>` with a label and no address. A harvester reading the HTML finds nothing.
 *
 * The cost is one hydration tick during which the anchor is not clickable, which is
 * the reason this is a real `<a>` and not a `<button>` calling `window.open`: the
 * moment it has its href it survives long-press, copy-link, and an in-app webview
 * that blocks `window.open`.
 *
 * `source` is analytics only, per doc 03 §2.7. `plausible` is called through
 * `globalThis` so the site works identically with no analytics loaded.
 */

type Analytics = { plausible?: (event: string, options?: { props?: Record<string, string> }) => void };

export type WhatsAppLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> & {
  children: React.ReactNode;
  config: WaMessageConfig;
  source: WaSource;
  /** With a variant the link carries the button contract. Without it, it is bare. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
};

export function WhatsAppLink({
  children,
  config,
  source,
  variant,
  size = "lg",
  fullWidth = false,
  iconStart,
  iconEnd,
  className,
  style,
  onClick,
  ...rest
}: WhatsAppLinkProps) {
  const [href, setHref] = React.useState<string | undefined>(undefined);

  const serialised = JSON.stringify({ ...config, source });
  React.useEffect(() => {
    setHref(buildWaUrl({ ...config, source }));
    // the config is a plain object literal at every call site, so it is compared by
    // value rather than by identity or the effect would run on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised]);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    (globalThis as Analytics).plausible?.("wa_click", { props: { source } });
    onClick?.(event);
  }

  if (!variant) {
    return (
      <a
        {...rest}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-wa={source}
        className={className}
        style={style}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  const presentation = buttonPresentation({ variant, size, fullWidth, className });

  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-wa={source}
      data-motion="state"
      data-variant={variant}
      data-red-object={variant === "accent" ? "link-button" : undefined}
      className={presentation.className}
      style={{ ...presentation.style, ...style }}
      onClick={handleClick}
    >
      <ButtonInner state="idle" iconStart={iconStart} iconEnd={iconEnd}>
        {children}
      </ButtonInner>
    </a>
  );
}

/** The WhatsApp glyph. 16x16, `currentColor`, 1.75px strokes, doc 03 §0.1. */
export function WhatsAppGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 9.1c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5l.6 1.4c.1.3 0 .5-.1.7l-.4.4c-.1.2-.2.3 0 .6.4.7 1 1.3 1.8 1.7.3.2.5.1.6 0l.4-.5c.2-.2.4-.2.6-.1l1.3.7c.4.2.4.4.4.6 0 .8-.7 1.4-1.5 1.4-2.4-.1-5.5-3.2-5.7-5.6a2 2 0 0 1 .2-1.3Z"
        fill="currentColor"
      />
    </svg>
  );
}
