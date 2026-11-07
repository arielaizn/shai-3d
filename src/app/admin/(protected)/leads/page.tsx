"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api, type Id } from "@/app/admin/_lib/convex";
import { Money } from "@/app/admin/_components/Money";
import {
  LEAD_FLOW,
  LEAD_STATUS_HE,
  leadStatusTone,
  relativeHe,
  type LeadStatus,
} from "@/components/admin/format";
import { errorHe } from "@/components/admin/messages";
import { useToast } from "@/components/admin/Toast";
import {
  AdminEmpty,
  ActionButton,
  Card,
  LoadingBlock,
  PageHeader,
  Pill,
} from "@/components/admin/ui";

/**
 * פניות והזמנות, 06 §C.6.
 *
 * The row that matters most is the one 06 calls the highest value signal in the
 * panel: a lead whose `whatsappOpenedAt` is still empty twenty minutes after it
 * was created. That person built a thing, saw a price, and vanished at the last
 * step, so the row says so in words rather than hiding it in a colour.
 *
 * Status, pin and archive are 06 §C.19 "instant with a six second undo", so
 * nothing here waits for a save.
 */

const TWENTY_MINUTES = 20 * 60 * 1000;

type Filter = LeadStatus | "all" | "pinned";

function LeadsInbox() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get("status") ?? "all") as Filter;

  const [filter, setFilter] = React.useState<Filter>(initial);
  const [archived, setArchived] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const toast = useToast();

  const counts = useQuery(api.leads.counts, {});
  const leads = useQuery(api.leads.list, {
    status: filter === "all" || filter === "pinned" ? undefined : filter,
    archived,
    limit: 100,
  });

  const setStatus = useMutation(api.leads.setStatus);
  const setPinned = useMutation(api.leads.setPinned);
  const archive = useMutation(api.leads.archive);
  const unarchive = useMutation(api.leads.unarchive);

  const term = search.trim();
  const rows = (leads ?? [])
    .filter((lead) => (filter === "pinned" ? lead.pinned : true))
    .filter((lead) =>
      term === ""
        ? true
        : lead.titleHe.includes(term) ||
          lead.publicCode.toLowerCase().includes(term.toLowerCase()),
    );

  async function changeStatus(id: Id<"leads">, from: LeadStatus, to: LeadStatus) {
    try {
      await setStatus({ id, status: to });
      toast.show(`עבר ל${LEAD_STATUS_HE[to]}`, {
        undo: async () => {
          await setStatus({ id, status: from });
        },
      });
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    }
  }

  async function togglePin(id: Id<"leads">, pinned: boolean) {
    try {
      await setPinned({ id, pinned: !pinned });
      toast.show(pinned ? "הוסר מהמוצמדות" : "הוצמד למעלה", {
        undo: async () => {
          await setPinned({ id, pinned });
        },
      });
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    }
  }

  async function toggleArchive(id: Id<"leads">, isArchived: boolean) {
    try {
      if (isArchived) {
        await unarchive({ id });
        toast.show("חזר מהארכיון");
      } else {
        await archive({ id });
        toast.show("הועבר לארכיון", {
          undo: async () => {
            await unarchive({ id });
          },
        });
      }
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    }
  }

  const chips: { value: Filter; labelHe: string; count?: number }[] = [
    { value: "all", labelHe: "הכל" },
    { value: "new", labelHe: LEAD_STATUS_HE.new, count: counts?.new },
    { value: "contacted", labelHe: LEAD_STATUS_HE.contacted, count: counts?.contacted },
    { value: "quoted", labelHe: LEAD_STATUS_HE.quoted, count: counts?.quoted },
    { value: "printing", labelHe: LEAD_STATUS_HE.printing, count: counts?.printing },
    { value: "done", labelHe: LEAD_STATUS_HE.done, count: counts?.done },
    { value: "lost", labelHe: LEAD_STATUS_HE.lost, count: counts?.lost },
    { value: "pinned", labelHe: "מוצמד" },
  ];

  return (
    <>
      <PageHeader
        title="פניות והזמנות"
        helpHe="כל מי שבנה משהו במחולל ושלח לך הודעה."
      />

      <div className="a-stack">
        <div className="a-chips" role="group" aria-label="סינון לפי מצב">
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className="a-chip"
              aria-pressed={filter === chip.value}
              onClick={() => setFilter(chip.value)}
            >
              {chip.labelHe}
              {chip.count !== undefined && chip.count > 0 ? (
                <span className="a-chip-count">
                  <bdi dir="ltr">{chip.count}</bdi>
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="a-row" style={{ flexWrap: "wrap" }}>
          <label className="a-grow" style={{ minInlineSize: 0 }}>
            <span className="a-sr">חיפוש לפי סוג הדפסה או קוד הזמנה</span>
            <input
              className="a-input"
              type="search"
              placeholder="חיפוש לפי סוג הדפסה או קוד"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="a-toggle">
            <input
              type="checkbox"
              checked={archived}
              onChange={(event) => setArchived(event.target.checked)}
            />
            <span className="a-label">ארכיון</span>
          </label>
        </div>

        {leads === undefined ? <LoadingBlock rows={4} /> : null}

        {leads !== undefined && rows.length === 0 && term !== "" ? (
          <Card>
            <p className="a-muted">{`לא מצאתי כלום עם «${term}».`}</p>
            <ActionButton tone="quiet" size="sm" onClick={() => setSearch("")}>
              לנקות חיפוש
            </ActionButton>
          </Card>
        ) : null}

        {leads !== undefined && rows.length === 0 && term === "" ? (
          <AdminEmpty
            titleHe="אין פניות עדיין."
            bodyHe="כשמישהו יבנה משהו במחולל וישלח לך הודעה, זה יופיע כאן."
            illustration="leads"
          />
        ) : null}

        <ul className="a-list">
          {rows.map((lead) => {
            const waiting =
              lead.whatsappOpenedAt === null && Date.now() - lead.createdAt > TWENTY_MINUTES;
            const late = lead.dueDate !== null && lead.dueDate < Date.now();
            const nextIndex = LEAD_FLOW.indexOf(lead.status) + 1;
            const next = nextIndex > 0 ? LEAD_FLOW[nextIndex] : undefined;

            return (
              <li key={lead._id} className="a-item" style={{ alignItems: "flex-start" }}>
                <div className="a-grow" style={{ minInlineSize: 0 }}>
                  <div className="a-row">
                    <Link href={`/admin/leads/${lead._id}`} className="a-grow">
                      {lead.titleHe || "פנייה ידנית"}
                      {lead.quantity > 1 ? (
                        <span className="a-muted">
                          {" "}
                          ×<bdi dir="ltr">{lead.quantity}</bdi>
                        </span>
                      ) : null}
                    </Link>
                    <Pill tone={leadStatusTone(lead.status)}>{LEAD_STATUS_HE[lead.status]}</Pill>
                  </div>

                  <div className="a-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                    <Money agorot={lead.priceAgorot} strong announce={false} />
                    <span className="a-muted">{relativeHe(lead.createdAt)}</span>
                    <span className="a-muted a-num">
                      קוד <bdi dir="ltr">{lead.publicCode}</bdi>
                    </span>
                    {lead.pinned ? <Pill tone="warn">מוצמד</Pill> : null}
                    {late ? <Pill tone="new">עבר תאריך היעד</Pill> : null}
                  </div>

                  {waiting ? (
                    <p className="a-muted">
                      <span
                        aria-hidden="true"
                        className="a-dot"
                        style={{ backgroundColor: "var(--admin-turquoise)", borderColor: "var(--admin-turquoise)" }}
                      />{" "}
                      עוד לא פתח וואטסאפ
                    </p>
                  ) : null}

                  <div className="a-row" style={{ flexWrap: "wrap", marginBlockStart: "0.5rem" }}>
                    {next ? (
                      <ActionButton
                        size="sm"
                        tone="quiet"
                        onClick={() => void changeStatus(lead._id, lead.status, next)}
                      >
                        {`להעביר ל${LEAD_STATUS_HE[next]}`}
                      </ActionButton>
                    ) : null}
                    <ActionButton
                      size="sm"
                      tone="quiet"
                      onClick={() => void togglePin(lead._id, lead.pinned)}
                    >
                      {lead.pinned ? "לבטל הצמדה" : "להצמיד"}
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      tone="quiet"
                      onClick={() => void toggleArchive(lead._id, archived)}
                    >
                      {archived ? "להחזיר מהארכיון" : "לארכיון"}
                    </ActionButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

export default function LeadsPage() {
  /* useSearchParams needs a boundary above it, and the fallback is the same
     skeleton the list shows while its own query is in flight. */
  return (
    <React.Suspense fallback={<LoadingBlock rows={4} />}>
      <LeadsInbox />
    </React.Suspense>
  );
}
