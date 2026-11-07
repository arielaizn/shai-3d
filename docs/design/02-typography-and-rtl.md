# 02 · מערכת הטיפוגרפיה וחוזה ה-RTL
**shai-3d · Hebrew type system + RTL implementation contract**
מסמך מחייב. כל מספר כאן הוא ערך סופי, לא הצעה. מי שבונה מיישם אחד לאחד.

קשור: `docs/design/01-*` (צבע ומרחב), `docs/design/03-*` (קומפוננטות).
ערכי הצבע שמופיעים כאן זהים לפלטה הנעולה: `--cream #FFF7EC`, `--red #F5333F`, `--turquoise #12BFB8`, `--yellow #FFC531`, `--ink #1A1420`.

---

## 1. הזוג: Rubik + Assistant

| תפקיד | פונט | רישיון | צירים | תת-קבוצות |
|---|---|---|---|---|
| display (כותרות, מחיר, כפתורים, overline) | **Rubik** (Hubert & Fischer; עברית: מאיר סדן) | OFL 1.1 | variable `wght 300..900` | `hebrew`, `latin` |
| text (גוף, תוויות טופס, טבלאות אדמין) | **Assistant** (בן נתן) | OFL 1.1 | variable `wght 200..800` | `hebrew`, `latin` |

**למה זה קורא כמו חנות צעצועים.** ל-Rubik יש פינות מעוגלות אמיתיות על צורות גיאומטריות שמנות, ובעברית ב-800 האותיות ם/ס/ט נראות כמו לבנים של קוביות משחק; Assistant מתחתיה שקטה והומניסטית ולא מושכת תשומת לב, אז כל המשקל הרגשי נשאר בכותרת ובמחיר. פונט דיספליי עם סריפים, קונטרסט גבוה או פינות חדות היה מחזיר את האתר לטריטוריית "סטודיו מלאכה", וזה בדיוק מה שנפסל.

**מה נפסל ולמה, כדי שלא יחזור לדיון:**
- Varela Round: העיגול נכון, יש רק משקל 400. אין דיספליי.
- Heebo: הלטינית שלו היא Roboto, נקייה וקורפורטיבית.
- Secular One: כבד ויפה, משקל בודד ובלי variable.
- Fredoka: העיגול הכי חזק, כיסוי העברית שלו לא יציב מספיק כדי לשים עליו את כל הכותרות.

### 1.1 טעינה: `src/lib/fonts.ts`

```ts
import { Rubik, Assistant } from "next/font/google";

// variable font: משמיטים weight בכוונה כדי לקבל את כל טווח ה-wght בקובץ אחד
export const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  style: ["normal"],            // בלי italic. לעולם.
  variable: "--font-rubik",
  display: "swap",
  preload: true,
  adjustFontFallback: false,    // הכיול האוטומטי מחושב ממטריקות לטיניות ומכווץ את העברית
  fallback: ["Rubik Fallback"], // ה-@font-face הידני בסעיף 1.2
});

export const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  style: ["normal"],
  variable: "--font-assistant",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
  fallback: ["Assistant Fallback"],
});
```

`src/app/layout.tsx`:

```tsx
import { rubik, assistant } from "@/lib/fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${assistant.variable}`}>
      <body className="bg-cream text-ink font-text antialiased">{children}</body>
    </html>
  );
}
```

`next/font/google` מוריד את הקבצים ב-build ומגיש אותם מהדומיין שלנו. אין קריאה ל-`fonts.googleapis.com` בזמן ריצה, וזה קריטי כי חלק גדול מהתנועה מגיע מ-webview של אינסטגרם ושל וואטסאפ.

**תקציב:** שני variable fonts, שתי תת-קבוצות כל אחד, סה"כ **עד 120KB woff2**. נמדד מפלט `next build`. חריגה מזה = להוריד את `latin` מ-Assistant ולתת ללטינית ליפול ל-Rubik.

### 1.2 מחסנית הנפילה: `src/app/globals.css`

```css
/* מטריקות Rubik: unitsPerEm 1000, hhea ascent 935, descent -260, lineGap 0.
   לאמת לפני שינוי:
   python3 -c "from fontTools.ttLib import TTFont; f=TTFont('rubik.woff2'); \
   print(f['hhea'].ascent, f['hhea'].descent, f['head'].unitsPerEm)" */
@font-face {
  font-family: "Rubik Fallback";
  src: local("Arial Hebrew"), local("Segoe UI"), local("Noto Sans Hebrew"), local("Arial");
  size-adjust: 102%;
  ascent-override: 93.5%;
  descent-override: 26%;
  line-gap-override: 0%;
}

/* מטריקות Assistant: unitsPerEm 1000, ascent 1050, descent -250 */
@font-face {
  font-family: "Assistant Fallback";
  src: local("Arial Hebrew"), local("Segoe UI"), local("Noto Sans Hebrew"), local("Arial");
  size-adjust: 98%;
  ascent-override: 105%;
  descent-override: 25%;
  line-gap-override: 0%;
}

html {
  -webkit-text-size-adjust: 100%;   /* חובה: webview של אינסטגרם מנפח טקסט בלי זה */
  text-size-adjust: 100%;
  font-kerning: normal;
  font-synthesis: weight;           /* מותר בולד מסונתז, אסור נטוי מסונתז */
  hyphens: none;                    /* עברית לא עוברת מיקוף. אף פעם. */
}
```

`font-synthesis: weight` הוא הסעיף שמונע את התאונה הגדולה: אם מישהו יכתוב `font-style: italic` על עברית, הדפדפן ייצור הטיה מכנית של האותיות והן נשברות. הכלל בסעיף 6 אוסר על זה גם ברמת ה-CSS.

### 1.3 טוקני משפחה ב-Tailwind v4

```css
@theme {
  --font-display: var(--font-rubik), "Rubik Fallback", "Arial Hebrew", "Segoe UI", Arial, sans-serif;
  --font-text: var(--font-assistant), "Assistant Fallback", "Arial Hebrew", "Segoe UI", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace; /* רק hex ושמות קבצים */
}
```
נוצרות מזה `font-display`, `font-text`, `font-mono`.

---

## 2. הסקאלה

בסיס 17px (`1.0625rem`) ולא 16px: עברית ב-Rubik/Assistant יושבת נמוך יותר מלטינית באותו גודל נומינלי, ו-17 הוא הגודל שבו טקסט גוף בעברית נקרא בנוחות בטלפון.
כל ה-clamp מחושב על טווח viewport של **390px עד 1280px**. מובייל-first, כי רוב הכניסות מגיעות מקישור בסטורי.

| טוקן | min | max | clamp | line-height | letter-spacing | weight | face |
|---|---|---|---|---|---|---|---|
| `display-hero` | 2.75rem / 44px | 6.5rem / 104px | `clamp(2.75rem, 1.11rem + 6.74vw, 6.5rem)` | 0.94 | 0 | 800 | display |
| `display` | 2.25rem / 36px | 4.25rem / 68px | `clamp(2.25rem, 1.37rem + 3.6vw, 4.25rem)` | 0.96 | 0 | 800 | display |
| `h1` | 2rem / 32px | 3.25rem / 52px | `clamp(2rem, 1.45rem + 2.25vw, 3.25rem)` | 1.0 | 0 | 700 | display |
| `h2` | 1.625rem / 26px | 2.5rem / 40px | `clamp(1.625rem, 1.24rem + 1.57vw, 2.5rem)` | 1.08 | 0 | 700 | display |
| `h3` | 1.375rem / 22px | 1.75rem / 28px | `clamp(1.375rem, 1.21rem + 0.67vw, 1.75rem)` | 1.25 | 0 | 700 | display |
| `h4` | 1.125rem / 18px | 1.25rem / 20px | `clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem)` | 1.4 | 0 | 600 | display |
| `body-lg` | 1.125rem / 18px | 1.25rem / 20px | `clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem)` | 1.7 | 0 | 400 | text |
| `body` | 1.0625rem / 17px | קבוע | ללא clamp | 1.75 | 0 | 400 | text |
| `body-sm` | 0.9375rem / 15px | קבוע | ללא clamp | 1.7 | 0 | 400 | text |
| `caption` | 0.8125rem / 13px | קבוע | ללא clamp | 1.55 | 0.005em | 500 | text |
| `overline` | 0.75rem / 12px | קבוע | ללא clamp | 1.4 | 0.06em | 700 | display |
| `button` | 1.1875rem / 19px | קבוע | ללא clamp | 1.15 | 0.01em | 800 | display |
| `button-sm` | 1rem / 16px | קבוע | ללא clamp | 1.15 | 0.01em | 700 | display |
| `price-tag-huge` | 3rem / 48px | 5.5rem / 88px | `clamp(3rem, 1.9rem + 4.49vw, 5.5rem)` | 0.9 | 0 | 900 | display |

טקסט גוף לא נוזלי בכוונה. גודל גוף שמשתנה עם הרוחב יוצר שורות שמשנות אורך בלי סיבה ומקשה על בדיקות; רק הכותרות והמחיר זזים.

### 2.1 למה המספרים האלה שונים מסקאלה לטינית

**Line-height. שתי הפרשים לשני קצוות:**

בגדלים גדולים העברית מרשה **יותר צפוף** מלטינית. אין עליות (ascenders) שמתנגשות עם הירידות של השורה מעליה, ולכן `0.94` על כותרת ראשית בעברית נראה נעול ומכוון, בעוד באנגלית אותו ערך היה מרסק את ה-l וה-h אל תוך ה-g של השורה שמעל. הרצפה המוחלטת היא **0.92**. מתחת לזה ק/ן/ך/ף/ץ נוגעות בשורה הבאה.

בגדלים קטנים העברית דורשת **הרבה יותר אוויר** מלטינית. הכתב מלבני, בגובה אחיד וכמעט בלי מרווחים פנימיים לבנים, אז גוש טקסט עברי נראה כהה ודחוס יותר מגוש לטיני זהה. גוף לטיני חי טוב ב-1.5; **גוף עברי מקבל 1.75**, ו-15px מקבל 1.7. פחות מ-1.6 בגוף עברי נקרא כמו חומה.

**החריג היחיד:** שורת דיספליי שמכילה רצף לטיני (למשל `PLA` או `3D`) מקבלת מחסנית עליות+ירידות לטינית ולכן `line-height: 1.02`. יש לזה מחלקה: `.has-latin`. משתמשים בה על כל כותרת שיש בה מילה לטינית.

**Letter-spacing.** אפס. על כל טוקן שמכיל עברית.
- **מרווח שלילי אסור בעברית באופן מוחלט.** בלטינית `-0.02em` על דיספליי מהדק את המילה; בעברית זה סוגר את הצורות הסגורות (ם, ס, ט, ע) ומדביק ר ל-ד עד שהן נקראות כאות אחת. אין מקרה שבו זה מותר, כולל בכותרת הענקית.
- מרווח חיובי מותר רק ב-`overline` (0.06em) וב-`caption` (0.005em), כלומר רק בגדלים שבהם הפתיחה עוזרת להפריד מילים קצרות. בשום מקום אחר.
- מחלקת עזר יחידה למרווח שלילי: `.latin-tight { letter-spacing: -0.01em }` ומותר להשתמש בה **רק** על אלמנט עם `lang="en"` שכולו לטיני.

**משקלים.** 800 ו-900 נעולים לגדלים **2rem ומעלה**. בעברית משקל 800 ב-18px סותם את החורים הפנימיים והמילה הופכת לכתם. הכלל: 900 מופיע פעם אחת בעמוד, על המחיר בלבד. אותה חשיבה כמו האדום שמופיע פעם אחת במסך.

### 2.2 טוקנים ב-Tailwind v4 · `src/app/globals.css`

```css
@theme {
  --text-display-hero: clamp(2.75rem, 1.11rem + 6.74vw, 6.5rem);
  --text-display-hero--line-height: 0.94;
  --text-display-hero--letter-spacing: 0em;
  --text-display-hero--font-weight: 800;

  --text-display: clamp(2.25rem, 1.37rem + 3.6vw, 4.25rem);
  --text-display--line-height: 0.96;
  --text-display--letter-spacing: 0em;
  --text-display--font-weight: 800;

  --text-h1: clamp(2rem, 1.45rem + 2.25vw, 3.25rem);
  --text-h1--line-height: 1;
  --text-h1--letter-spacing: 0em;
  --text-h1--font-weight: 700;

  --text-h2: clamp(1.625rem, 1.24rem + 1.57vw, 2.5rem);
  --text-h2--line-height: 1.08;
  --text-h2--letter-spacing: 0em;
  --text-h2--font-weight: 700;

  --text-h3: clamp(1.375rem, 1.21rem + 0.67vw, 1.75rem);
  --text-h3--line-height: 1.25;
  --text-h3--letter-spacing: 0em;
  --text-h3--font-weight: 700;

  --text-h4: clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem);
  --text-h4--line-height: 1.4;
  --text-h4--letter-spacing: 0em;
  --text-h4--font-weight: 600;

  --text-body-lg: clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem);
  --text-body-lg--line-height: 1.7;

  --text-body: 1.0625rem;
  --text-body--line-height: 1.75;

  --text-body-sm: 0.9375rem;
  --text-body-sm--line-height: 1.7;

  --text-caption: 0.8125rem;
  --text-caption--line-height: 1.55;
  --text-caption--letter-spacing: 0.005em;
  --text-caption--font-weight: 500;

  --text-overline: 0.75rem;
  --text-overline--line-height: 1.4;
  --text-overline--letter-spacing: 0.06em;
  --text-overline--font-weight: 700;

  --text-button: 1.1875rem;
  --text-button--line-height: 1.15;
  --text-button--letter-spacing: 0.01em;
  --text-button--font-weight: 800;

  --text-button-sm: 1rem;
  --text-button-sm--line-height: 1.15;
  --text-button-sm--letter-spacing: 0.01em;
  --text-button-sm--font-weight: 700;

  --text-price-huge: clamp(3rem, 1.9rem + 4.49vw, 5.5rem);
  --text-price-huge--line-height: 0.9;
  --text-price-huge--letter-spacing: 0em;
  --text-price-huge--font-weight: 900;
}
```

שימוש: `class="text-display-hero font-display text-balance"`.

### 2.3 אורך שורה ושבירה

```css
@layer base {
  .measure-hero  { max-inline-size: 15ch; }   /* כותרת ראשית, 2 עד 3 שורות */
  .measure-head  { max-inline-size: 24ch; }   /* h1 עד h3 */
  .measure-prose { max-inline-size: 34rem; }  /* גוף: כ-58 תווים עבריים ב-17px */
  .measure-card  { max-inline-size: 26rem; }

  h1, h2, h3, .text-display-hero, .text-display { text-wrap: balance; }
  p, li { text-wrap: pretty; }
}
```
`text-wrap: balance` על כותרות מונע שורה אחרונה עם מילה בודדת, וזה בעברית קריטי כי מילה יתומה בקצה השמאלי נראית כמו באג.

### 2.4 ספרות

```css
@layer base {
  body { font-variant-numeric: lining-nums proportional-nums; }
  .tnum, .price, table td, .stepper input, input[type="number"] {
    font-variant-numeric: lining-nums tabular-nums;
  }
}
```
`tabular-nums` בכל מקום שמספר משתנה בזמן אמת: המחיר במחולל, הסטפר של הכמות, טבלאות האדמין. בלי זה המחיר קופץ ברוחב באנימציית הספירה והרגע הגדול של האתר מרגיש רעוע.

### 2.5 ניקוד

ניקוד מותר במקום אחד: ציטוט בעמוד הסיפור. הכללים: פונט הטקסט (Assistant) בלבד, `line-height: 2.0`, גודל `body-lg` ומעלה. אין ניקוד ב-Rubik בגדלי דיספליי ואין ניקוד בטקסט ממשק. מחלקה: `.has-nikud { line-height: 2; font-family: var(--font-text); }`

---

## 3. שני המכשירים הטיפוגרפיים של האתר

שני מכשירים. לא שלושה. הם החתימה של האתר ולכן הם צריכים להיות ניתנים לזיהוי בשנייה.

### 3.1 מכשיר א׳: הסימון (`Mark`)

טוש שמסמן **מילה אחת** בתוך כותרת. הרעיון מגיע מהמלבן המג׳נטה של pop.vibeliner, אבל שם זה מלבן מכני עם רדיוס אחיד. שלנו הוא **משיחה**: ארבע פינות עם רדיוסים אליפטיים שונים, כך שהצורה קוראת כמו משהו שנמשח ולא כמו תיבה שנוצרה בקוד.

```css
/* src/styles/type-devices.css */
.mark {
  --mark-bg: var(--color-red);
  --mark-fg: #FFFFFF;
  position: relative;
  display: inline;
  white-space: nowrap;               /* מילה אחת. לא נשברת. לעולם. */
  color: var(--mark-fg);
  background-color: var(--mark-bg);
  padding-inline: 0.22em;
  padding-block: 0.04em 0.12em;      /* אסימטרי: לירידות ק/ן/ך/ף/ץ צריך יותר למטה */
  margin-inline: 0.04em;
  border-radius: 0.62em 0.26em 0.55em 0.30em / 0.42em 0.52em 0.36em 0.46em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transform: rotate(calc(var(--flip, 1) * -1.5deg));
  transform-origin: center;
  /* הטקסט המסומן לא צריך את התיקון האופטי של Rubik בגדלים ענקיים */
  padding-top: 0.02em;
}

.mark--turquoise { --mark-bg: var(--color-turquoise); --mark-fg: var(--color-ink); }
.mark--yellow    { --mark-bg: var(--color-yellow);    --mark-fg: var(--color-ink); }
```

**גיאומטריה מדויקת:** גובה הצורה יוצא מ-`padding-block` היחסי, אז היא מתרחבת עם הכותרת ולא צריכה גרסאות לגדלים שונים. הטיה של 1.5 מעלות היא הערך המקסימלי שלא מייצר מדרגה גלויה בשורת הטקסט שמסביב. הרדיוסים האליפטיים האסימטריים הם מה שעושה את ההבדל בין "טוש" ל"תג".

**התנהגות בשבירת שורה.** שתי הגנות שפועלות יחד:
1. `white-space: nowrap` על הסימון עצמו. מילה מסומנת אף פעם לא מתפצלת באמצע.
2. `box-decoration-break: clone`. אם בכל זאת יגיע לשם ביטוי של שתי מילים, כל שורה תקבל רקע שלם עם פינות מעוגלות משלה במקום מלבן חתוך.
3. אם המילה המסומנת נופלת לבד לשורה חדשה, זו שגיאת עריכה. הפתרון הוא לקצר את הכותרת, לא לשנות את המכשיר.

**כניסה מונפשת** (רק על הכותרת הראשית, פעם אחת בטעינה, מכובה תחת `prefers-reduced-motion`):

```css
.mark--animate {
  clip-path: inset(0 0 0 100%);              /* RTL: המשיחה מתחילה מימין */
  animation: mark-swipe 420ms cubic-bezier(.2,.8,.2,1) 320ms forwards;
}
[dir="ltr"] .mark--animate { clip-path: inset(0 100% 0 0); }
@keyframes mark-swipe { to { clip-path: inset(0 0 0 0); } }
@media (prefers-reduced-motion: reduce) {
  .mark--animate { clip-path: none; animation: none; }
}
```
כיוון המשיחה הוא מימין לשמאל כי זו כתיבה בעברית. זה הפרט שהופך אותו לשלנו.

**חוק תדירות:** סימון אחד לכל מסך שנגלל. לכל היותר **שלושה בעמוד**. אף פעם לא שניים באותה כותרת, אף פעם לא בטקסט גוף, אף פעם לא על קישור או על כפתור, אף פעם לא על מספר או על מחיר. אדום הוא ברירת המחדל; טורקיז מותר על רקע קרם כשהאדום כבר תפוס באותו מסך על ה-CTA.

`src/components/type/Mark.tsx`:

```tsx
export function Mark({
  children, tone = "red", animate = false,
}: { children: string; tone?: "red" | "turquoise" | "yellow"; animate?: boolean }) {
  return (
    <span className={`mark mark--${tone} ${animate ? "mark--animate" : ""}`}>{children}</span>
  );
}
```
ה-prop הוא `children: string` בכוונה, כדי ש-TypeScript יחסום הכנסה של פסקה שלמה לתוך הסימון.

### 3.2 מכשיר ב׳: הפיקסל המודפס (`Dot`)

ב-gutzim יש נקודה צבעונית אחרי כל שורת כותרת. אצלנו זו לא נקודה: זה **ריבוע קטן עם פינות מעוגלות**, כלומר וקסל, השכבה הראשונה שיוצאת מהמדפסת. אותה צורה בדיוק חוזרת כתבליט (bullet) בשורת ה-overline, וכך שני האלמנטים מדברים אותה שפה.

```css
.dot {
  display: inline-block;
  inline-size: 0.26em;
  block-size: 0.26em;
  border-radius: 0.07em;                     /* וקסל, לא עיגול */
  background: var(--color-turquoise);
  margin-inline-start: 0.09em;               /* לוגי: נופל בקצה השמאלי בעברית */
  vertical-align: baseline;
  transform: rotate(-6deg) translateY(0.015em);
}
.dot--yellow { background: var(--color-yellow); }
.dot--ink    { background: var(--color-ink); }
.dot-wrap    { white-space: nowrap; }        /* המילה האחרונה + הנקודה = יחידה אחת */
```

**למה אלמנט ולא תו נקודה.** תו `.` בסוף משפט עברי נשלט על ידי אלגוריתם ה-bidi, ואם השורה נגמרת ברצף לטיני או במספר הוא קופץ לצד הלא נכון. אלמנט inline נשלט על ידי כיוון הזרימה של הבלוק וגם לא נכנס להעתקה, לא מוקרא במסך קורא ולא זולג להודעת הוואטסאפ. הצורה נשארת יציבה בכל הקשר.

**התנהגות בשבירת שורה.** הנקודה חייבת להיות באותה שורה עם המילה האחרונה. `Headline` עושה את זה אוטומטית:

`src/components/type/Headline.tsx`:

```tsx
import { Dot } from "./Dot";

/** מפצל את המילה האחרונה ועוטף אותה עם הנקודה ב-nowrap */
export function Headline({
  as: Tag = "h2", children, dotTone = "turquoise", className = "",
}: { as?: "h1" | "h2" | "h3" | "p"; children: string; dotTone?: "turquoise" | "yellow" | "ink"; className?: string }) {
  const words = children.trim().split(" ");
  const last = words.pop()!;
  return (
    <Tag className={className}>
      {words.length ? words.join(" ") + " " : ""}
      <span className="dot-wrap">{last}<Dot tone={dotTone} /></span>
    </Tag>
  );
}
```

**חוק תדירות:** הנקודה מסיימת שורת דיספליי או h1/h2 בלבד. מותרות לכל היותר שתי שורות עוקבות שמסתיימות בנקודה (כמו בהירו: שתי שורות, שתי נקודות). אסורה על h3, h4, גוף, כפתורים, תוויות טופס ופריטי ניווט. הצבע: טורקיז כברירת מחדל, צהוב **רק** על כותרת רגע חשיפת המחיר, אדום אף פעם, כי אדום שמור ל-CTA ולמחיר ונקודה אדומה תתחרה בהם.

### 3.3 ה-overline משתמש באותו וקסל

```tsx
// src/components/type/Overline.tsx
export function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-overline font-display text-ink-muted flex items-center gap-2">
      <span className="dot" aria-hidden="true" />
      {children}
    </p>
  );
}
```
במקום הסימן ✦ של gutzim. סימן נוצץ שייך לחנות מתנות; וקסל שייך למדפסת של שי.

---

## 4. חוזה ה-RTL

### 4.1 היכן יושב `dir`

`dir="rtl"` מוצהר **פעם אחת בלבד**, על `<html>` ב-`src/app/layout.tsx`, יחד עם `lang="he"`. אין `dir` על מיכלים פנימיים. ההיפוכים היחידים שמותר להצהיר הם על רצף מבודד שמוגדר בסעיף 4.4, וכולם ארוזים בקומפוננטה ולא נכתבים ידנית ב-JSX של עמוד.

פנל האדמין יושב על אותו `dir="rtl"`. אין מסך LTR באתר הזה.

**Radix / Headless portals:** כל תת-עץ של Radix מטביע `dir="ltr"` על עצמו אם לא אומרים לו אחרת. עוטפים את האפליקציה:

```tsx
// src/app/providers.tsx
import { DirectionProvider } from "@radix-ui/react-direction";
export function Providers({ children }: { children: React.ReactNode }) {
  return <DirectionProvider dir="rtl">{children}</DirectionProvider>;
}
```
כל דיאלוג, dropdown, tooltip ו-toast שמוגש דרך portal אל `document.body` נבדק ידנית אחרי ההוספה. זה הבאג שחוזר בכל פרויקט RTL.

**react-three-fiber:** ה-canvas לא מושפע מכיוון, אבל כל שכבת HTML מעליו (`<Html>` של drei, כפתורי הבקרה, תווית "גרור לסיבוב") היא DOM רגיל וכפופה לכל הכללים כאן. כפתורי הסיבוב מקבלים אייקון מראה לפי סעיף 4.3.

### 4.2 תכונות לוגיות מול פיזיות

**חובה לוגי. אלה היחידים שמותר לכתוב:**

| במקום | כותבים |
|---|---|
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `left-*` / `right-*` | `start-*` / `end-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `border-l` / `border-r` | `border-s` / `border-e` |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` |
| `float-left` / `float-right` | `float-start` / `float-end` |
| `space-x-*` | `flex gap-*` |
| `w-*` / `h-*` על מיכל טקסט | `inline-size` / `block-size` |

`space-x-*` אסור לחלוטין. משתמשים ב-`gap`.

**נשאר פיזי, וחייב היפוך ידני:**

| מקרה | הטיפול |
|---|---|
| `box-shadow` / `drop-shadow` | היסט x חייב להיות **0** בכל צל במערכת. אם עיצוב דורש היסט צדדי, מכפילים ב-`var(--flip)`. |
| `translateX` באנימציות | `transform: translateX(calc(var(--flip) * 1rem))` |
| `background-position` | להעדיף `center`; אחרת שני ערכים תחת `[dir="rtl"]` |
| גרדיאנט לינארי בזווית | לשקף את הזווית: `135deg` הופך ל-`225deg` |
| `clip-path` של הסימון | מוגדר לשני הכיוונים בסעיף 3.1 |
| SVG של אייקון כיווני | `scaleX(-1)`, סעיף 4.3 |
| `scroll-snap` + חצי קרוסלה | החץ "הבא" מצביע **שמאלה** בעברית |

```css
:root { --flip: 1; }
[dir="rtl"] { --flip: -1; }
```

### 4.3 אייקונים כיווניים

```css
[dir="rtl"] .icon-directional { transform: scaleX(-1); }
```
מקבלים `.icon-directional`: חץ הבא/הקודם בשלבי המחולל, חץ ה-CTA, חצי הקרוסלה, אייקון השיתוף, אייקון החזרה. **לא** מקבלים: לוגו וואטסאפ, אייקון מדפסת, אייקון הורדה, שעון, וי, איקס, אייקון מצלמה. אייקון שהוא סמל מותג או צורה סימטרית אף פעם לא מתהפך.

### 4.4 בידוד bidi: כל מקרה מעורב באתר הזה

הכלל: **כל רצף שאינו עברי מבודד בעטיפה, בלי יוצא מן הכלל.** `<bdi>` הוא ברירת המחדל כי הוא מספק `unicode-bidi: isolate` בלי CSS.

```css
bdi, .bidi { unicode-bidi: isolate; }
.ltr-run  { direction: ltr; unicode-bidi: isolate; }
```

#### א. מספר הטלפון

בטקסט: `058-584-5083`. בקישור: `+972585845083`. המקפים והפלוס הם תווים ניטרליים ובלי בידוד הם קופצים לצד הלא נכון בתוך משפט עברי.

```tsx
// src/components/bidi/PhoneLink.tsx
export const PHONE_E164 = "+972585845083";
export const PHONE_DISPLAY = "058-584-5083";

export function PhoneLink({ className = "" }: { className?: string }) {
  return (
    <a href={`tel:${PHONE_E164}`} className={className} aria-label="להתקשר לשי">
      <bdi dir="ltr">{PHONE_DISPLAY}</bdi>
    </a>
  );
}
```
`+972` מופיע רק ב-`href` וב-`wa.me`, אף פעם לא על המסך.

#### ב. מחירים בשקלים

הרכבה ידנית מ-`formatToParts`, ולא שרשור מחרוזות, כי הפורמט הגולמי של `he-IL` מחזיר גם סימני כיוון וגם מיקום סמל שמשתנה בין גרסאות ICU. אנחנו מחליטים על המראה ונועלים אותו.

```ts
// src/lib/format/price.ts
const ils = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  currencyDisplay: "narrowSymbol",   // ₪ ולא ILS
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,          // אין אגורות. המחירים שלמים.
  useGrouping: true,                 // 1,240
  numberingSystem: "latn",           // ספרות מערביות, נעול
});

/** מחזיר רק את המספר עם מפריד האלפים, בלי הסמל ובלי סימני כיוון */
export function priceDigits(value: number): string {
  return ils.formatToParts(Math.round(value))
    .filter((p) => p.type === "integer" || p.type === "group")
    .map((p) => p.value)
    .join("");
}
```

```tsx
// src/components/bidi/Price.tsx
import { priceDigits } from "@/lib/format/price";

export function Price({ value, size = "huge" }: { value: number; size?: "huge" | "inline" }) {
  const digits = priceDigits(value);
  return (
    <bdi
      dir="ltr"
      className={size === "huge"
        ? "price text-price-huge font-display text-red"
        : "price text-h3 font-display text-ink"}
      aria-label={`${digits} שקלים`}
    >
      <span className="price__sym" aria-hidden="true">₪</span>
      <span className="price__num" aria-hidden="true">{digits}</span>
    </bdi>
  );
}
```

```css
.price__sym {
  font-size: 0.52em;      /* הסמל קטן מהספרות. הסכום הוא הגיבור. */
  font-weight: 800;
  margin-inline-end: 0.06em;
  vertical-align: 0.28em; /* מיושר לגובה הספרות, לא לבסיס */
}
```
`dir="ltr"` על העטיפה נותן סדר קבוע: הסמל משמאל לספרות, `₪249`, בכל הקשר ובכל דפדפן. `<bdi>` מונע מהמחיר להשפיע על סדר המשפט העברי סביבו. `aria-label` על העטיפה עם `aria-hidden` על שני החלקים נותן הקראה נכונה במקום "שקל חדש מאתיים ארבעים ותשע" הפוך.

#### ג. שמות פילמנט וחומר באנגלית

השדות ב-Convex: `filaments.nameHe` (עברית, מוצג), `filaments.nameEn` (לטיני, מוצג לצד), `filaments.hex`. הערכים נשמרים **נקיים**, בלי סימני כיוון בבסיס הנתונים. הבידוד קורה ברינדור בלבד.

```tsx
// src/components/bidi/Bidi.tsx
export function Bidi({ children, ltr = false }: { children: React.ReactNode; ltr?: boolean }) {
  return <bdi {...(ltr ? { dir: "ltr" as const } : {})}>{children}</bdi>;
}
```
שימוש: `אני מדפיס את זה ב<Bidi ltr>PLA Silk</Bidi> ורואים את השכבות.`
מילה לטינית בודדת בתוך משפט עברי בלי `<bdi>` נראית תקינה עד שמישהו יוסיף אחריה פסיק או סוגר, ואז הפיסוק מהגר לצד השני של המילה. לכן זה חובה גם על מילה אחת.

#### ד. שמות קבצים

```tsx
// src/components/bidi/FileName.tsx
export function truncateMiddle(name: string, max = 26): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const head = name.slice(0, max - ext.length - 3);
  return `${head}...${ext}`;
}

export function FileName({ name }: { name: string }) {
  return (
    <bdi dir="ltr" className="font-mono text-caption ltr-run" title={name}>
      {truncateMiddle(name)}
    </bdi>
  );
}
```
קיצור באמצע ולא בסוף, כי הסיומת היא המידע שהמשתמש צריך (`.jpg` מול `.heic` בהעלאה מאייפון). `truncate` רגיל עם ellipsis היה מוחק בדיוק אותה.

#### ה. קודי hex

```tsx
// src/components/bidi/HexChip.tsx
export function HexChip({ hex, label }: { hex: string; label?: string }) {
  const value = hex.toUpperCase();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-3 rounded-[3px] border border-ink/15" style={{ background: value }} />
      {label ? <span>{label}</span> : null}
      <bdi dir="ltr" className="font-mono text-caption ltr-run">{value}</bdi>
    </span>
  );
}
```
`#` הוא תו ניטרלי. בלי `dir="ltr"` בתוך משפט עברי הוא נוחת אחרי הספרות ומקבלים `F5333F#`.

#### ו. הודעת הוואטסאפ מראש

זה טקסט רגיל בלי DOM, אז הבידוד נעשה בתווי Unicode. וואטסאפ קובע כיוון **לכל שורה בנפרד** לפי התו החזק הראשון בה, ולכן שורה שמתחילה במספר או ב-`PLA` תרונדר LTR והעברית בה תישבר.

```ts
// src/lib/bidi.ts
// escape sequences ולא תווים מודבקים: התווים האלה בלתי נראים ונמחקים בהעתקה
export const RLM = "\u200F"; // Right-to-Left Mark
export const LRM = "\u200E"; // Left-to-Right Mark
export const FSI = "\u2068"; // First Strong Isolate
export const PDI = "\u2069"; // Pop Directional Isolate

/** עוטף רצף לטיני או מספרי כדי שלא ישבור את כיוון השורה */
export const iso = (v: string | number) => `${FSI}${v}${PDI}`;

/** כל שורה נפתחת ב-RLM כדי לנעול אותה כשורה עברית */
export const rtlLines = (lines: string[]) => lines.map((l) => RLM + l).join("\n");
```

```ts
// src/lib/format/whatsapp.ts
import { rtlLines, iso } from "@/lib/bidi";
import { PHONE_E164 } from "@/components/bidi/PhoneLink";
import { priceDigits } from "./price";

export function buildWhatsappUrl(spec: {
  productHe: string; materialEn: string; colors: string[]; sizeCm: number; qty: number; price: number;
}) {
  const body = rtlLines([
    "היי שי, בניתי הזמנה באתר:",
    `דגם: ${spec.productHe}`,
    `חומר: ${iso(spec.materialEn)}`,
    `צבעים: ${spec.colors.map(iso).join(", ")}`,
    `גודל: ${iso(spec.sizeCm)} ס״מ`,
    `כמות: ${iso(spec.qty)}`,
    `מחיר באתר: ${iso("₪" + priceDigits(spec.price))}`,
    "",
    "אשמח לדעת מתי אפשר לקבל.",
  ]);
  return `https://wa.me/${PHONE_E164.replace("+", "")}?text=${encodeURIComponent(body)}`;
}
```
שים לב ל-`ס״מ` עם גרשיים עבריים (U+05F4) ולא עם מרכאה כפולה. אותו דבר ב-`מ״מ`.

#### ז. שדות קלט מספריים

```tsx
<input type="number" inputMode="numeric" dir="ltr" className="text-end ..." />
```
`dir="ltr"` על השדה נותן התנהגות סמן צפויה בהקלדת ספרות, ו-`text-end` מיישר את המספר לקצה שנראה נכון בתוך טופס RTL. שדות טקסט עברי (שם, הערה) נשארים בלי `dir` ויורשים RTL.

### 4.5 טבלת ההחלטות המהירה

| התוכן | העטיפה | `dir` | מיושר |
|---|---|---|---|
| משפט עברי | ללא | יורש rtl | start |
| מספר טלפון | `<bdi>` | `ltr` | כפי שנופל |
| מחיר | `<bdi>` | `ltr` | כפי שנופל |
| שם פילמנט/חומר לטיני | `<bdi>` | ללא (חזק לטיני ממילא) | כפי שנופל |
| שם קובץ | `<bdi>` | `ltr` | כפי שנופל |
| hex | `<bdi>` | `ltr` | כפי שנופל |
| מידה עם יחידה (`24 ס״מ`) | ללא | יורש rtl | start |
| כתובת אימייל | `<bdi>` | `ltr` | כפי שנופל |
| קלט מספרי | על השדה | `ltr` | end |
| הודעת וואטסאפ | `RLM` בכל שורה + `FSI/PDI` | טקסט רגיל | לא רלוונטי |

---

## 5. גרשיים ופיסוק עברי

- קיצורים עם **גרשיים עבריים** U+05F4: `ס״מ`, `מ״מ`, `ק״ג`. לא `"`.
- ראשי תיבות באות אחת עם **גרש** U+05F3: `ג׳`, `צ׳`.
- ציטוט: מרכאות כפולות ישרות `"` לפי כלל הכתיבה של אריאל. אין מרכאות מסולסלות ואין `„ ”`.
- אין מקף ארוך מוקף ברווחים בשום מקום באתר. הרפרנס gutzim משתמש בו בגוף ההירו ("תמונה אחת — ותוך דקות"), וזה בדיוק מה שאסור להעתיק.
- מקף מחבר בלי רווחים כשצריך: `תלת-ממדי`, `שלושה-ארבעה ימים`.
- הכתיב הנעול: **תלת ממד** (ולא "תלת מימד"), **פילמנט**, **ליתופן**, **מדפסת**.
- אין שלוש נקודות דרמטיות ואין סימן קריאה כפול בקופי האתר. (בפוסטים של אריאל זה כן קיים; באתר של שי לא.)

---

## 6. מערכת ההדגשה בלי נטוי

לעברית אין נטוי אמיתי. הטיה מכנית של אותיות עבריות שוברת אותן, ולכן:

```css
@layer base {
  i, em, cite, dfn, address, var { font-style: normal; }
  em { font-weight: 600; color: var(--color-ink); }
}
```

**חמש דרגות הדגשה, לפי סדר עוצמה:**

1. **קפיצת משקל בגוף.** `400 → 600` ב-Assistant. זו ההדגשה הרגילה, וזה מה ש-`<strong>` ו-`<em>` עושים. משקל 700 בגוף שמור לשם המוצר ולמספר.
2. **קרקע צבועה עם דיו מעליה.** `<span class="hl">` עם רקע טורקיז 12% ופדינג של 0.1em/0.28em ורדיוס 0.3em. יחס הניגודיות של דיו על טורקיז מלא הוא 7.87:1, ועל 12% הוא גבוה יותר. זו ההדגשה החזקה היחידה שמותרת בתוך פסקה.
3. **קו תחתון עבה בצהוב.** לביטוי אחד בפסקה:
```css
.underline-marker {
  text-decoration: underline;
  text-decoration-color: var(--color-yellow);
  text-decoration-thickness: 0.18em;
  text-underline-offset: 0.22em;   /* עברית צריכה יותר: ק/ן/ך יורדות אל הקו */
  text-decoration-skip-ink: none;  /* קפיצות סביב ירידות נראות כמו קו שבור */
}
```
4. **הסימון (סעיף 3.1).** דיספליי בלבד.
5. **קפיצת גודל.** ציטוט מודגש ב-`body-lg` בפונט הדיספליי במשקל 600, עם `measure-prose` צר יותר.

**אסור כהדגשה:**
- נטוי, בכל צורה.
- ריווח אותיות מוגדל (`letter-spacing: .2em`). בלטינית זו מסורת של הדגשה, בעברית זה נקרא כמו תקלת רינדור.
- **טקסט אדום.** אדום על קרם נותן 3.63:1, מתחת לסף 4.5:1 של AA לטקסט רגיל. אדום כטקסט מותר רק בגודל h2 ומעלה ובמשקל 700 ומעלה, שם הסף הוא 3:1. בגוף אף פעם.
- **טקסט טורקיז.** טורקיז על קרם נותן 2.16:1 ונופל גם בסף של טקסט גדול. טורקיז הוא קרקע, מסגרת, נקודה וקו תחתון. אף פעם לא צבע של אותיות על קרם.
- **טקסט צהוב.** 1.49:1 על קרם. קרקע בלבד.
- קו תחתון רגיל על טקסט שאינו קישור.
- CAPS. אין אותיות רישיות בעברית, וטקסט לטיני ב-CAPS בתוך אתר עברי נראה כמו כותרת של חברת תוכנה.

**יחסי הניגודיות שנמדדו (WCAG 2.1) ומה מותר לפיהם:**

| קדמה על רקע | יחס | פסיקה |
|---|---|---|
| `#1A1420` על `#FFF7EC` | 16.97:1 | כל גודל. זהו טקסט הגוף. |
| `#5A5459` (`--ink-muted`) על `#FFF7EC` | 6.94:1 | טקסט משני, caption, overline. |
| `#F5333F` על `#FFF7EC` | 3.63:1 | כותרות בלבד, ≥1.5rem ומשקל ≥700. |
| לבן על `#F5333F` | 3.86:1 | טקסט גדול בלבד: **≥19px במשקל ≥700**. |
| `#1A1420` על `#F5333F` | 4.67:1 | כל גודל. זו הנפילה לתוויות קטנות על אדום. |
| `#1A1420` על `#12BFB8` | 7.87:1 | כל גודל. |
| `#1A1420` על `#FFC531` | 11.4:1 | כל גודל. |

מכאן נגזר הגודל של הכפתור: **הכיתוב ב-CTA הראשי הוא 1.1875rem (19px) במשקל 800 בלבן על אדום**. 19px במשקל 700 ומעלה נחשב "טקסט גדול" ולכן 3.86:1 עובר AA. כיתוב קטן יותר על אדום עובר אוטומטית לדיו (`--color-ink`), וזה החוק ב-`button-sm`.

---

## 7. מיפוי טוקן לרכיב

| רכיב | טוקן | פונט | הערה |
|---|---|---|---|
| שורת הכרזה עליונה | `caption` 13px/500 | text | דיו על קרם, לא על שחור |
| ניווט ראשי | `body-sm` 15px/600 | text | |
| Overline מעל כותרת | `overline` | display | עם וקסל, סעיף 3.3 |
| כותרת הירו בבית | `display-hero` | display | שתי שורות, נקודה בסוף כל שורה, סימון על מילה אחת |
| תת-כותרת הירו | `body-lg` | text | `measure-prose` |
| CTA ראשי | `button` 19px/800 | display | לבן על אדום |
| CTA משני | `button` 19px/800 | display | דיו על קרם עם מסגרת דיו 2px |
| כותרת סקשן | `display` או `h1` | display | |
| שם מוצר בכרטיס | `h3` | display | |
| מחיר בכרטיס | `h3` | display | `Price size="inline"` |
| טקסט גוף | `body` 17px | text | |
| כותרת שלב במחולל | `h2` | display | |
| תווית שדה | `h4` 18px/600 | display | |
| טקסט עזר מתחת לשדה | `caption` | text | `--ink-muted` |
| שם צבע פילמנט | `body-sm` + `HexChip` | text | |
| **חשיפת המחיר** | `price-tag-huge` | display | 900, אדום, `tabular-nums`, נקודה צהובה על הכותרת שמעליו |
| כפתור וואטסאפ | `button` | display | |
| סיפור שי (עמוד About) | `body-lg` | text | `measure-prose`, גוף ראשון |
| ציטוט הסרט | `h3` במשקל 600 | display | הציטוט על הקלפים |
| טבלאות אדמין | `body-sm` + `tnum` | text | |
| הודעות שגיאה | `body-sm` 15px/600 | text | דיו על רקע אדום 10% |

---

## 8. חוק הקופי: זוגות ✗ / ✓

הקול הוא של שי. ילד בן שלוש עשרה, גוף ראשון, יחיד. לא "אנחנו", לא קופירייטר שמתאר ילד אמיץ.

**1. תקבולת שלילית**
✗ `זו לא סתם הדפסה, זו מתנה שנשארת.`
✓ `הדפסה שנשארת על המדף.`
הצורה "זה לא X, זה Y" היא הסימן הכי מובהק של טקסט שנכתב במודל. אפס שימושים באתר.

**2. תקבולת שלילית מוסווית**
✗ `אני לא מוכר מוצרים, אני מוכר רגש.`
✓ `כל דבר שאני שולח יצא מהמדפסת אצלי בחדר.`

**3. מקף ארוך מוקף ברווחים**
✗ `שולחים תמונה — ומקבלים דגם.`
✓ `שולחים תמונה ומקבלים דגם.`
✓ `שולחים תמונה, ומקבלים דגם.`

**4. פסקת סגירה מסכמת**
✗ `בשורה התחתונה, אני פשוט אוהב להדפיס.`
✓ `אני אוהב להדפיס.`
העמוד נגמר בפעולה, כלומר בכפתור הוואטסאפ, ולא במשפט שמסכם את עצמו.

**5. גוף שלישי על ילד אמיץ**
✗ `שי, נער מוכשר שהתגבר על דיסלקציה, מדפיס עבורכם במסירות.`
✓ `לא תמיד הצלחתי לקרוא. מצאתי דרך משלי להבין, ופירקתי את הקיר יום אחרי יום.`
הראשון בחילה. השני עובדה.

**6. רבים קורפורטיבי**
✗ `אנו מאמינים שכל רעיון ראוי להפוך למציאות.`
✓ `אני הופך רעיונות לדברים אמיתיים.`
זה גם המשפט שהוא עמוד השדרה של האתר, והוא מתאר גם את ההדפסה וגם אותו.

**7. שמות עצם מנופחים**
✗ `פתרונות הדפסה תלת ממד מתקדמים בהתאמה אישית.`
✓ `הדפסה תלת ממד מהתמונה שלך.`

✗ `חוויית התאמה אישית מלאה לאורך כל המסע.`
✓ `בוחרים צבע, בוחרים גודל, רואים מחיר.`

**8. אסתטיקת "מלאכת יד"**
✗ `מסע של יוצר צעיר, עבודת יד, אהבה לפרטים.`
✓ `מדפסת אחת, חדר אחד, המון ניסיונות שנזרקו לפח.`

**9. CTA**
✗ `לחץ כאן לקבלת הצעת מחיר.`
✓ `שלח לי את זה בוואטסאפ.`
✓ `בוא נראה איך זה יוצא.`

**10. חשיפת המחיר**
✗ `המחיר המשוער עשוי להשתנות בהתאם לפרמטרים נוספים.`
✓ `זה המחיר. אם משנים משהו, המספר משתנה מולך.`

**11. הכלל שאסור לשבור בסיפור**
✗ `כשהחיים נתנו לו קלפים קשים, הוא בחר לשחק אותם אחרת.`
✓ `לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם.`
המשפט השני הוא ציטוט מהסרט וזו הצורה המדויקת שלו. הוא מובא כציטוט ולא מנוסח מחדש, ולא נבנית סביבו וריאציה נוספת.

**12. לטינית בתוך משפט עברי**
✗ `אני מדפיס ב-PLA Silk, שזה חומר מבריק.`
✓ `אני מדפיס ב<Bidi ltr>PLA Silk</Bidi>, שזה חומר מבריק.`
בלי הבידוד הפסיק נוחת בצד השני של השם.

---

## 9. בדיקת מסירה

חוסם שחרור אם אחד מאלה נכשל.

- [ ] `dir="rtl"` מופיע פעם אחת בלבד בכל הקוד, ב-`layout.tsx`. `grep -rn 'dir="rtl"' src/` מחזיר שורה אחת.
- [ ] `grep -rnE '\b(ml|mr|pl|pr)-[0-9]|text-(left|right)|space-x-' src/` מחזיר אפס תוצאות.
- [ ] `grep -rn 'letter-spacing: -' src/` מחזיר אפס תוצאות מחוץ ל-`.latin-tight`.
- [ ] `grep -rn 'font-style: italic\|<i>\|italic' src/` מחזיר אפס תוצאות.
- [ ] `grep -rn ' — ' src/` (מקף ארוך עם רווחים) מחזיר אפס תוצאות בכל טקסט מוצג.
- [ ] אף גודל טקסט מוצג אינו קטן מ-13px.
- [ ] כל משקל 800 או 900 יושב על 2rem ומעלה.
- [ ] כפתור אדום: הכיתוב 19px ומשקל 800. אין כיתוב לבן קטן יותר על אדום בשום מקום.
- [ ] המחיר מרונדר דרך `<Price/>` בלבד. אין `₪` משורשר ידנית באף קובץ.
- [ ] הטלפון מרונדר דרך `<PhoneLink/>` בלבד.
- [ ] הודעת הוואטסאפ נבדקה במכשיר אמיתי: כל שורה מיושרת לימין, שם החומר הלטיני לא הפך את השורה, המחיר נקרא `₪249`.
- [ ] הסימון מופיע לכל היותר שלוש פעמים בעמוד ולעולם לא נשבר בין שתי שורות ב-360px רוחב.
- [ ] הנקודה נשארת צמודה למילה האחרונה ב-320px, 390px ו-1440px.
- [ ] טעינה עם רשת מוגבלת: החלפת הפונט לא מזיזה את הכותרת יותר משתי פיקסלים (נבדק עם `adjustFontFallback: false` וה-@font-face הידני).
- [ ] `next build` מדווח על פחות מ-120KB פונטים.
- [ ] נבדק ב-webview של אינסטגרם ובזה של וואטסאפ, באייפון ובאנדרואיד.
