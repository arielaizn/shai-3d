"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";

import { api, type Id } from "@/app/admin/_lib/convex";
import { Money } from "@/app/admin/_components/Money";
import { PRICE_MODE_HE } from "@/components/admin/format";
import { errorHe } from "@/components/admin/messages";
import { SortableList, type SortableEntry } from "@/components/admin/SortableList";
import { useToast } from "@/components/admin/Toast";
import {
  AdminEmpty,
  Card,
  LinkAction,
  LoadingBlock,
  PageHeader,
  Pill,
} from "@/components/admin/ui";

/**
 * מוצרים, 06 §C.8.
 *
 * The order of this list is the order of the catalogue, so it is dragged rather
 * than typed. One drag writes one row: `products.reorder` takes the two
 * neighbours and the server puts a fractional index between them.
 *
 * The thumbnails come from the public `products.list`, which is the query that
 * already resolves a hero image to a URL. `listAdmin` returns raw documents with
 * a storage id, and a hidden product therefore shows a plain tile rather than a
 * broken image.
 */
export default function ProductsPage() {
  const [showHidden, setShowHidden] = React.useState(true);
  const products = useQuery(api.products.listAdmin, {});
  const publicCards = useQuery(api.products.list, { limit: 60 });
  const reorder = useMutation(api.products.reorder);
  const setActive = useMutation(api.products.setActive);
  const toast = useToast();

  const heroById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const card of publicCards ?? []) {
      if (card.heroImageUrl) map.set(card._id, card.heroImageUrl);
    }
    return map;
  }, [publicCards]);

  const rows = (products ?? []).filter((product) => showHidden || product.active);

  async function toggleActive(id: Id<"products">, active: boolean) {
    try {
      await setActive({ id, active: !active });
      toast.show(active ? "המוצר הוסתר" : "המוצר פורסם", {
        undo: async () => {
          await setActive({ id, active });
        },
      });
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    }
  }

  const entries: SortableEntry[] = rows.map((product) => ({
    id: product._id,
    labelHe: product.titleHe,
    content: (
      <>
        {heroById.get(product._id) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="a-thumb" src={heroById.get(product._id)} alt="" />
        ) : (
          <span className="a-thumb" aria-hidden="true" />
        )}
        <div className="a-grow" style={{ minInlineSize: 0 }}>
          <div className="a-row">
            <Link href={`/admin/products/${product._id}`} className="a-grow">
              {product.titleHe}
            </Link>
            <Pill tone={product.active ? "done" : "off"}>{product.active ? "פעיל" : "מוסתר"}</Pill>
          </div>
          <div className="a-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <span className="a-muted">{PRICE_MODE_HE[product.priceMode]}</span>
            {product.priceMode === "quote" ? null : (
              <Money agorot={product.priceAgorot} strong announce={false} />
            )}
            {product.featured ? <Pill tone="warn">מודגש</Pill> : null}
          </div>
          <button
            type="button"
            className="a-btn"
            data-size="sm"
            data-tone="quiet"
            style={{ marginBlockStart: "0.5rem" }}
            onClick={() => void toggleActive(product._id, product.active)}
          >
            {product.active ? "להסתיר" : "לפרסם"}
          </button>
        </div>
      </>
    ),
  }));

  return (
    <>
      <PageHeader
        title="מוצרים"
        helpHe="הסדר כאן הוא הסדר בקטלוג. אפשר לגרור."
        actions={
          <LinkAction href="/admin/products/new" tone="primary">
            מוצר חדש
          </LinkAction>
        }
      />

      <div className="a-stack">
        <label className="a-toggle">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(event) => setShowHidden(event.target.checked)}
          />
          <span className="a-label">כולל מוסתרים</span>
        </label>

        {products === undefined ? <LoadingBlock rows={3} /> : null}

        {products !== undefined && rows.length === 0 ? (
          <AdminEmpty
            titleHe="עוד אין מוצרים."
            bodyHe="כל מוצר שתוסיף יופיע בקטלוג ובדף הבית."
            illustration="products"
            action={
              <LinkAction href="/admin/products/new" tone="primary">
                מוצר חדש
              </LinkAction>
            }
          />
        ) : null}

        {rows.length > 0 ? (
          <Card>
            <SortableList
              entries={entries}
              onMove={(id, beforeId, afterId) => {
                void reorder({
                  id: id as Id<"products">,
                  beforeId: beforeId as Id<"products"> | undefined,
                  afterId: afterId as Id<"products"> | undefined,
                }).catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
              }}
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
