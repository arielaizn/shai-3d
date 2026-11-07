"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LinkButton } from "@/components/ui/LinkButton";
import { Logo } from "@/components/brand/Logo";
import { Voxel } from "@/components/ui/Voxel";
import { DURATION, EASE } from "@/lib/design/motion";
import { ANNOUNCEMENT, HEADER, NAV, SITE } from "@/content/site";

import { MenuGlyph } from "./Glyphs";
import { MobileNav } from "./MobileNav";

/**
 * The global chrome above the fold, doc 03 §2.2 and §2.3.
 *
 * The header is transparent at the top so the hero reads full bleed, and above 8px
 * of scroll it gains `cream/92`, a 12px backdrop blur and a hairline. Doc 07 §6.6
 * makes that a discrete state driven by a sentinel rather than a scroll-linked
 * transform, so nothing is animated per frame.
 *
 * The wordmark takes the **start (right)** edge, because that is where a Hebrew
 * reader's eye lands, and the hamburger takes the **end (left)** edge, the mirror of
 * the LTR convention. The desktop CTA is the generator and not WhatsApp: a visitor
 * who arrives at the generator hands over a far better WhatsApp message than one who
 * taps a bare chat link.
 *
 * [The announcement bar of doc 03 §2.2 lives in this file rather than in its own
 * `AnnouncementBar.tsx`, because the assignment names four layout files. Its copy,
 * dismissal key and version behaviour are unchanged.]
 */

const ANNOUNCE_VERSION = 1;
const ANNOUNCE_KEY = `shai.announce.v${ANNOUNCE_VERSION}`;

function AnnouncementBar() {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(ANNOUNCE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(ANNOUNCE_KEY, "1");
    } catch {
      /* private mode. The bar simply comes back next visit. */
    }
  }

  if (dismissed) return null;

  const [before, after] = ANNOUNCEMENT.text.split(ANNOUNCEMENT.highlightWord);

  return (
    <div
      className="flex h-9 items-center justify-center gap-3 px-5 [min-inline-size:0]"
      style={{ backgroundColor: "var(--color-ink-900)" }}
    >
      <p
        className="truncate text-center [min-inline-size:0]"
        style={{
          fontFamily: "var(--font-assistant), system-ui, sans-serif",
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "var(--color-text-on-inverse)",
        }}
      >
        {before}
        <span style={{ color: "var(--color-turq-400)" }}>{ANNOUNCEMENT.highlightWord}</span>
        {after}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={ANNOUNCEMENT.dismissAria}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
        style={{ color: "var(--color-cream-300)" }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

function Wordmark() {
  return (
    <Link
      href="/"
      aria-label={HEADER.wordmarkAria}
      className="inline-flex h-10 items-center no-underline [min-inline-size:0]"
    >
      {/* The real lockup, mark plus wordmark, as paths. It carries its own Hebrew
          <title>, so the link's aria-label is the only name a reader announces. */}
      <Logo variant="full" className="h-7 w-auto shrink-0" aria-hidden />
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [stuck, setStuck] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    function onScroll() {
      setStuck(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function closeNav() {
    setNavOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-3 focus:rounded-full focus:px-4 focus:py-2"
        style={{ backgroundColor: "var(--color-cream-50)", color: "var(--color-ink-900)" }}
      >
        {HEADER.skipLink}
      </a>

      <header className="sticky top-0 z-40 [min-inline-size:0]">
        <AnnouncementBar />

        <div
          style={{
            backgroundColor: stuck ? "color-mix(in oklab, var(--color-cream-100) 92%, transparent)" : "transparent",
            backdropFilter: stuck ? "blur(12px)" : undefined,
            WebkitBackdropFilter: stuck ? "blur(12px)" : undefined,
            borderBlockEndWidth: "1px",
            borderBlockEndColor: stuck
              ? "color-mix(in oklab, var(--color-ink-900) 8%, transparent)"
              : "transparent",
            transition: `background-color ${DURATION.d2}ms ${EASE.outSoft}, border-color ${DURATION.d2}ms ${EASE.outSoft}`,
          }}
        >
          <div className="mx-auto flex h-17 w-full max-w-[77.5rem] items-center gap-4 px-5 sm:px-8 lg:h-20 lg:px-10 [min-inline-size:0]">
            <Wordmark />

            {/* the only navigation landmark on the page, so it needs no name of its
                own and no string that 09c does not already carry */}
            <nav className="ms-auto hidden items-center gap-8 lg:flex [min-inline-size:0]">
              {NAV.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="relative py-2 no-underline [min-inline-size:0]"
                    style={{
                      fontFamily: "var(--font-rubik), system-ui, sans-serif",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--color-ink-900)",
                    }}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 block"
                      style={{
                        blockSize: "3px",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: "var(--color-turq-500)",
                        transform: active ? "scaleX(1)" : "scaleX(0)",
                        transformOrigin: "var(--flow-origin, right)",
                        transition: `transform ${DURATION.d4}ms ${EASE.outSoft}`,
                      }}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="hidden lg:block">
              <LinkButton href={HEADER.ctaHref} variant="accent" size="md">
                {HEADER.cta}
              </LinkButton>
            </div>

            <button
              ref={triggerRef}
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label={HEADER.menuOpenAria}
              aria-expanded={navOpen}
              className="ms-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full lg:hidden"
              style={{ color: "var(--color-ink-900)" }}
            >
              <MenuGlyph />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={navOpen} onClose={closeNav} />
    </>
  );
}
