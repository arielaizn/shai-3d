import * as React from "react";
import Link from "next/link";

import {
  ButtonInner,
  buttonPresentation,
  type ButtonSize,
  type ButtonState,
  type ButtonVariant,
} from "./Button";

/**
 * A link that carries the button's visual contract.
 *
 * Everything that ends at WhatsApp is a link, not a form submit, because the site
 * never takes money and never posts a payment: the last thing a visitor touches is
 * an `https://wa.me/...` href with the message already written. Keeping that a real
 * anchor means it survives long-press, copy-link, and an in-app webview that blocks
 * `window.open`.
 *
 * The presentation is imported from `Button.tsx` rather than restated, so a link
 * that looks like a button cannot drift away from one.
 */

export type LinkButtonProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & {
  children: React.ReactNode;
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: Extract<ButtonState, "idle" | "success">;
  fullWidth?: boolean;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  successLabel?: string;
  /** Renders an inert `<span>` with `aria-disabled`, never a dead `<a>`. */
  disabled?: boolean;
  /** Opens in a new tab and applies `rel="noopener noreferrer"`. */
  newTab?: boolean;
  /** Next's client-side prefetch. Ignored for external hrefs. */
  prefetch?: boolean;
};

/** `/products`, `#faq` and `?sort=new` route through Next. Everything else does not. */
function isInternal(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#") || href.startsWith("?");
}

export function LinkButton({
  children,
  href,
  variant = "accent",
  size = "md",
  state = "idle",
  fullWidth = false,
  iconStart,
  iconEnd,
  successLabel,
  disabled = false,
  newTab = false,
  prefetch,
  className,
  ...rest
}: LinkButtonProps) {
  const presentation = buttonPresentation({
    variant,
    size,
    state,
    disabled,
    fullWidth,
    className,
  });

  const contents = (
    <ButtonInner state={state} iconStart={iconStart} iconEnd={iconEnd} successLabel={successLabel}>
      {children}
    </ButtonInner>
  );

  const shared = {
    "data-motion": "state" as const,
    "data-variant": variant,
    "data-red-object":
      variant === "accent" && !disabled ? ("link-button" as const) : undefined,
    className: presentation.className,
    style: presentation.style,
  };

  if (disabled) {
    return (
      <span {...shared} aria-disabled="true" role="link">
        {contents}
      </span>
    );
  }

  if (isInternal(href)) {
    return (
      <Link {...rest} {...shared} href={href} prefetch={prefetch}>
        {contents}
      </Link>
    );
  }

  return (
    <a
      {...rest}
      {...shared}
      href={href}
      target={newTab ? "_blank" : rest.target}
      rel={newTab ? "noopener noreferrer" : rest.rel}
    >
      {contents}
    </a>
  );
}
