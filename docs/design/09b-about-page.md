# 09b · עמוד הסיפור · `/about` · הקופי המלא

**Status:** copy ready to ship, pending Shai's and his parents' approval per `DECISIONS.md` §הסיפור.
**Owns:** every Hebrew word on `/about`, the home-page teaser copy, the two-sentence footer version, and the timeline data array.
**Governed by:** `09-story-and-site-copy.md` (voice, law), `DECISIONS.md` (four bans), `03-page-architecture.md` §2.6 §3.6 (surfaces), `06-admin-and-convex-schema.md` §aboutSections (schema).
**Does not own:** layout geometry, the spine mechanics, motion. Those are `03`, `08` of `09`, and `07`.

Total Hebrew on the page, counting the hero, every heading, every caption and the closing block:
**298 words**. Target in `09` §7 was ~330. It came in under, and it stays under.
The only digit on the page is `13`.

---

## 0. Facts used, and facts deliberately not invented

Every sentence below traces to a fact supplied by Ariel. Nothing was added. Six places wanted a
detail that does not exist yet; each carries an inline `[אריאל: ...]` placeholder in the copy, or a
note under the section. No dialogue was written, no feeling was attributed, no medical term was
introduced that Ariel did not supply.

Two words are deliberately absent from the shipping copy and need a decision before launch:
**"אלרגיה"** and any name for what happens on the harder nights. `DECISIONS.md` approves the allergy
being in the story, but the facts handed over describe it without naming it, and naming it is Shai's
call, not the copywriter's. The copy works either way; see §2 note and §3 note.

---

## 1. `AboutHero` · the top of the page

Static in `src/content/about.ts` as `ABOUT_HERO`. Not a Convex row, because it is the page's `h1`
and must render in the HTML with no query.

| slot | ships as |
|---|---|
| eyebrow (`text-overline`) | `הסיפור שלי` |
| `h1` | `אני בן 13, ואני מדפיס בתלת ממד.` |
| sub-line | `קוראים לי שי איזנשטט. הנה מה שהיה עד כאן.` |

**Image slot:** none. The hero is type only. A portrait this early competes with the `h1` and turns
the page into a profile instead of a story. The first face on the page arrives at §6, after the
reader already owes him something.

**What this does for the reader:** states the age in the first five words, as an asset, with no
apology and no softening clause around it. `09` §3.1 sentence, used verbatim.

---

## 2. Section 1 · `opener` · **pinned**

```
id:      opener
kind:    opener
accent:  ink
sort:    0
label:   אין
```

**Heading (h2):**
```
הופך רעיונות לדברים אמיתיים
```

**Body:**
```
במדפסת שלי יוצא כל מה שאני מתכנן. אני מודד, מדפיס, ומתקן עד שזה יושב נכון.
לפני שהגעתי לזה היו לי כמה שנים של תרגול בפתרון בעיות.
```

**Pull quote:** none.
**Image slot:** none.

**What this does for the reader:** opens with the business in one line so nobody thinks they landed
on a charity page, then hands off to the story with a bridge that promises the story is about
problem solving and not about hardship.

**Notes.**
- Spine phrase 1, verbatim per `09` §2. Pinned in `/admin/about` per `06` C.14; delete button reads
  `המשפט הזה הוא הבסיס של האתר.`
- The red full stop device from the footer wordmark is not repeated here. `09` §7 forbids red on this
  page until the last line.

---

## 3. Section 2 · `timelineItem` · גיל חצי שנה

```
id:      rules
kind:    timelineItem
accent:  turquoise
sort:    1
labelHe: גיל חצי שנה
```

**Heading (h3):**
```
החוקים התחילו מוקדם
```

**Body:**
```
בגיל חצי שנה טעמתי קצת מקינוח חלבי. מאותו יום ידעתי שהחיים שלי מגיעים עם חוקים משלהם.
דברים שפשוטים לילדים אחרים, כמו אוכל, דורשים ממני תשומת לב ואחריות.
החוקים לא הפחידו אותי. למדתי אותם, וחשבתי צעד אחד קדימה.
כל בעיה הפכה בסוף לפתרון.
```

**Pull quote:** none.
**Image slot:** none. This section stays inside the spine rail and stays text.

**What this does for the reader:** establishes that the way he works started before he could talk,
in four flat sentences that never ask to be felt sorry for.

**Notes.**
- `[אריאל: להחליט אם המילה "אלרגיה" נכתבת כאן במפורש]`. If yes, the second sentence becomes
  `מאותו יום אנחנו יודעים שיש לי אלרגיה, ושהחיים שלי מגיעים עם חוקים משלהם.` and that is the one place
  on the site where a first person plural is defensible, because it is about a family and not about a
  business. The default that ships is the version above, with no term.
- `פתרון` is used in the concrete singular, as the fact supplied it. The banned noun in `09` §4.2 is
  the business-speak plural `פתרונות`, which does not appear anywhere on this site.
- `החוקים לא הפחידו אותי. למדתי אותם` is two separate sentences with a full stop between them, not a
  `זה לא X, זה Y` mirror. Checked against the ban.

---

## 4. Section 3 · `timelineItem` · הלילות

```
id:      nights
kind:    timelineItem
accent:  turquoise
sort:    2
labelHe: הלילות
```

**Heading (h3):**
```
זה לא נגמר בשולחן
```

**Body:**
```
גם בלילות הפחות שקטים היה צריך לשים לב.
למדתי לזהות מה מפריע לי, להתכונן מראש, ולבנות לעצמי הגנה.
אחרי כמה פעמים כבר ידעתי מה עושים.
```

**Pull quote:** none.
**Image slot:** none.

**What this does for the reader:** the shortest section on the page, and the driest. It says the
thing happened, says what he did about it, and moves on before anyone can arrange their face into
sympathy.

**Notes.**
- Heading is the one written into the `09` §8 wireframe. Kept verbatim so the spec and the copy match.
- `בלילות הפחות שקטים` is exactly as vague as the facts handed over. It is not softened and it is not
  filled in. `[אריאל: אם שי רוצה לומר במפורש במה מדובר, זה המשפט שמשתנה]`.
- `לבנות לעצמי הגנה` is the phrase from the facts. It also happens to be the first time on the page
  that he builds something, which is why the section stays where it is in the order.

---

## 5. Section 4 · `pullQuote` · breath 1

```
id:      quote-prepare
kind:    pullQuote
accent:  turquoise
sort:    3
```

**Quote (ships in the display face, 44rem, breaks the spine rail):**
```
למדתי מוקדם שאפשר להתכונן כמעט לכל דבר.
```

**Heading:** none. **Body:** none. **Image slot:** none. **Attribution:** none, the whole page is
already in his voice.

**What this does for the reader:** the first of the four long breaths in `09` §8. It converts three
sections of medical fact into a working method, one sentence before the story turns warm.

---

## 6. Section 5 · `timelineItem` · חנוכה

```
id:      menorah
kind:    timelineItem
accent:  yellow          ← the yellow voxel marker, one of two coloured exceptions on the spine
sort:    4
labelHe: חנוכה
```

**Heading (h3):**
```
הפתק בחנוכייה
```

**Body:**
```
בחנוכה אחת החבאתי פתק בתוך החנוכייה וביקשתי משאלה.
[אריאל: לוודא באיזו חנוכה זה היה]
```

**Pull quote:** none.
**Image slot:** none. The image belongs to the next section, and the gap between the wish and the
photograph is the whole point of splitting them.

**What this does for the reader:** one sentence, then nothing. The reader has to scroll to find out
what happened, and that scroll is the strongest one on the page.

**Notes.**
- The bracketed placeholder ships only until Ariel fills it. If a year is supplied it is written as a
  digit inside the label, `חנוכה [שנה]`, never inside the sentence, because `09` §7 allows no number
  on this page except the age.

---

## 7. Section 6 · `twoUp` · breath 2

```
id:      noam
kind:    twoUp
accent:  yellow
sort:    5
```

**Heading:**
```
שנה אחרי זה
```

**Body:**
```
נועם הגיע. הוא הנס הפרטי שלי, והבית התמלא באור חדש.
```

**Image slot: EMPTY. Awaiting a real photograph.**
```
WHAT BELONGS HERE: שי ונועם ביחד. תצלום אמיתי מהבית, לא מבוים, לא סטודיו.
                   פורמט 4:5, נכנס לתא התמונה של ה-twoUp במסגרת לבנה, rotate -2deg.
STATUS:            ריק. אין תמונה. הסקשן לא עולה ל-active בלי תצלום אמיתי ששי מוסר.
                   אין תחליף שנוצר ב-AI. פרצוף של הילד הזה הוא הדבר היחיד באתר
                   שאי אפשר לייצר, וזאת בדיוק הסיבה שהוא שווה משהו.
ALT (provisional): שי ונועם
                   [אריאל: לתקן את ה-alt לפי מה שבאמת רואים בתמונה שתגיע]
```

**What this does for the reader:** pays off the previous section in three words, and puts the first
human face on the page at the exact moment the reader is most willing to like him.

**Notes.**
- `06` C.14 blocks `active` on any image section with no alt text, message
  `כתוב מה רואים בתמונה. זה מה שקורא המסך יקריא.` That guard is doing real work here; do not
  pre-fill the alt with the provisional string in the seed.
- The `twoUp` schema carries one `imageId` plus `headingHe` and `bodyHe`, so this is one image cell
  and one text cell side by side, not two photographs.

---

## 8. Section 7 · `timelineItem` · בית ספר

```
id:      school
kind:    timelineItem
accent:  turquoise
sort:    6
labelHe: בית ספר
```

**Heading (h3):**
```
הקיר שפירקתי
```

**Body:**
```
אחר כך הגיע בית ספר. לא תמיד הצלחתי לקרוא את מה שהיה על הדף, אז מצאתי דרך משלי להבין.
הדיסלקציה בנתה סביבי קיר, והיו מי שחשבו שלא אצליח. הם לא הכירו אותי.
פירקתי את הקיר יום אחרי יום. הציונים עלו, והביטחון עלה איתם.
גם מי שהטיל ספק שינה דעה.
```

**Pull quote:** none.
**Image slot:** none.

**What this does for the reader:** the longest section on the page, because it is the one where he
wins, and it is written in verbs he performed rather than adjectives someone gave him.

**Notes.**
- `לא תמיד הצלחתי לקרוא את מה שהיה על הדף` is the sentence `09` §1 names as the standard the whole
  page is measured against. It ships unchanged.
- Heading is `הקיר שפירקתי` and not `הקיר שהדיסלקציה בנתה`. The word דיסלקציה stays in the body where
  it is a fact, and the heading belongs to him.
- `הם לא הכירו אותי` is four words on its own line. It is the closest the page gets to a boast, and
  that is the correct ceiling.

---

## 9. Section 8 · `timelineItem` · בר מצווה

```
id:      haftarah
kind:    timelineItem
accent:  turquoise
sort:    7
labelHe: בר מצווה
```

**Heading (h3):**
```
ההפטרה שלי
```

**Body:**
```
אחר כך הייתה ההפטרה. למדתי אותה מילה אחרי מילה, עד שהכול ישב במקום.
בבר מצווה קראתי אותה בעצמי.
משם נשאר לי משפט אחד: הצלחה תלויה במה שמוכנים לעבוד בשבילו.
```

**Pull quote:** none.
**Image slot:** none.

**What this does for the reader:** turns everything before it into a method the reader can trust with
their own order, one section before the page starts talking about printing.

**Notes.**
- The supplied fact reads "success does not depend on what is easy, it depends on what you are willing
  to work for." That is a `לא X, אלא Y` mirror and it is banned. The negative half is dropped and only
  the positive claim ships. The meaning survives; the pattern does not.
- `בעצמי` is the same word that carries `09` §3.5. It appears here and in the closing, and the echo is
  intentional.

---

## 10. Section 9 · `imageFull` · breath 3

```
id:      printer
kind:    imageFull
accent:  none
sort:    8
```

**Heading:** none. **Body:** none.

**Caption (ships under the image, `text-caption`, `ink/70`):**
```
המדפסת שלי באמצע עבודה.
```

**Image slot: EMPTY. Awaiting a real photograph.**
```
WHAT BELONGS HERE: המדפסת של שי בזמן הדפסה, מהחדר שלו. הראש באמצע שכבה, חוט פילמנט
                   נכנס, משהו חצי מודפס על המשטח. אור יום מהחלון, בלי תאורת סטודיו.
                   רוחב מלא, 44rem, יוצא מהרינה של הציר.
STATUS:            ריק. אין תמונה. חייב להיות תצלום אמיתי של המדפסת שלו.
                   אסור לייצר את זה ב-gpt-image-2: `DECISIONS.md` §אסטים אוסר לוגואים
                   ומותגים, וגנרציית מבחן כבר החזירה לוגו Ender אמיתי. מדפסת אמיתית
                   בתצלום אמיתי היא ממילא נכונה יותר וגם חוקית יותר.
ALT (provisional): המדפסת של שי מדפיסה, חוט פילמנט נכנס לראש ההדפסה
                   [אריאל: לתקן את ה-alt לפי התצלום שיגיע]
```

**What this does for the reader:** the visual hinge. The page stops being about a boy and starts being
about a machine in his room, one beat before he says so in words.

---

## 11. Section 10 · `timelineItem` · היום

```
id:      today
kind:    timelineItem
accent:  red             ← the red voxel marker, the second coloured exception on the spine
sort:    9
labelHe: היום
```

**Heading (h3):**
```
והיום אני יוצר
```

**Body:**
```
היום אני מתכנן, מודד, מדפיס ומתקן.
אני לוקח רעיון של מישהו והופך אותו לדבר שאפשר להחזיק ביד.
ההזמנות כבר מגיעות, ויש יותר מהן מחודש לחודש.
אם יצא עקום, אני מדפיס שוב.
```

**Pull quote:** none.
**Image slot:** none. The photograph that belongs to this section is the one above it.

**What this does for the reader:** the hinge. Everything the reader has just learned about how he
handles a problem is now attached to the thing they can order.

**Notes.**
- `אם יצא עקום, אני מדפיס שוב.` is the single line `09` §5 requires to appear in both the story and the
  generator. This is its story occurrence. `grep -c "אם יצא עקום" src/content/` should return exactly 2.
- `ההזמנות כבר מגיעות` is a fact from `DECISIONS.md`. `ויש יותר מהן מחודש לחודש` is the "demand is
  growing" fact, stated without a number, because no number exists and `09` §7 forbids one here anyway.

---

## 12. Section 11 · `statement` · **pinned** · breath 4

```
id:      cards
kind:    statement
accent:  ink
sort:    10
```

**Statement (ships at 44rem, centred, display face, breaks the spine):**
```
לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם
```

**Heading:** none. **Body:** none. **Image slot:** none.

**What this does for the reader:** ends the story on a borrowed sentence, so the last thing they read
is a frame for everything above it rather than a claim he made about himself.

**Notes.**
- Spine phrase 2, verbatim per `09` §2. **The only `אלא` on the entire site.**
  `grep -rn "אלא" src/content/` must return exactly one line, and it is this one.
- **No full stop.** `09` §2 and `06` C.14 both print it without one. `03` §3.6's wireframe shows a
  trailing period; that wireframe loses. See §16 conflict 4.
- Pinned in `/admin/about`, delete button replaced with `המשפט הזה הוא הבסיס של האתר.`
- Character count 56, inside the 80-character counter that `06` C.14 puts on `statement` rows.

---

## 13. `AboutClosing` · the CTA block

Static in `src/content/about.ts` as `ABOUT_CLOSING`. Not a Convex row. `aboutSections.kind` has no
`closing` member and it should not grow one: this block is a call to action, not story text, and it
must not be reorderable or deletable from the story editor.

Ground: ink `#1A1420`, full-bleed, sitting under the statement. This is the first and only red on the
page, per `09` §7.

| slot | ships as |
|---|---|
| heading (`h2`) | `אם יש לכם רעיון, אני כאן` |
| body | `כותבים לי בוואטסאפ, מספרים מה בא לכם, ואני עונה בעצמי.` |
| primary CTA, red fill | `לכתוב לשי בוואטסאפ` |
| secondary CTA, cream outline | `לראות דגמים` → `/products` |
| response line, `cream/70` | from `settings.responseTimeHe`, default `בדרך כלל אני חוזר תוך כמה שעות.` |
| honesty line, turquoise | `אין תשלום באתר. סוגרים הכול בוואטסאפ.` |

**WhatsApp payload,** `source: 'about_closing'`:
```
היי שי, קראתי את הסיפור שלך באתר.
יש לי רעיון להדפסה ואשמח לשמוע אם אפשר.
```

**Image slot:** none.

**What this does for the reader:** gives the feeling somewhere to go within one thumb reach of the
last sentence, without a single imperative verb.

**Notes.**
- Grammar check against `09` §5: `כותבים`, `מספרים` are בינוני סתמי. `לכתוב`, `לראות` are שם פועל.
  There is no `שלח`, no `לחץ`, no `בחר` anywhere in this block or on this page.
- `about_closing` is a new value for the `source` union in `03` §2.7. Add it alongside `closing_home`.
- This block is a CTA and not a summary. There is no closing summary paragraph anywhere on this page,
  per ban 3.

---

## 14. Home page · story teaser

Destination: `src/content/home.ts`.

### 14.1 The heading, and why it changes

`03` §3.6 puts the film quote in the `StoryTeaser` `h2` on the home page. That cannot ship. `09` §2
allows the quote **once on the entire site**, at the end of `/about`, and enforces it with
`grep -n "אלא" src/content/` returning a single line. Two occurrences breaks the law and, worse,
spends the ending before the reader has earned it.

**Replacement `h2`, same shape, same three lines, same single markable word:**
```
למדתי לפתור בעיות הרבה לפני
שקניתי ▓מדפסת▓
```
Yellow marker on `מדפסת`, exactly where `03` §3.6 put it on `לעשות`. Eyebrow above it stays
`קצת עליי`. Link below stays `לקרוא את הסיפור המלא` → `/about`.

### 14.2 The teaser body, full version · 93 words

```
אני בן 13, ואני מדפיס בתלת ממד.
בגיל חצי שנה טעמתי קצת מקינוח חלבי, ומאז אני יודע שהחיים שלי מגיעים עם חוקים משלהם. למדתי אותם, וחשבתי צעד אחד קדימה.
בבית ספר לא תמיד הצלחתי לקרוא את מה שהיה על הדף, אז מצאתי דרך משלי להבין. היו מי שחשבו שלא אצליח. פירקתי את הקיר הזה יום אחרי יום.
אחר כך למדתי את ההפטרה שלי, מילה אחרי מילה, וקראתי אותה בעצמי.
היום אני מתכנן, מודד, מדפיס ומתקן, ולוקח רעיונות של אנשים והופך אותם לדברים שאפשר להחזיק ביד.
יש עוד חלק אחד בסיפור שלא סיפרתי כאן.
```

Last line does the work: it is a fact, it is true, and it is the only thing on the home page that
makes `/about` feel like it is worth a click. It applies no pressure and promises nothing.

### 14.3 The teaser body, two-line cut

`03` §3.6 budgets `storyTeaserLines: string[]` at two lines inside a 58% column on a dark ground.
93 words will not fit that box without redrawing it. Both versions ship in `home.ts`; the component
picks. If the block is not redrawn, this is what renders:

```
בגיל חצי שנה למדתי שיש לי חוקים משלי, ובבית ספר למדתי לפרק קיר יום אחרי יום.
היום אני לוקח רעיונות של אנשים והופך אותם לדברים שאפשר להחזיק ביד.
```

`[אריאל: להחליט אם הבלוק גדל ל-93 מילים או נשאר בשתי שורות]`. The recommendation is to grow it. The
long version is the single highest-converting block of text on the site, and it is currently allocated
two lines.

---

## 15. Footer · two-sentence version

Destination: `src/content/site.ts` as `footerStoryHe`, rendered in the wordmark column of
`SiteFooter.tsx` under `שי איזנשטט`, above the red WhatsApp pill.

```
אני שי, בן 13, ואני מדפיס בתלת ממד.
כל הזמנה שיוצאת מהמדפסת עברה קודם דרך הידיים שלי.
```

The spine phrase `הופך רעיונות לדברים אמיתיים.` already sits in that column per `03` §2.6 and is not
replaced. These two sentences go under it.

---

## 16. Conflicts with other locked documents, and how they were resolved

| # | Conflict | Resolution |
|---|---|---|
| 1 | `03` §3.6 puts the film quote in the home `StoryTeaser` `h2`. `09` §2 allows it once, at the end of `/about`. | `09` wins, it is the voice law. Replacement `h2` in §14.1. **Needs Ariel's sign-off because `03` marks that heading design-locked.** |
| 2 | `03` §3.6 writes `אלא מה שאתה בוחר`. `09` §2 and `DECISIONS.md` write `אלא מה אתה בוחר`. | Ships without the `ש`, per `09` and `DECISIONS`. |
| 3 | `03` §3.6 budgets two teaser lines. This brief asks for 90 to 120 words. | Both delivered, §14.2 and §14.3. Ariel picks. |
| 4 | `03` §3.6 shows a full stop after `איתם`. `09` §2 and `06` C.14 show none. | Ships with no full stop. |
| 5 | `09` §7.1 says `about.fallback.ts` holds 12 rows. `06` C.24 seeds 9 `aboutSections`. | 11 Convex rows plus the hero object equals the 12 entries in `about.ts`. The closing block is a 13th export and is not a story row. Seed count in `06` C.24 needs updating from 9 to 11. |
| 6 | `09` §8 lists 6 spine labels. This page has 11 sections. | Correct as designed: 6 rows carry a marker, 4 break the rail with no marker, and the opener sits above the rail. |

---

## 17. Compliance check, run line by line

| rule | result |
|---|---|
| Ban 1, negative parallelism | Clean. The one supplied fact shaped like `לא X אלא Y` (the Haftarah lesson) was rewritten as a bare positive claim, §9. |
| Ban 2, spaced em-dash | Clean. Zero em-dashes on the page. |
| Ban 3, closing summary paragraph | Clean. The page ends on a quotation and a CTA. |
| Ban 4, emoji | Clean. Zero. |
| Only one `אלא` | Clean. §12 only. `grep -rn "אלא" src/content/` returns 1. |
| No `אנחנו` / `אנו` about the business | Clean. The only candidate is the optional allergy variant in §3, which is about a family. |
| No direct imperative | Clean. Buttons are שם פועל, instructions are בינוני סתמי, story is first person past. |
| No `!`, no ellipsis | Clean. |
| No inflated nouns | Clean. `חוויה`, `מסע`, `פתרונות`, `שירות מקצה לקצה` do not appear. |
| No promise he cannot keep | Clean. The strongest claim is `אם יצא עקום, אני מדפיס שוב.` |
| No plea for sympathy | Clean. Medical material is stated and left. |
| Numbers | Only `13`, in the hero, the teaser and the footer. `09` §7 satisfied. |
| Locked spelling | `תלת ממד` used, `תלת מימד` not used. `ליתופן`, `פילמנט`, `מדפסת` correct where they appear. |
| Sentence length, story register | 4 to 15 words. Shortest sentences sit in §3 and §4, the hardest sections. |
| First person past | Every story sentence. Present tense appears only in §11, where the story reaches today. |

---

## 18. `src/content/about.ts` · ready to paste

```ts
// עמוד הסיפור. הטקסט הזה מאושר על ידי שי ועל ידי ההורים לפני עלייה לאוויר.
// כל שורה כאן היא גם ה-fallback של Convex. אם השאילתה נופלת, הסיפור עדיין עולה.

export type AboutAccent = 'red' | 'turquoise' | 'yellow' | 'ink' | 'none';

export type AboutSection =
  | { id: string; kind: 'opener'; accent: AboutAccent; sortOrder: number; headingHe: string; bodyHe: string }
  | { id: string; kind: 'timelineItem'; accent: AboutAccent; sortOrder: number; labelHe: string; headingHe: string; bodyHe: string }
  | { id: string; kind: 'pullQuote'; accent: AboutAccent; sortOrder: number; quoteHe: string }
  | { id: string; kind: 'twoUp'; accent: AboutAccent; sortOrder: number; headingHe: string; bodyHe: string; imageAltHe: string }
  | { id: string; kind: 'imageFull'; accent: AboutAccent; sortOrder: number; bodyHe: string; imageAltHe: string }
  | { id: string; kind: 'statement'; accent: AboutAccent; sortOrder: number; quoteHe: string };

export const ABOUT_HERO = {
  eyebrowHe: 'הסיפור שלי',
  headingHe: 'אני בן 13, ואני מדפיס בתלת ממד.',
  subHe: 'קוראים לי שי איזנשטט. הנה מה שהיה עד כאן.',
} as const;

export const ABOUT_FALLBACK: AboutSection[] = [
  {
    id: 'opener',
    kind: 'opener',
    accent: 'ink',
    sortOrder: 0,
    headingHe: 'הופך רעיונות לדברים אמיתיים',
    bodyHe:
      'במדפסת שלי יוצא כל מה שאני מתכנן. אני מודד, מדפיס, ומתקן עד שזה יושב נכון.\n' +
      'לפני שהגעתי לזה היו לי כמה שנים של תרגול בפתרון בעיות.',
  },
  {
    id: 'rules',
    kind: 'timelineItem',
    accent: 'turquoise',
    sortOrder: 1,
    labelHe: 'גיל חצי שנה',
    headingHe: 'החוקים התחילו מוקדם',
    bodyHe:
      'בגיל חצי שנה טעמתי קצת מקינוח חלבי. מאותו יום ידעתי שהחיים שלי מגיעים עם חוקים משלהם.\n' +
      'דברים שפשוטים לילדים אחרים, כמו אוכל, דורשים ממני תשומת לב ואחריות.\n' +
      'החוקים לא הפחידו אותי. למדתי אותם, וחשבתי צעד אחד קדימה.\n' +
      'כל בעיה הפכה בסוף לפתרון.',
  },
  {
    id: 'nights',
    kind: 'timelineItem',
    accent: 'turquoise',
    sortOrder: 2,
    labelHe: 'הלילות',
    headingHe: 'זה לא נגמר בשולחן',
    bodyHe:
      'גם בלילות הפחות שקטים היה צריך לשים לב.\n' +
      'למדתי לזהות מה מפריע לי, להתכונן מראש, ולבנות לעצמי הגנה.\n' +
      'אחרי כמה פעמים כבר ידעתי מה עושים.',
  },
  {
    id: 'quote-prepare',
    kind: 'pullQuote',
    accent: 'turquoise',
    sortOrder: 3,
    quoteHe: 'למדתי מוקדם שאפשר להתכונן כמעט לכל דבר.',
  },
  {
    id: 'menorah',
    kind: 'timelineItem',
    accent: 'yellow',
    sortOrder: 4,
    labelHe: 'חנוכה',
    headingHe: 'הפתק בחנוכייה',
    // [אריאל: לוודא באיזו חנוכה זה היה. אם יש שנה, היא נכנסת ל-labelHe ולא לגוף הטקסט]
    bodyHe: 'בחנוכה אחת החבאתי פתק בתוך החנוכייה וביקשתי משאלה.',
  },
  {
    id: 'noam',
    kind: 'twoUp',
    accent: 'yellow',
    sortOrder: 5,
    headingHe: 'שנה אחרי זה',
    bodyHe: 'נועם הגיע. הוא הנס הפרטי שלי, והבית התמלא באור חדש.',
    // תא התמונה ריק עד שמגיע תצלום אמיתי של שי ונועם.
    // [אריאל: לתקן את ה-alt לפי מה שבאמת רואים בתמונה]
    imageAltHe: 'שי ונועם',
  },
  {
    id: 'school',
    kind: 'timelineItem',
    accent: 'turquoise',
    sortOrder: 6,
    labelHe: 'בית ספר',
    headingHe: 'הקיר שפירקתי',
    bodyHe:
      'אחר כך הגיע בית ספר. לא תמיד הצלחתי לקרוא את מה שהיה על הדף, אז מצאתי דרך משלי להבין.\n' +
      'הדיסלקציה בנתה סביבי קיר, והיו מי שחשבו שלא אצליח. הם לא הכירו אותי.\n' +
      'פירקתי את הקיר יום אחרי יום. הציונים עלו, והביטחון עלה איתם.\n' +
      'גם מי שהטיל ספק שינה דעה.',
  },
  {
    id: 'haftarah',
    kind: 'timelineItem',
    accent: 'turquoise',
    sortOrder: 7,
    labelHe: 'בר מצווה',
    headingHe: 'ההפטרה שלי',
    bodyHe:
      'אחר כך הייתה ההפטרה. למדתי אותה מילה אחרי מילה, עד שהכול ישב במקום.\n' +
      'בבר מצווה קראתי אותה בעצמי.\n' +
      'משם נשאר לי משפט אחד: הצלחה תלויה במה שמוכנים לעבוד בשבילו.',
  },
  {
    id: 'printer',
    kind: 'imageFull',
    accent: 'none',
    sortOrder: 8,
    bodyHe: 'המדפסת שלי באמצע עבודה.',
    // תא התמונה ריק עד שמגיע תצלום אמיתי של המדפסת של שי.
    // אסור לייצר את התמונה הזאת ב-gpt-image-2 בגלל הלוגו על המדפסת.
    imageAltHe: 'המדפסת של שי מדפיסה, חוט פילמנט נכנס לראש ההדפסה',
  },
  {
    id: 'today',
    kind: 'timelineItem',
    accent: 'red',
    sortOrder: 9,
    labelHe: 'היום',
    headingHe: 'והיום אני יוצר',
    bodyHe:
      'היום אני מתכנן, מודד, מדפיס ומתקן.\n' +
      'אני לוקח רעיון של מישהו והופך אותו לדבר שאפשר להחזיק ביד.\n' +
      'ההזמנות כבר מגיעות, ויש יותר מהן מחודש לחודש.\n' +
      'אם יצא עקום, אני מדפיס שוב.',
  },
  {
    id: 'cards',
    kind: 'statement',
    accent: 'ink',
    sortOrder: 10,
    // הציטוט היחיד מהסרט. מופיע פעם אחת בכל האתר. בלי נקודה בסוף.
    quoteHe: 'לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם',
  },
];

export const ABOUT_CLOSING = {
  headingHe: 'אם יש לכם רעיון, אני כאן',
  bodyHe: 'כותבים לי בוואטסאפ, מספרים מה בא לכם, ואני עונה בעצמי.',
  primaryCtaHe: 'לכתוב לשי בוואטסאפ',
  secondaryCtaHe: 'לראות דגמים',
  secondaryHref: '/products',
  fallbackResponseTimeHe: 'בדרך כלל אני חוזר תוך כמה שעות.',
  noPaymentNoteHe: 'אין תשלום באתר. סוגרים הכול בוואטסאפ.',
  waSource: 'about_closing',
  waMessageHe: 'היי שי, קראתי את הסיפור שלך באתר.\nיש לי רעיון להדפסה ואשמח לשמוע אם אפשר.',
} as const;
```

---

## 19. Timeline data structure

Destination: `src/content/about.ts`, exported alongside the sections. `StorySpine.tsx` reads this to
draw the rail; `StoryTimelineItem.tsx` reads `labelHe` into the `h3` as a `<span class="text-overline">`
so a screen reader gets it, per `09` §8.

`periodHe` is the honest answer to "when". Where no date exists it holds a bracketed placeholder and
**not** a guess. `09` §8 is explicit: no invented dates.

```ts
export type AboutTimelineEvent = {
  id: string;              // matches the aboutSections id
  labelHe: string;         // ships on the rail
  periodHe: string;        // ships nowhere yet; reserved for when Shai supplies dates
  markerAccent: 'turquoise' | 'yellow' | 'red';
};

export const ABOUT_TIMELINE: AboutTimelineEvent[] = [
  {
    id: 'rules',
    labelHe: 'גיל חצי שנה',
    periodHe: 'גיל חצי שנה',
    markerAccent: 'turquoise',
  },
  {
    id: 'nights',
    labelHe: 'הלילות',
    periodHe: '[אריאל: לוודא באיזה גיל זה התחיל]',
    markerAccent: 'turquoise',
  },
  {
    id: 'menorah',
    labelHe: 'חנוכה',
    periodHe: '[אריאל: לוודא באיזו חנוכה]',
    markerAccent: 'yellow',
  },
  {
    id: 'school',
    labelHe: 'בית ספר',
    periodHe: '[אריאל: לוודא באיזו כיתה זה התחיל]',
    markerAccent: 'turquoise',
  },
  {
    id: 'haftarah',
    labelHe: 'בר מצווה',
    periodHe: 'גיל 13',
    markerAccent: 'turquoise',
  },
  {
    id: 'today',
    labelHe: 'היום',
    periodHe: 'היום',
    markerAccent: 'red',
  },
];
```

**Marker colours** follow `09` §8 exactly: `חנוכה` yellow, `היום` red, everything else turquoise. Two
exceptions, marking the two moments the page wants remembered.

**`periodHe` renders nowhere today.** It exists so that the day Shai supplies real years, nobody has to
touch a component. Until then the rail shows `labelHe` only, and the page contains no date it cannot
prove.

---

## 20. Bonus · meta and Open Graph for `/about`

Not requested, included because `09` scopes meta copy and this page needs it before launch.

```ts
export const ABOUT_META = {
  titleHe: 'הסיפור שלי · שי איזנשטט',
  descriptionHe: 'אני בן 13, ואני מדפיס בתלת ממד. הנה מה שהיה עד כאן.',
  ogHeadingHe: 'אני בן 13, ואני מדפיס בתלת ממד.',
  ogSubHe: 'הסיפור שלי',
} as const;
```

`opengraph-image.tsx` renders live Hebrew DOM text on cream with the ink wordmark, per `DECISIONS.md`:
Hebrew is never baked into a generated image.

---

## 21. Before this goes live

1. Shai and his parents read §2 through §12 out loud and approve every sentence. `DECISIONS.md` requires
   it and it is not a formality; §3 and §4 are about his body.
2. Ariel decides on the word `אלרגיה`, §3 note.
3. Ariel resolves conflict 1 in §16, the home teaser heading.
4. Two real photographs arrive, §7 and §10. Neither section goes `active` without one.
5. `grep -rn "אלא" src/content/` returns exactly one line.
6. `grep -rn "אנחנו\|אנו \|שלח \|לחץ \|בחר \|חוויה\|מסע\|פתרונות" src/content/about.ts` returns nothing.
