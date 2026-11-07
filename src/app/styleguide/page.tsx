import type { Metadata } from "next";
import * as React from "react";

import { palette, role, shadow } from "@/lib/design/colors";
import { DURATION, EASE, LOOP, SPRING, STAGGER, travelDuration } from "@/lib/design/motion";
import { formatAgorot, priceLabel, spokenPrice } from "@/lib/format/price";

import { Bidi, FileName, Hex, LatinRun, Phone } from "@/components/ui/Bidi";
import { Button } from "@/components/ui/Button";
import { ChipBadge } from "@/components/ui/ChipBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LinkButton } from "@/components/ui/LinkButton";
import { Mark } from "@/components/ui/Mark";
import { Price } from "@/components/ui/Price";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Skeleton } from "@/components/ui/Skeleton";
import { TiltCard } from "@/components/ui/TiltCard";
import { TrustRow } from "@/components/ui/TrustRow";
import { Voxel } from "@/components/ui/Voxel";

/**
 * The design-system reference. Every primitive, in every state it can be put into
 * without a pointer or a keyboard, on one page a human can scroll.
 *
 * Not indexed and not linked from the site. It is also the one page exempt from the
 * one-red-object-per-viewport rule in doc 01 §5.1, because showing the red variants
 * beside each other is the entire point; `scripts/lint-red-rationing.mjs` skips it.
 */
export const metadata: Metadata = {
  title: "מדריך הרכיבים",
  robots: { index: false, follow: false, nocache: true },
};

/* ---------------------------------------------------------- page furniture */

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 [min-inline-size:0]">
      <div className="flex flex-col gap-1 [min-inline-size:0]">
        <h2
          className="font-[family-name:var(--font-rubik)]"
          style={{ fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.25 }}
        >
          {title}
        </h2>
        {note ? (
          <p
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "0.9375rem",
              lineHeight: 1.7,
              color: "var(--color-text-muted)",
              maxInlineSize: "34rem",
            }}
          >
            {note}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-5 [min-inline-size:0]">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-assistant), system-ui, sans-serif",
        fontSize: "0.8125rem",
        fontWeight: 600,
        letterSpacing: "0.005em",
        color: "var(--color-text-muted)",
      }}
    >
      {children}
    </p>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 [min-inline-size:0]">{children}</div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 [min-inline-size:0]"
      style={{
        backgroundColor: "var(--color-surface-raised)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

function Ramp({ name, steps }: { name: string; steps: Record<number, string> }) {
  return (
    <div className="flex flex-col gap-2 [min-inline-size:0]">
      <Label>{name}</Label>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1">
        {Object.entries(steps).map(([step, hex]) => (
          <div key={step} className="flex flex-col gap-1 [min-inline-size:0]">
            <span
              className="block"
              style={{
                blockSize: "3rem",
                backgroundColor: hex,
                borderRadius: "var(--radius-sm)",
                boxShadow: "inset 0 0 0 3px var(--color-ink-900)",
              }}
            />
            <span
              className="tabular-nums"
              style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const WHATSAPP_DEMO = "https://wa.me/000000000000";

/* ------------------------------------------------------------------ page */

export default function StyleguidePage() {
  return (
    <main
      className="mx-auto flex flex-col gap-16 [min-inline-size:0]"
      style={{
        maxInlineSize: "var(--spacing-content)",
        paddingInline: "var(--spacing-gutter)",
        paddingBlock: "var(--spacing-section)",
      }}
    >
      <header className="flex flex-col gap-4 [min-inline-size:0]">
        <Eyebrow>מערכת העיצוב</Eyebrow>
        <h1
          className="text-balance font-[family-name:var(--font-rubik)]"
          style={{ fontSize: "clamp(2rem, 1.45rem + 2.25vw, 3.25rem)", fontWeight: 800, lineHeight: 1 }}
        >
          הופך רעיונות לדברים <Mark tone="turquoise">אמיתיים</Mark>
        </h1>
        <p
          style={{
            fontFamily: "var(--font-assistant), system-ui, sans-serif",
            fontSize: "1.125rem",
            lineHeight: 1.7,
            color: "var(--color-text-secondary)",
            maxInlineSize: "34rem",
            textWrap: "pretty",
          }}
        >
          כל הרכיבים הבסיסיים של האתר, בכל מצב שאפשר להציג בלי עכבר ובלי מקלדת. העמוד
          חסום לאינדוקס ולא מקושר משום מקום.
        </p>
      </header>

      {/* ------------------------------------------------------ colour */}
      <Block
        title="פלטה"
        note="חמישה סולמות בני עשר צעדים, ועוד סולם אחד לבמת התלת ממד. כל צבע מגיע מ-globals.css, והקובץ הזה רק משקף אותו לטובת react-three-fiber."
      >
        <Ramp name="cream" steps={palette.cream} />
        <Ramp name="red" steps={palette.red} />
        <Ramp name="turq" steps={palette.turq} />
        <Ramp name="yellow" steps={palette.yellow} />
        <Ramp name="ink" steps={palette.ink} />
        <Ramp name="stage" steps={palette.stage} />

        <Card>
          <Label>תפקידים שנמדדו</Label>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))] gap-2">
            {(
              [
                ["accent · CTA", role.accent, role.textOnAccent, "4.84"],
                ["price tag", role.priceTagBg, role.priceTagText, "4.66"],
                ["play", role.play, role.textOnTurquoise, "7.87"],
                ["yellow", palette.yellow[400], role.textOnYellow, "11.40"],
                ["ink", role.surfaceInverse, role.textOnInverse, "17.62"],
                ["success", role.success, "#FFFCF7", "5.28"],
                ["warning", role.warningSoft, role.warningText, "7.01"],
                ["danger", role.dangerSoft, role.dangerStrong, "8.81"],
              ] as const
            ).map(([name, bg, fg, ratio]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 [min-inline-size:0]"
                style={{
                  backgroundColor: bg,
                  color: fg,
                  borderRadius: "var(--radius-sm)",
                  padding: "0.75rem 1rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                }}
              >
                <span className="[min-inline-size:0] truncate">{name}</span>
                <span className="tabular-nums">
                  <Bidi ltr>{ratio}</Bidi>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </Block>

      {/* ------------------------------------------------- type devices */}
      <Block
        title="שני המכשירים הטיפוגרפיים"
        note="הסימון והוקסל. הסימון עוטף מילה אחת ולא נשבר בשבירת שורה, והוקסל סוגר שורת כותרת במקום נקודה."
      >
        <Card>
          <Label>Mark · שלושת הגוונים</Label>
          <p
            className="font-[family-name:var(--font-rubik)]"
            style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.6 }}
          >
            <Mark tone="red">אדום</Mark> · <Mark tone="turquoise">טורקיז</Mark> ·{" "}
            <Mark tone="yellow">צהוב</Mark>
          </p>
          <Label>Mark · משיכה מונפשת מימין לשמאל</Label>
          <p
            className="font-[family-name:var(--font-rubik)]"
            style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.6 }}
          >
            מצאתי <Mark tone="yellow" animate>דרך</Mark> משלי
          </p>
          <Label>Mark · שורה צרה, כדי לראות שהמילה לא מתפצלת</Label>
          <p
            className="font-[family-name:var(--font-rubik)]"
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              lineHeight: 1.6,
              maxInlineSize: "13rem",
            }}
          >
            הופך רעיונות לדברים <Mark tone="turquoise">אמיתיים</Mark>
          </p>
        </Card>

        <Card>
          <Label>Voxel · הוקסל בשלושת הגוונים ובגודל עצמאי</Label>
          <p
            className="font-[family-name:var(--font-rubik)]"
            style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.3 }}
          >
            שורה אחת
            <Voxel tone="turquoise" />
            <br />
            שורה שנייה
            <Voxel tone="yellow" />
            <br />
            שורה שלישית
            <Voxel tone="ink" />
          </p>
          <Row>
            <Voxel tone="turquoise" size="1.5rem" />
            <Voxel tone="yellow" size="1.5rem" />
            <Voxel tone="ink" size="1.5rem" />
          </Row>
        </Card>

        <Card>
          <Label>Eyebrow</Label>
          <Eyebrow>מדפיס בתלת ממד, בן 13, ומקבל הזמנות</Eyebrow>
          <Eyebrow tone="play" voxelTone="yellow">
            קצת עליי
          </Eyebrow>
          <Eyebrow voxel={false}>בלי וקסל</Eyebrow>
        </Card>

        <Card>
          <Label>SectionHeading · רמות 1 עד 4, עם וקסל ועם קו</Label>
          <SectionHeading level={2} size={1} eyebrow="איך זה עובד" rule>
            הדגמים שלי
          </SectionHeading>
          <SectionHeading level={2}>איך זה עובד</SectionHeading>
          <SectionHeading level={3} voxel="yellow">
            מה כבר מודפס אצלי
          </SectionHeading>
          <SectionHeading level={4} voxel="none">
            בלי וקסל
          </SectionHeading>
          <SectionHeading level={2} align="center" rule>
            מה בא לכם שאדפיס
          </SectionHeading>
        </Card>
      </Block>

      {/* ------------------------------------------------------ buttons */}
      <Block
        title="כפתורים"
        note="ארבעה וריאנטים, שלושה גדלים, וכל המצבים שאפשר להקפיא. ריחוף, לחיצה ופוקוס דורשים עכבר או מקלדת, אז אותם בודקים ידנית כאן."
      >
        {(["accent", "ink", "play", "ghost"] as const).map((variant) => (
          <Card key={variant}>
            <Label>{`variant="${variant}"`}</Label>
            <Row>
              <Button variant={variant} size="lg">
                להפוך תמונה להדפסה
              </Button>
              <Button variant={variant} size="md">
                לראות דגמים
              </Button>
              <Button variant={variant} size="sm">
                לנקות סינון
              </Button>
            </Row>
            <Row>
              <Button variant={variant} state="loading" busyLabel="טוען תוכן">
                רגע אחד
              </Button>
              <Button variant={variant} state="success" successLabel="ההודעה הועתקה">
                ההודעה הועתקה
              </Button>
              <Button variant={variant} disabled>
                לא זמין עכשיו
              </Button>
            </Row>
          </Card>
        ))}

        <Card>
          <Label>fullWidth · כמו בסרגל הדביק במובייל</Label>
          <Button variant="accent" size="lg" fullWidth>
            לשלוח לשי בוואטסאפ
          </Button>
          <Button variant="ink" size="lg" fullWidth>
            לשלוח לשי בוואטסאפ
          </Button>
        </Card>

        <Card>
          <Label>LinkButton · אותה חזות, אלמנט עוגן</Label>
          <Row>
            <LinkButton href="/generator" variant="accent" size="lg">
              להפוך תמונה להדפסה
            </LinkButton>
            <LinkButton href="/products" variant="play">
              לראות דגמים
            </LinkButton>
            <LinkButton href={WHATSAPP_DEMO} variant="ink" newTab>
              לכתוב לשי בוואטסאפ
            </LinkButton>
            <LinkButton href="/products" variant="ghost" disabled>
              לא זמין עכשיו
            </LinkButton>
          </Row>
        </Card>
      </Block>

      {/* -------------------------------------------------------- price */}
      <Block
        title="מחיר"
        note="רק הספרות מבודדות ב-bdi, והיחידה נשארת בעברית. השם הנגיש יושב על אלמנט אחות מוסתר, כי bdi לא יכול לשאת שם."
      >
        <Card>
          <Label>size=&quot;huge&quot; · רגע חשיפת המחיר</Label>
          <Price agorot={45600} size="huge" tone="red" />
          <Label>size=&quot;lead&quot;</Label>
          <Price agorot={45600} size="lead" tone="ink" />
          <Label>size=&quot;inline&quot; · כרטיס מוצר</Label>
          <Price agorot={12400} size="inline" tone="ink" live={false} />
          <Label>size=&quot;sm&quot; · שורת פירוט</Label>
          <Price agorot={12400} size="sm" tone="ink" live={false} />
        </Card>

        <Card>
          <Label>tone=&quot;onRed&quot; · על תג המחיר האדום</Label>
          <div
            className="inline-flex w-fit items-baseline"
            style={{
              backgroundColor: "var(--color-price-tag-bg)",
              color: "var(--color-price-tag-text)",
              borderRadius: "var(--radius-lg)",
              padding: "0.75rem 1.25rem",
              boxShadow: "var(--shadow-pop)",
            }}
          >
            <Price agorot={45600} size="lead" tone="onRed" live={false} />
          </div>
          <Label>בתוך משפט עברי, כדי לוודא שהסדר לא מתהפך</Label>
          <p
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.0625rem",
              lineHeight: 1.75,
            }}
          >
            ההדפסה הזאת יוצאת <Price agorot={45600} size="sm" tone="ink" live={false} /> והיא מוכנה
            תוך שלושה ימים.
          </p>
          <Label>ההקראה, כטקסט</Label>
          <ul className="flex flex-col gap-1" style={{ fontSize: "0.9375rem" }}>
            {[100, 200, 4500, 124000].map((agorot) => (
              <li key={agorot} className="[min-inline-size:0]">
                <Bidi ltr>{formatAgorot(agorot)}</Bidi> · {priceLabel(agorot)} · {spokenPrice(agorot)}
              </li>
            ))}
          </ul>
        </Card>
      </Block>

      {/* --------------------------------------------------------- bidi */}
      <Block
        title="בידוד דו-כיווני"
        note="כל רצף שאינו עברי נכנס לעטיפה. בלי זה הפיסוק נודד לצד השני של המילה, וזה נראה תקין עד שמישהו עורך את המשפט."
      >
        <Card>
          <Label>Phone · המספר בדוגמה בלבד, המספר האמיתי מגיע משכבת הוואטסאפ</Label>
          <p style={{ fontFamily: "var(--font-assistant), system-ui, sans-serif", fontSize: "1.0625rem" }}>
            אפשר להתקשר אליי למספר <Phone e164="+972500000000" label="להתקשר לשי" /> בשעות הערב.
          </p>

          <Label>LatinRun · שם חומר לטיני בתוך משפט עברי</Label>
          <p style={{ fontFamily: "var(--font-assistant), system-ui, sans-serif", fontSize: "1.0625rem" }}>
            אני מדפיס ב<LatinRun>PLA Silk</LatinRun>, שזה חומר מבריק, ורואים את השכבות.
          </p>

          <Label>Hex · קוד צבע של פילמנט</Label>
          <Row>
            <Hex hex="#12bfb8" label="טורקיז בריכה" />
            <Hex hex="#f4f2ed" label="לבן ענן" />
            <Hex hex="#cff3b8" label="זוהר בחושך" />
          </Row>

          <Label>FileName · קיצור באמצע, כדי שהסיומת תישאר</Label>
          <ul className="flex flex-col gap-1" style={{ fontSize: "0.9375rem" }}>
            <li>
              <FileName name="IMG_20260907_lithophane_test_final.heic" />
            </li>
            <li>
              <FileName name="scan.jpg" />
            </li>
          </ul>
        </Card>
      </Block>

      {/* ------------------------------------------------------- chips */}
      <Block title="תגים" note="ספאן דקורטיבי, אף פעם לא כפתור, כי הכרטיס כולו כבר קישור אחד.">
        <Card>
          <Label>size=&quot;sm&quot;</Label>
          <Row>
            <ChipBadge tone="ink">חדש</ChipBadge>
            <ChipBadge tone="turquoise">3D</ChipBadge>
            <ChipBadge tone="yellow">זוהר בחושך</ChipBadge>
            <ChipBadge tone="red">מומלץ</ChipBadge>
            <ChipBadge tone="cream">ליתופן</ChipBadge>
          </Row>
          <Label>size=&quot;md&quot; · מצבים סמנטיים</Label>
          <Row>
            <ChipBadge tone="success" size="md">
              נשלח
            </ChipBadge>
            <ChipBadge tone="warning" size="md">
              חומר מיוחד
            </ChipBadge>
            <ChipBadge tone="danger" size="md">
              אזל
            </ChipBadge>
            <ChipBadge tone="turquoise" size="md" pop>
              נכנס עם pop
            </ChipBadge>
          </Row>
        </Card>
      </Block>

      {/* --------------------------------------------------- tilt cards */}
      <Block
        title="כרטיס מוטה"
        note="הכרטיס יושב מוטה במנוחה ומתיישר בריחוף ובפוקוס. חפץ עקום שמתיישר כשמושיטים אליו יד נקרא כמו חפץ שמגיב."
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(15rem,100%),1fr))] gap-6">
          <TiltCard rotate={-2} href="/products">
            <div className="flex flex-col gap-2 p-5 [min-inline-size:0]">
              <ChipBadge tone="turquoise">3D</ChipBadge>
              <p className="font-[family-name:var(--font-rubik)]" style={{ fontSize: "1.375rem", fontWeight: 700 }}>
                ליתופן מהתמונה שלכם
              </p>
              <Price agorot={12400} size="inline" live={false} />
            </div>
          </TiltCard>

          <TiltCard rotate={2} href="/products">
            <div className="flex flex-col gap-2 p-5 [min-inline-size:0]">
              <ChipBadge tone="yellow">זוהר בחושך</ChipBadge>
              <p className="font-[family-name:var(--font-rubik)]" style={{ fontSize: "1.375rem", fontWeight: 700 }}>
                תבליט בפילמנט זוהר
              </p>
              <Price agorot={16800} size="inline" live={false} />
            </div>
          </TiltCard>

          <TiltCard rotate={-3} frame>
            <div
              className="flex items-center justify-center [min-inline-size:0]"
              style={{ blockSize: "9rem", backgroundColor: "var(--color-cream-200)" }}
            >
              <Label>frame · מסגרת צילום 12px</Label>
            </div>
          </TiltCard>
        </div>
      </Block>

      {/* ---------------------------------------------------- trust row */}
      <Block title="שורת האמון" note="שלוש עובדות. בלי כוכבים ובלי המלצות, כי אין עדיין מה לצטט.">
        <Card>
          <TrustRow />
        </Card>
        <div
          className="[min-inline-size:0]"
          style={{
            backgroundColor: "var(--color-surface-inverse)",
            borderRadius: "var(--radius-xl)",
            padding: "1.25rem",
          }}
        >
          <TrustRow tone="onInverse" />
        </div>
      </Block>

      {/* --------------------------------------------------- empty state */}
      <Block title="מצב ריק" note="מסך המרה, ולכן הוא נושא את הפעולה של העמוד.">
        <EmptyState
          title="אין לי דגם כזה עדיין."
          body="אפשר לבקש ממני להדפיס בדיוק את מה שחיפשתם."
          illustration={
            <div className="flex items-end gap-1" aria-hidden="true">
              <Voxel tone="turquoise" size="2rem" />
              <Voxel tone="yellow" size="2.75rem" />
              <Voxel tone="ink" size="1.5rem" />
            </div>
          }
          actions={
            <>
              <LinkButton href={WHATSAPP_DEMO} variant="accent" newTab>
                לכתוב לשי בוואטסאפ
              </LinkButton>
              <Button variant="play">לנקות סינון</Button>
            </>
          }
        />
      </Block>

      {/* ------------------------------------------------------ skeleton */}
      <Block title="שלד טעינה" note="הפסים מוסתרים מקורא המסך. במקומם יש הודעה מנומסת אחת.">
        <Card>
          <Label>variant=&quot;line&quot;</Label>
          <Skeleton variant="line" lines={4} label="טוען תוכן" />
          <Label>variant=&quot;block&quot; · variant=&quot;circle&quot; · variant=&quot;chip&quot;</Label>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(12rem,100%),1fr))] gap-4">
            <Skeleton variant="block" height="8rem" />
            <Skeleton variant="circle" />
            <Skeleton variant="chip" />
          </div>
        </Card>
      </Block>

      {/* -------------------------------------------------------- motion */}
      <Block
        title="אוצר התנועה"
        note="הערכים שמייצאים ל-JS, כדי שאפשר יהיה להשוות אותם למה שיושב ב-globals.css."
      >
        <Card>
          <Label>עקומות</Label>
          <ul className="flex flex-col gap-1" style={{ fontSize: "0.875rem" }}>
            {Object.entries(EASE).map(([name, value]) => (
              <li key={name} className="[min-inline-size:0]">
                <LatinRun>{name}</LatinRun> · <LatinRun>{value}</LatinRun>
              </li>
            ))}
          </ul>

          <Label>סולם המשכים, במילישניות</Label>
          <p className="tabular-nums" style={{ fontSize: "0.875rem" }}>
            <Bidi ltr>{Object.values(DURATION).join(" · ")}</Bidi>
          </p>

          <Label>קפיצים</Label>
          <ul className="flex flex-col gap-1 tabular-nums" style={{ fontSize: "0.875rem" }}>
            {Object.entries(SPRING).map(([name, spring]) => (
              <li key={name} className="[min-inline-size:0]">
                <LatinRun>{name}</LatinRun> ·{" "}
                <Bidi ltr>{`${spring.stiffness} / ${spring.damping} / ${spring.mass}`}</Bidi>
              </li>
            ))}
          </ul>

          <Label>מדרגות ולולאות</Label>
          <p className="tabular-nums" style={{ fontSize: "0.875rem" }}>
            <Bidi ltr>{`stagger ${STAGGER.editorial} / ${STAGGER.grid}`}</Bidi> ·{" "}
            <Bidi ltr>{`loops ${Object.values(LOOP).join(" · ")}`}</Bidi> ·{" "}
            <Bidi ltr>{`travel(90px) = ${travelDuration(90)}`}</Bidi>
          </p>
        </Card>

        <Card>
          <Label>הצל הקשה, שהוא הצעצוע</Label>
          <Row>
            {(
              [
                ["pop", shadow.pop],
                ["popLg", shadow.popLg],
                ["popRed", shadow.popRed],
              ] as const
            ).map(([name, value]) => (
              <span
                key={name}
                className="inline-flex items-center justify-center"
                style={{
                  backgroundColor: "var(--color-cream-50)",
                  color: "var(--color-ink-900)",
                  borderRadius: "var(--radius-full)",
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  boxShadow: value,
                }}
              >
                {name}
              </span>
            ))}
          </Row>
        </Card>
      </Block>
    </main>
  );
}
