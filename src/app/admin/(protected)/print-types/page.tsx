"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";

import { api, type Id } from "@/app/admin/_lib/convex";
import { Money } from "@/app/admin/_components/Money";
import { errorHe } from "@/components/admin/messages";
import { SortableList, type SortableEntry } from "@/components/admin/SortableList";
import { useToast } from "@/components/admin/Toast";
import { AdminEmpty, Card, LoadingBlock, PageHeader, Pill } from "@/components/admin/ui";

/**
 * סוגי הדפסה, 06 §C.9.
 *
 * The order here is the order of the tiles in the generator's first step, which
 * RESOLUTIONS §2 made the first thing anybody sees, so it is worth dragging.
 *
 * The tile artwork is `/assets/print-types/${key}.webp` with no lookup table:
 * RESOLUTIONS §6 locks the seven keys precisely so that this path always resolves.
 */
export default function PrintTypesPage() {
  const printTypes = useQuery(api.printTypes.listAdmin, {});
  const reorder = useMutation(api.printTypes.reorder);
  const setActive = useMutation(api.printTypes.setActive);
  const toast = useToast();

  const entries: SortableEntry[] = (printTypes ?? []).map((type) => ({
    id: type._id,
    labelHe: type.nameHe,
    content: (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="a-thumb" src={`/assets/print-types/${type.key}.webp`} alt="" />
        <div className="a-grow" style={{ minInlineSize: 0 }}>
          <div className="a-row">
            <Link href={`/admin/print-types/${type._id}`} className="a-grow">
              {type.nameHe}
            </Link>
            <Pill tone={type.active ? "done" : "off"}>{type.active ? "פעיל" : "מוסתר"}</Pill>
          </div>
          <p className="a-muted">{type.shortHe}</p>
          <div className="a-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <span className="a-muted">מחיר בסיס</span>
            <Money agorot={type.basePriceAgorot} strong announce={false} />
            <span className="a-muted a-num">
              <bdi dir="ltr">{type.sizes.filter((size) => size.active).length}</bdi> גדלים ·{" "}
              עד <bdi dir="ltr">{type.maxColors}</bdi> צבעים
            </span>
          </div>
          <button
            type="button"
            className="a-btn"
            data-size="sm"
            data-tone="quiet"
            style={{ marginBlockStart: "0.5rem" }}
            onClick={() => {
              void setActive({ id: type._id, active: !type.active })
                .then(() =>
                  toast.show(type.active ? "הסוג הוסתר מהמחולל" : "הסוג מוצג במחולל"),
                )
                .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
            }}
          >
            {type.active ? "להסתיר" : "להציג"}
          </button>
        </div>
      </>
    ),
  }));

  return (
    <>
      <PageHeader
        title="סוגי הדפסה"
        helpHe="מה שאפשר להזמין במחולל. הסדר כאן הוא הסדר שם."
      />

      <div className="a-stack">
        {printTypes === undefined ? <LoadingBlock rows={3} /> : null}

        {printTypes !== undefined && printTypes.length === 0 ? (
          <AdminEmpty
            titleHe="אין סוגי הדפסה. המחולל לא יעבוד בלי לפחות אחד."
            bodyHe="שבעת הסוגים נוצרים בזריעה של השרת, יחד עם המחירון והצבעים."
            illustration="products"
          />
        ) : null}

        {entries.length > 0 ? (
          <Card>
            <SortableList
              entries={entries}
              onMove={(id, beforeId, afterId) => {
                void reorder({
                  id: id as Id<"printTypes">,
                  beforeId: beforeId as Id<"printTypes"> | undefined,
                  afterId: afterId as Id<"printTypes"> | undefined,
                }).catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
              }}
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
