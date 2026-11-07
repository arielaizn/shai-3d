import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/home/Band";
import { ClosingCta } from "@/components/home/ClosingCta";
import { ScrollSentinel } from "@/components/layout/StickyWhatsApp";
import { ProductBreadcrumb } from "@/components/products/ProductBreadcrumb";
import { ProductDescription } from "@/components/products/ProductDescription";
import { ProductDetailView } from "@/components/products/ProductDetailView";
import { ProductSpecTable } from "@/components/products/ProductSpecTable";
import { RelatedProducts } from "@/components/products/RelatedProducts";
import { loadCatalog, loadProduct, loadSlugs, relatedProducts } from "@/components/products/loadCatalog";
import { narrowPalette } from "@/components/products/model";
import { META_PRODUCT_DETAIL } from "@/content/meta";
import { formatAgorot } from "@/lib/format/price";

/**
 * PRODUCT DETAIL · doc 03 §5.
 *
 * Order: breadcrumb, media stage and buy panel as two columns, spec table,
 * description, related rail, closing band.
 *
 * **The 3D viewer is the primary media**, and everything else on the page exists to
 * make the object real enough to ask about: the measurements, the colours it comes in,
 * a description in Shai's own voice, and four more things he has made. The page ends
 * where every page on this site ends, at a WhatsApp message that already contains the
 * whole specification.
 *
 * **Reads.** `loadCatalog` is wrapped in `React.cache`, so the product, its palette and
 * the related rail are one set of requests per render rather than three. A missing
 * `NEXT_PUBLIC_CONVEX_URL`, a cold deployment or a failed query all fall back to the
 * seed catalogue, which is what keeps `/products/hex-coasters` rendering before a
 * deployment exists.
 *
 * **`generateStaticParams` is a warm start, not a whitelist.** `dynamicParams` stays on
 * its default, so a product Shai published a minute ago renders on demand instead of
 * 404ing until the next build.
 *
 * [flagged: doc 03 §5.4 lists `src/app/products/[slug]/opengraph-image.tsx`, and
 * `META_PRODUCT_DETAIL` carries the card's copy. The OG route is not built here. The
 * static `heroImageUrl` is used as the card image instead, which is a real photograph
 * of the object and needs no Hebrew rendering into a Satori canvas, where a silent
 * bidi failure produces a card that reads backwards.]
 */

/**
 * `convex/nextjs` hardcodes `client.setFetchOptions({ cache: "no-store" })`, so every
 * server read from Convex is an uncached fetch and this route can never be part of the
 * static cache. Saying so here rather than leaving Next to work it out is not a
 * preference, it is a bug fix: with an empty catalogue `generateStaticParams` returns
 * nothing, the build renders no page, Next never sees the uncached fetch, marks the
 * route SSG anyway, and the first real request dies with
 * `Page changed from static to dynamic at runtime` and a 500. Verified against a
 * production build, not reasoned about.
 *
 * `generateStaticParams` stays below. It is inert while this is set, and it is the one
 * line that has to change back if the reads ever become cacheable.
 */
export const dynamic = "force-dynamic";

type RouteParams = { slug: string };
type PageProps = { params: Promise<RouteParams> };

export async function generateStaticParams(): Promise<RouteParams[]> {
  const slugs = await loadSlugs();
  return slugs.map((slug) => ({ slug }));
}

function leadDaysLabel(min: number, max: number): string {
  return min === max ? String(min) : `${min} עד ${max}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return {};

  const price = formatAgorot(product.priceAgorot);
  const teaser = product.subtitleHe ?? "";
  const hasPrice = product.priceMode !== "quote";

  /**
   * 09d §A.2: past 34 characters the brand suffix is dropped and the name ships alone,
   * because a truncated brand looks worse in a results page than no brand at all.
   */
  const title =
    product.titleHe.length > META_PRODUCT_DETAIL.titleMaxNameChars
      ? product.titleHe
      : META_PRODUCT_DETAIL.title.replace("{nameHe}", product.titleHe);

  const full = META_PRODUCT_DETAIL.description
    .replace("{nameHe}", product.titleHe)
    .replace("{teaserHe}", teaser)
    .replace("{price}", price)
    .replace("{leadDays}", leadDaysLabel(product.leadTimeDaysMin, product.leadTimeDaysMax))
    .replace(/\s+/g, " ")
    .trim();

  const fallback = META_PRODUCT_DETAIL.descriptionFallback
    .replace("{nameHe}", product.titleHe)
    .replace("{price}", price);

  // a quote product has no number to print, so neither template applies and the
  // description is the name and the teaser, with nothing invented to fill the gap
  const description = !hasPrice
    ? `${product.titleHe} בהדפסת תלת ממד. ${teaser}`.replace(/\s+/g, " ").trim()
    : full.length > META_PRODUCT_DETAIL.descriptionMaxChars
      ? fallback
      : full;

  const ogTitle = hasPrice
    ? META_PRODUCT_DETAIL.og.title.replace("{nameHe}", product.titleHe).replace("{price}", price)
    : product.titleHe;

  const image = product.ogImageUrl ?? product.heroImageUrl ?? product.images[0]?.url;

  return {
    title: product.seoTitleHe ?? title,
    description: product.seoDescriptionHe ?? description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: ogTitle,
      description: META_PRODUCT_DETAIL.og.description
        .replace("{teaserHe}", teaser)
        .replace(/\s+/g, " ")
        .trim(),
      type: "website",
      locale: "he_IL",
      images: image ? [{ url: image, alt: product.heroAltHe || product.titleHe }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const { products, palette } = await loadCatalog();
  const available = narrowPalette(palette, product.availableColorKeys);
  const related = relatedProducts(products, product, 4);
  const now = Date.now();

  return (
    <main id="main-content" tabIndex={-1} className="[min-inline-size:0]">
      {/*
        No `overflow-x` on this section, deliberately. It is the only band on the page
        that contains a `position: fixed` child (the sticky WhatsApp bar, which
        `ProductDetailView` owns because it owns the quantity the bar's price is
        computed from), and a clipping ancestor is exactly the thing that can take a
        fixed element off the screen. Nothing in this band can overflow anyway: every
        track is `minmax(0, 1fr)`, every flex child carries `min-inline-size: 0`, and
        the thumb rail scrolls inside its own box.
      */}
      <section className="pb-14 pt-6 md:pt-8 [min-inline-size:0]">
        <Container>
          <ProductBreadcrumb titleHe={product.titleHe} categoryKey={product.categoryKey} />

          {/* the sticky bar arms here rather than at the bottom of the media column:
              below 1024 the primary action lives only in that bar, so waiting until the
              whole buy panel has scrolled past would leave a phone with no primary CTA
              for most of the page */}
          <ScrollSentinel />

          <div className="pt-6 md:pt-8 [min-inline-size:0]">
            <ProductDetailView product={product} palette={palette} />
          </div>
        </Container>
      </section>

      <section className="[overflow-x:clip] pb-16 md:pb-24 [min-inline-size:0]">
        <Container>
          <div className="flex flex-col gap-14 md:gap-20 [min-inline-size:0]">
            <ProductSpecTable product={product} palette={available} />
            <ProductDescription
              descriptionHe={product.descriptionHe}
              sizeNoteHe={product.sizeNoteHe}
            />
            <RelatedProducts products={related} now={now} />
          </div>
        </Container>
      </section>

      <ClosingCta />
    </main>
  );
}
