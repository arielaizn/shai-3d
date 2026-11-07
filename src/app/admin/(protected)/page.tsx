"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/app/admin/_lib/convex";
import { Money } from "@/app/admin/_components/Money";
import { LEAD_STATUS_HE, greetingHe, leadStatusTone, relativeHe } from "@/components/admin/format";
import { Card, LinkAction, LoadingBlock, PageHeader, Pill } from "@/components/admin/ui";

/**
 * לוח בקרה, 06 §C.5.
 *
 * Four numbers, the five things that have to be true before the site goes up, a
 * week of activity, and the newest five leads. A tile showing zero is drawn in
 * muted ink and carries no badge, because a quiet day is not an alarm.
 */

const DAY = 24 * 60 * 60 * 1000;

function startOfToday(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function NumberTile({
  labelHe,
  value,
  href,
}: {
  labelHe: string;
  value: number | undefined;
  href: string;
}) {
  const known = value ?? 0;
  return (
    <Link href={href} className="a-numtile" data-zero={known === 0 ? "true" : undefined}>
      <span className="a-muted">{labelHe}</span>
      <b>
        <bdi dir="ltr">{value === undefined ? "·" : known}</bdi>
      </b>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const settings = useQuery(api.settings.get, {});
  const leadCounts = useQuery(api.leads.counts, {});
  const messageCounts = useQuery(api.contact.counts, {});
  const latestLeads = useQuery(api.leads.list, { limit: 5 });
  const weekLeads = useQuery(api.leads.list, { limit: 200 });
  const drafts = useQuery(api.drafts.listAdmin, { limit: 200 });
  const printTypes = useQuery(api.printTypes.listAdmin, {});
  const colors = useQuery(api.filaments.listAdmin, {});
  const products = useQuery(api.products.listAdmin, {});

  const firstName = (settings?.businessNameHe ?? "שי").trim().split(" ")[0] || "שי";
  const today = startOfToday();

  const abandonedToday = (drafts ?? []).filter(
    (draft) => draft.status === "abandoned" && draft.updatedAt >= today,
  ).length;

  const inWork =
    (leadCounts?.contacted ?? 0) + (leadCounts?.quoted ?? 0) + (leadCounts?.printing ?? 0);

  /* the seven days chart: drafts started against leads sent */
  const week = React.useMemo(() => {
    const days: { label: string; drafts: number; leads: number }[] = [];
    for (let back = 6; back >= 0; back -= 1) {
      const from = today - back * DAY;
      const to = from + DAY;
      days.push({
        label: new Intl.DateTimeFormat("he-IL", { weekday: "narrow" }).format(new Date(from)),
        drafts: (drafts ?? []).filter((d) => d.updatedAt >= from && d.updatedAt < to).length,
        leads: (weekLeads ?? []).filter((l) => l.createdAt >= from && l.createdAt < to).length,
      });
    }
    return days;
  }, [drafts, weekLeads, today]);

  const weekDrafts = week.reduce((sum, day) => sum + day.drafts, 0);
  const weekLeadCount = week.reduce((sum, day) => sum + day.leads, 0);
  const peak = Math.max(1, ...week.map((day) => Math.max(day.drafts, day.leads)));

  const checklist = [
    {
      doneHe: "מספר וואטסאפ מוגדר",
      done: Boolean(settings?.whatsappNumberE164),
      href: "/admin/settings",
    },
    {
      doneHe: "יש לפחות סוג הדפסה אחד פעיל",
      done: (printTypes ?? []).some((type) => type.active),
      href: "/admin/print-types",
    },
    {
      doneHe: "יש לפחות 6 צבעי חוט",
      done: (colors ?? []).filter((color) => color.active).length >= 6,
      href: "/admin/colors",
    },
    {
      doneHe: "מחיר בסיס גדול מאפס בכל סוג הדפסה",
      done:
        (printTypes ?? []).length > 0 &&
        (printTypes ?? []).every((type) => type.basePriceAgorot > 0),
      href: "/admin/pricing",
    },
    {
      doneHe: "יש לפחות 3 מוצרים באתר",
      done: (products ?? []).filter((product) => product.active).length >= 3,
      href: "/admin/products",
    },
  ];

  const loading = leadCounts === undefined || drafts === undefined || products === undefined;

  const fresh =
    !loading &&
    (weekLeads ?? []).length === 0 &&
    (drafts ?? []).length === 0 &&
    (products ?? []).length === 0;

  return (
    <>
      <PageHeader
        title={greetingHe(firstName)}
        helpHe={new Intl.DateTimeFormat("he-IL", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
      />

      {loading ? <LoadingBlock rows={3} /> : null}

      {fresh ? (
        <Card title="עוד לא קרה כלום. זה בסדר, האתר חדש.">
          <p className="a-muted">
            שני הדברים שפותחים את האתר הם מוצר ראשון בקטלוג ומחירון שנראה לך הגיוני.
          </p>
          <div className="a-row" style={{ marginBlockStart: "1rem", flexWrap: "wrap" }}>
            <LinkAction href="/admin/products/new" tone="primary">
              להוסיף מוצר ראשון
            </LinkAction>
            <LinkAction href="/admin/pricing" tone="quiet">
              לפתוח את מסך המחירים
            </LinkAction>
          </div>
        </Card>
      ) : null}

      {!loading && !fresh ? (
        <div className="a-stack">
          <div className="a-numgrid">
            <NumberTile labelHe="פניות חדשות" value={leadCounts?.new} href="/admin/leads" />
            <NumberTile labelHe="הזמנות בעבודה" value={inWork} href="/admin/leads" />
            <NumberTile labelHe="תצורות שנעזבו היום" value={abandonedToday} href="/admin/drafts" />
            <NumberTile
              labelHe="הודעות שלא נקראו"
              value={messageCounts?.new}
              href="/admin/messages"
            />
          </div>

          {checklist.some((item) => !item.done) ? (
            <Card title="5 דברים לפני שהאתר עולה">
              <ul className="a-list">
                {checklist.map((item) => (
                  <li key={item.doneHe} className="a-item">
                    <span aria-hidden="true" style={{ fontSize: "1.125rem" }}>
                      {item.done ? "✓︎" : "○︎"}
                    </span>
                    <span className="a-grow">
                      {item.done ? (
                        item.doneHe
                      ) : (
                        <Link href={item.href}>{item.doneHe}</Link>
                      )}
                    </span>
                    <span className="a-sr">{item.done ? "בוצע" : "עוד לא בוצע"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card title="השבוע" helpHe="טורקיז: תצורות שנבנו. אדום: הודעות שנשלחו אליך.">
            <div className="a-week" aria-hidden="true">
              {week.map((day, index) => (
                <div key={index}>
                  <span
                    style={{
                      blockSize: `${(day.drafts / peak) * 45}%`,
                      backgroundColor: "var(--admin-turquoise)",
                    }}
                  />
                  <span
                    style={{
                      blockSize: `${(day.leads / peak) * 45}%`,
                      backgroundColor: "var(--admin-red)",
                    }}
                  />
                  <small className="a-muted" style={{ textAlign: "center" }}>
                    {day.label}
                  </small>
                </div>
              ))}
            </div>
            <p className="a-muted" style={{ marginBlockStart: "0.75rem" }}>
              השבוע <bdi dir="ltr">{weekDrafts}</bdi> אנשים בנו משהו,{" "}
              <bdi dir="ltr">{weekLeadCount}</bdi> שלחו לך הודעה.
            </p>
          </Card>

          <Card
            title="הפניות האחרונות"
            actions={<LinkAction href="/admin/leads" size="sm" tone="quiet">כל הפניות</LinkAction>}
          >
            {(latestLeads ?? []).length === 0 ? (
              <p className="a-muted">אין פניות עדיין.</p>
            ) : (
              <ul className="a-list">
                {(latestLeads ?? []).map((lead) => (
                  <li key={lead._id} className="a-item">
                    <div className="a-grow" style={{ minInlineSize: 0 }}>
                      <Link href={`/admin/leads/${lead._id}`}>
                        {lead.titleHe || "פנייה"}
                      </Link>
                      <p className="a-muted">{relativeHe(lead.createdAt)}</p>
                    </div>
                    <Money agorot={lead.priceAgorot} strong announce={false} />
                    <Pill tone={leadStatusTone(lead.status)}>{LEAD_STATUS_HE[lead.status]}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
