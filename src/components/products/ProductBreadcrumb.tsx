import * as React from "react";
import Link from "next/link";

import { ChevronGlyph } from "@/components/layout/Glyphs";
import { PRODUCT } from "@/content/products";

import { CATEGORY_LABELS, type CategoryKey } from "./model";

/**
 * Doc 03 §5.2. `דגמים / קטגוריה / שם הדגם`.
 *
 * The middle step is a real filter link, not a label: a visitor who arrived from
 * Instagram on one keychain and wants to see the rest of them should get there in one
 * tap, and `/products?cat=keychains` is a URL the catalogue already understands.
 *
 * The chevron is the site's own glyph, drawn pointing at the **end** edge, which is
 * where a Hebrew line advances. A `/` or a `›` character here would be a neutral under
 * the bidi algorithm and would jump to the wrong side of the label it separates.
 *
 * The current page is a `<span aria-current="page">` rather than a dead link, and the
 * whole thing is one `<nav>` with a Hebrew name so it is skippable.
 */

export type ProductBreadcrumbProps = {
  titleHe: string;
  categoryKey?: CategoryKey;
};

const SEPARATOR = (
  <span aria-hidden="true" className="shrink-0" style={{ color: "var(--color-ink-300)" }}>
    <ChevronGlyph size={14} />
  </span>
);

export function ProductBreadcrumb({ titleHe, categoryKey }: ProductBreadcrumbProps) {
  const category = categoryKey ? CATEGORY_LABELS[categoryKey] : undefined;

  return (
    <nav
      aria-label={PRODUCT.breadcrumb.root}
      className="flex flex-wrap items-center gap-2 [min-inline-size:0]"
      style={{
        fontFamily: "var(--font-assistant), system-ui, sans-serif",
        fontSize: "0.8125rem",
        fontWeight: 600,
        color: "var(--color-text-muted)",
      }}
    >
      <Link href={PRODUCT.breadcrumb.href} className="no-underline hover:underline [min-inline-size:0]" style={{ color: "inherit" }}>
        {PRODUCT.breadcrumb.root}
      </Link>

      {category && categoryKey ? (
        <>
          {SEPARATOR}
          <Link
            href={`${PRODUCT.breadcrumb.href}?cat=${categoryKey}`}
            className="no-underline hover:underline [min-inline-size:0]"
            style={{ color: "inherit" }}
          >
            {category}
          </Link>
        </>
      ) : null}

      {SEPARATOR}
      <span aria-current="page" className="truncate [min-inline-size:0]" style={{ color: "var(--color-text-secondary)" }}>
        {titleHe}
      </span>
    </nav>
  );
}
