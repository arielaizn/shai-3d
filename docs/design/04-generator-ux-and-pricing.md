# 04 · המחולל ומנוע התמחור
**The Generator + Pricing Engine · build spec**
מסמך בנייה. כל מספר כאן הוא החלטה, לא הצעה.

Route: `/generator` · Convex tables: `printTypes`, `filaments`, `filamentPresets`, `sizePresets`, `pricingSettings`, `drafts`, `leads`
Shared engine: `convex/pricing/engine.ts` (isomorphic, imported by both server and client)

---

## 0. עקרונות שנעולים לפני שמתחילים

1. **המחיר מוסתר עד הרגע האחרון.** אין סכום רץ בזמן הקונפיגורציה. כל כרטיס סוג הדפסה מציג `מתחיל מ-₪45` כדי לעגן ציפייה, והמספר המלא נחשף רק אחרי שהמשתמש לוחץ **"כמה זה יוצא"**. סכום רץ הופך כל בחירה לחרדת עלות ושורף את שיא הרגש.
2. **אין טופס.** לא שם, לא מייל, לא טלפון. הוואטסאפ הוא הזהות. פחות חיכוך, ואין אחסון פרטים אישיים של לקוחות אצל קטין.
3. **המחיר שמוצג מגיע מהשרת.** הלקוח מקבל חישוב אופטימי מקומי להצגה מיידית, אבל `quotes.compute` בקונבקס הוא מקור האמת ותוצאתו היא זו שנצרבת ב-`quoteSnapshot`.
4. **שי משנה מחירים בלי שורת קוד.** כל פרמטר בנוסחה הוא שדה בטבלת `pricingSettings` או בטבלת `printTypes`.
5. **התמונה נמחקת.** קרון יומי מוחק טיוטות נטושות ואת הקבצים שלהן אחרי 45 יום.

---

## PART B · מבנה ומצב (נכתב ראשון כי הוא קובע את כל השאר)

### B1. ההחלטה: סטפר בנייד, אקורדיון בדסקטופ

**נייד (מתחת ל-1024px): סטפר טהור. שלב אחד למסך.**
שלוש סיבות טכניות שהופכות את זה לחובה, לא לטעם:

* `OrbitControls` תופס את אירועי המגע. קנבס תלת-ממד בתוך דף נגלל = המשתמש נתקע ולא מצליח לגלול הלאה. בסטפר הקנבס מחזיק את כל הוויופורט של השלב שלו ואין התנגשות.
* `three` + `@react-three/fiber` + `drei` הם ~450KB gzip. בדף גלילה אחד הם נטענים בכניסה, מתוך webview של אינסטגרם, על 4G. בסטפר הם נטענים רק כשלוחצים "בנה לי את המודל" (שלב 5), אחרי שהמשתמש כבר השקיע ארבע בחירות.
* לחשיפת המחיר צריך גבול. בגלילה רציפה המספר פשוט נכנס לפריים באמצע סקרול. בסטפר הוא נכנס אחרי לחיצה מכוונת.

**דסקטופ (1024px ומעלה): אקורדיון + במה דביקה.**
גריד `grid-template-columns: minmax(420px, 520px) 1fr`. בעברית העמודה הימנית (start) היא תוכן השלבים כאקורדיון. שלב אחד פתוח, ושלבים שנסגרו מתקפלים לשורת סיכום אחת שאפשר ללחוץ עליה ולפתוח מחדש. העמודה השמאלית היא במה דביקה (`position: sticky; top: 88px`) שמתמלאת תוך כדי: תמונה → שבב סוג ההדפסה → נקודות הצבע → מידה, ובשלב 5 היא הופכת לקנבס התלת-ממד עצמו.

שני המצבים חולקים עץ קומפוננטות אחד. `StepShell.tsx` בודק `useMediaQuery('(min-width: 1024px)')` ומחליף רק את הפריסה.

### B2. שלד הפריסה בנייד

```
┌ header 56px, position:sticky, top:0, bg cream, border-bottom 1px ink/10
│  [חץ חזרה ►] [כותרת השלב]              [תמונה ממוזערת 32px, לחיצה = חזרה לשלב 1]
│  ProgressRail: 5 מקטעים, 4px גובה, מלא = --color-turquoise, פעיל = --color-red
├ main: overflow-y auto, padding-inline 20px, padding-block-end 104px
│  h1 (display 800, clamp(1.75rem, 7vw, 2.25rem)) + שורת משנה (ink/70, 0.95rem)
│  ... תוכן השלב ...
└ footer: position:sticky, bottom:0, bg cream, border-top 1px ink/10,
   padding: 12px 20px calc(12px + env(safe-area-inset-bottom))
   כפתור אדום מלא, גובה 56px, radius pill, טקסט cream 18px/700
```

`height: 100dvh` ולא `100vh`. ב-webview של אינסטגרם ובספארי `100vh` חותך את שורת הפעולה מתחת לקפל.

### B3. ניווט, כפתור חזור, וכתובת

כל מעבר שלב הוא `router.push('/generator?step=3', { scroll: false })`. הסטור קורא את `step` מתוך `useSearchParams`.
זה נותן חינם: כפתור החזרה החומרתי באנדרואיד מדלג שלב אחורה במקום לזרוק את המשתמש מהאתר, ושיתוף קישור באמצע התהליך עובד.
בכניסה עם `?d=<draftId>` הסטור מושך את הטיוטה מהשרת ומקפיץ לשלב האחרון שנשמר.

### B4. מצב ושמירה

**מקומי:** `zustand` עם `persist` לתוך `localStorage`, מפתח `shai.generator.draft.v1`.
`partialize` מוציא החוצה את ה-`File` ואת ה-`ImageBitmap` (לא ניתנים לסריאליזציה); התמונה חיה בקונבקס וה-URL שלה נשמר.
נבחר zustand ולא context כי הסטור נקרא מ-12 קומפוננטות ומהמנוע, ו-`persist` נותן שחזור בלי קוד.

**שרת:** הטיוטה נוצרת ברגע שהעלאת התמונה מסתיימת. זו הכתיבה הראשונה. `drafts.create` מחזיר `{ draftId, secret }`; שניהם נשמרים ב-localStorage וה-`draftId` נכנס ל-URL.
כל שינוי מפעיל `drafts.patch` עם debounce של 800ms. `patch` דורש את ה-`secret` (24 תווים) ולכן אף אחד לא יכול לערוך טיוטה של אחר.

**תיבת הדואר של שי:** `/admin/inbox`, שאילתה על האינדקס `by_status_touched`.
"ננטש" = `status === "draft" && step >= 2 && lastTouchedAt < now - 30min`.
כל שורה: ממוזערת 56px, שם סוג ההדפסה, המחיר האחרון שחושב, לפני כמה זמן, שבב סטטוס, ומאיפה הגיעה התנועה (`draft.ua`: `instagram-ios`, `whatsapp-android`, `web`).
שי יכול לפתוח את דף הטיוטה הציבורי, לסמן `won` / `lost`, ולראות את פירוט המחיר המלא.

### B5. סכימת הטיוטה

```ts
// convex/schema.ts
drafts: defineTable({
  secret: v.string(),                    // 24 תווים, מוחזק אצל הלקוח
  publicCode: v.optional(v.string()),    // 10 תווים, נוצר בחשיפת המחיר
  step: v.number(),                      // 1..5
  photoOriginalId: v.optional(v.id("_storage")),
  photoWorkId: v.optional(v.id("_storage")),   // webp 2000px
  photoThumbId: v.optional(v.id("_storage")),  // webp 256px
  photoMeta: v.optional(v.object({
    width: v.number(), height: v.number(), mime: v.string(),
    meanLuma: v.number(),        // 0..255
    contrastSpread: v.number(),  // אחוזון 95 פחות אחוזון 5, ב-0..255
    hasAlpha: v.boolean(),
  })),
  printTypeId: v.optional(v.id("printTypes")),
  filamentIds: v.array(v.id("filaments")),   // הסדר משמעותי: 1 = הגוף, 2 = מסגרת/בסיס
  extraColorsAccepted: v.boolean(),
  sizePresetId: v.optional(v.id("sizePresets")),
  quantity: v.number(),                       // 1..25
  rush: v.boolean(),
  neededBy: v.optional(v.string()),           // "2026-09-20"
  delivery: v.union(v.literal("pickup"), v.literal("shipping")),
  note: v.optional(v.string()),               // עד 120 תווים
  quoteSnapshot: v.optional(v.any()),         // תוצאת computeQuote מוקפאת
  pricingVersion: v.optional(v.number()),
  status: v.union(v.literal("draft"), v.literal("handoff"), v.literal("won"), v.literal("lost")),
  ua: v.optional(v.string()),
  createdAt: v.number(), lastTouchedAt: v.number(), handoffAt: v.optional(v.number()),
})
  .index("by_code", ["publicCode"])
  .index("by_status_touched", ["status", "lastTouchedAt"])
```

`quoteSnapshot` + `pricingVersion` הם התשובה לשאלה "מה קורה אם שי מעלה מחירים מחר". ליד ישן ממשיך להציג את המחיר שהלקוח ראה.

### B6. שמירה ומחיקה

```ts
// convex/crons.ts
crons.daily("purge", { hourUTC: 3, minuteUTC: 0 }, internal.drafts.purge);
// drafts: status==="draft" && lastTouchedAt < now - 45d  → מחיקת המסמך ושלושת הקבצים
// leads:  status in ("won","lost") && handoffAt < now - 18m → אותו דבר
```
מתחת לאזור ההעלאה, בגודל 13px: `התמונה נשמרת רק בשביל ההזמנה ונמחקת אחרי 45 יום.`

---

## PART A · הזרימה, שלב אחרי שלב

כותרות השלבים (עברית, קול של שי):

| # | כותרת | שורת משנה |
|---|---|---|
| 1 | התמונה | מעלים תמונה אחת. ממנה נבנה הכל. |
| 2 | מה מדפיסים | שבע דרכים להוציא את התמונה מהמסך. |
| 3 | צבעים | עד ארבעה צבעים כלולים במחיר. |
| 4 | גודל וכמות | כמה גדול, וכמה יחידות. |
| 5 | המודל שלך | סובב אותו, ואז תראה כמה זה יוצא. |

תוויות ה-ProgressRail: `תמונה · סוג · צבעים · גודל · מודל`

### A1. שלב 1: העלאת התמונה

**רכיבים:** `StepPhoto.tsx`, `PhotoDropzone.tsx`, `PhotoQualityNotice.tsx`, `lib/generator/imagePipeline.ts`

**שני כפתורים נפרדים.**
`capture` מתעלמים ממנו בדסקטופ ומבלבל, לכן:
* נייד: כפתור אדום מלא `בחר תמונה` (`<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif">`) וכפתור טורקיז מלא `צלם עכשיו` (`accept="image/*" capture="environment"`). המצלמה תמיד מחזירה JPEG ולכן היא גם מסלול המילוט מכשלי HEIC.
* דסקטופ (`@media (pointer: fine)`): כל הכרטיס הוא אזור גרירה. גבול מקווקו 3px טורקיז, ב-`dragover` הופך לקו מלא אדום והרקע ל-`--color-yellow` ב-12% אטימות.

**פורמטים ומגבלות**
* מתקבל: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.
* מקסימום קלט: 25MB. מעל זה: `הקובץ כבד מדי. עד 25 מגה.`
* HEIC: מנסים `createImageBitmap(file, { imageOrientation: 'from-image' })`. ספארי ב-iOS מפענח נייטיב. כרום דסקטופ ואנדרואיד לא, וה-promise נדחה. אין ספריית פענוח wasm (1.5MB על סלולר בשביל מקרה קצה). ההודעה: `הפורמט של התמונה לא נפתח כאן. שמור אותה כ-JPG, או צלם אותה עכשיו במצלמה.`

**צנרת עיבוד בצד לקוח** (`imagePipeline.ts`, רץ ב-`OffscreenCanvas` כשקיים, אחרת `HTMLCanvasElement`)
1. `createImageBitmap` עם `imageOrientation: 'from-image'`. זה מטפל ב-EXIF, ובלעדיו כל תמונת אייפון בפורטרט תיבנה שוכבת.
2. `work`: הצלע הארוכה ל-2000px, `toBlob('image/webp', 0.85)`. יעד ≤1.2MB. אם יצא מעל, ירידה ל-0.78 ומדידה חוזרת פעם אחת.
3. `map`: הצלע הארוכה ל-512px, WebP 0.9. זהו המקור למפת הגבהים.
4. `thumb`: 256px, WebP 0.8, לתיבת הדואר, לדף הטיוטה ולתמונת ה-OG.
5. מדידות על `map`: היסטוגרמת לומיננסיה (`0.2126R + 0.7152G + 0.0722B`), `meanLuma`, `contrastSpread` = אחוזון 95 פחות אחוזון 5, ובדיקת ערוץ אלפא.
6. שלוש העלאות במקביל: `drafts.generateUploadUrl` → `POST` → `storageId`.

**התראות איכות** (`PhotoQualityNotice`, שבב צהוב עם טקסט ink, אף פעם לא חוסם)
* צלע ארוכה קטנה מ-600px: `התמונה קטנה. בהדפסה זה יצא מרוח. עדיף תמונה גדולה יותר.`
* `meanLuma < 40`: `התמונה כהה מאוד. בהדפסה כמעט הכל ייצא שחור.`
* `meanLuma > 215`: `התמונה שרופה באור. הפרטים הבהירים ייעלמו.`
* `hasAlpha === true`: `יש ברקע שקיפות. אני אמלא אותה בצבע מלא.`
* `contrastSpread < 60` **לא נבדק כאן**. הוא נבדק במעבר לשלב 3, כי הוא רלוונטי רק לליתופן ולליתופן זוהר. אז מוצג: `התמונה שטוחה בגוונים. בליתופן זה כמעט לא ייראה. תבליט יעבוד עליה יותר טוב.` עם כפתור טורקיז `החלף לתבליט` וכפתור טקסט `בכל זאת ליתופן`.

אין זיהוי פנים ואין סינון תוכן אוטומטי. שי רואה כל תמונה בתיבת הדואר לפני שהוא מדפיס, וזה המנגנון.

**המצב אחרי ההעלאה:** התמונה מוצגת בכרטיס עם מסגרת cream בעובי 10px, צל רך, והטיה של 2- מעלות (הציטוט הישיר מ-gutzim, בלי המקף הארוך שלהם). מתחתיה כפתור טקסט `החלף תמונה`.

---

### A2. שלב 2: בוחרים מה מדפיסים

**רכיבים:** `StepPrintType.tsx`, `PrintTypeCard.tsx`

**פריסה:** 2 עמודות בנייד, 3 מ-768px, 4 מ-1280px. `gap: 12px`.
**כרטיס:** תמונה ריבועית (`aspect-square`, `object-cover`, radius 20px), שם בדיספליי 700 בגודל 1.05rem, שורת טאגליין ink/70 בגודל 0.85rem, שבב מחיר `מתחיל מ-₪45` (רקע ink ב-8%, ink מלא, 0.8rem, tabular-nums), ושבב טורקיז קטן שמסביר מה התצוגה עושה.
**מצב נבחר:** גבול אדום 3px, הרמה של 4px, `scale(1.02)`, תג ✓ עגול אדום בפינה העליונה, מעבר `220ms var(--ease-toy)`.

#### סט הפתיחה: 7 רשומות `printTypes`

| slug | שם בעברית | טאגליין | basePrice | complexity | refGrams | refHours | refSize | volExp | maxColors |
|---|---|---|---|---|---|---|---|---|---|
| `lithophane` | ליתופן | נדלק כשיש אור מאחור | 45 | 1.15 | 60 | 4.5 | 10x15 ס"מ | 2.0 | 1 |
| `relief-panel` | תבליט מהתמונה | בולט מהלוח, נוגעים בו | 55 | 1.25 | 85 | 6.0 | 12x17 ס"מ | 2.0 | 4 |
| `glow-lithophane` | ליתופן זוהר בחושך | ביום תמונה, בלילה זוהר | 62 | 1.20 | 70 | 5.0 | 10x15 ס"מ | 2.0 | 1 |
| `standee` | דמות עומדת למדף | עומדת לבד על המדף | 68 | 1.35 | 120 | 8.0 | 12 ס"מ גובה | 2.6 | 4 |
| `keychain` | מחזיק מפתחות | התמונה נוסעת איתך | 22 | 1.00 | 12 | 0.8 | 5 ס"מ | 2.4 | 4 |
| `magnet` | מגנט למקרר | מחזיק על המקרר באמת | 26 | 1.00 | 18 | 1.3 | 6x6 ס"מ | 2.0 | 4 |
| `framed` | תמונה במסגרת לקיר | נתלית כמו תמונה | 95 | 1.45 | 180 | 11.0 | 20x25 ס"מ | 2.0 | 4 |

**התיאורים (בקול של שי, נכנסים ל-`descriptionHe`, מוצגים בגיליון תחתון בלחיצה על "מה זה"):**

* **ליתופן**: `לוח דק בצבע אחד. איפה שהתמונה כהה אני מדפיס עבה, ואיפה שהיא בהירה אני מדפיס דק, ואז האור שעובר דרכו מצייר את התמונה. בלי אור מאחור הוא נראה כמו לוח לבן חלק. מגיע עם מעמד קטן.`
* **תבליט מהתמונה**: `לוח שטוח שהתמונה עולה ממנו החוצה, כמו מטבע. אפשר להעביר עליו יד ולהרגיש את הקווים. עובד הכי טוב על פנים גדולות ורקע פשוט.`
* **ליתופן זוהר בחושך**: `אותו לוח, בפילמנט שסופג אור ומחזיר אותו בחושך. משאירים אותו כמה דקות ליד מנורה והוא זוהר בערך שעה ואז נחלש. הזוהר ירקרק ואי אפשר לבחור לו צבע אחר.`
* **דמות עומדת למדף**: `גזרה של התמונה שעומדת על בסיס משלה. אני מנקה את הרקע, משאיר את מה שחשוב, ומדפיס בעובי של סנטימטר עם רגל מאחור.`
* **מחזיק מפתחות**: `קטן, חזק, עם חור לטבעת. אני מדפיס אותו במילוי גבוה כדי שלא יישבר בכיס. שם או תאריך אפשר להוסיף, תכתוב לי בוואטסאפ.`
* **מגנט למקרר**: `לוח קטן עם שקע מאחור למגנט עגול שאני מדביק בעצמי. נשאר על המקרר גם כשסוגרים חזק.`
* **תמונה במסגרת לקיר**: `הלוח הכי גדול שאני מדפיס, עם מסגרת שמודפסת יחד איתו ווו לתלייה מאחור. צבע אחד ללוח וצבע שני למסגרת.`

#### מה התצוגה התלת-ממדית עושה בפועל, לכל סוג

`previewMode` על רשומת ה-`printTypes` בוחר את הרכיב תחת `components/generator/viewer/`.

| previewMode | מה נבנה בפועל |
|---|---|
| `lithophane` | `PlaneGeometry(w, h, 256, 192)`, היסט קודקודים ב-JS: `t = 0.8 + (1 - luma) * 2.4` מ"מ (כהה = עבה), אחריו `computeVertexNormals()`. חומר `MeshPhysicalMaterial` עם `transmission: 0.85, thickness: 2, roughness: 0.45, ior: 1.5` בצבע הפילמנט. `RectAreaLight` לבן מאחורי הלוח, ומתג טורקיז **"תדליק את האור"** שמכבה ומדליק אותו. זו ההדגמה הכי חזקה באתר. |
| `relief` | אותה מפה, לא הפוכה (`t = 0.4 + luma * 3.6` מ"מ, בהיר = גבוה), `MeshStandardMaterial` אטום ב-`roughness 0.7`, מסגרת דקה בצבע 2. תאורת סטודיו של שלושה מקורות, בלי אור מאחור. |
| `standee` | סף לומיננסיה + marching squares על מפת ה-512 מפיק קונטור, ממנו `THREE.Shape` ו-`ExtrudeGeometry` בעומק 10 מ"מ, ועליו התבליט. בסיס גליל 6 מ"מ. **נפילה לאחור מוצהרת:** אם יצאו 0 קונטורים או יותר מ-4000 נקודות, נבנה לוח מעוגל עם התמונה כטקסטורה, ומופיעה שורה: `הגזרה האמיתית נעשית אצלי ביד. זו הדמיה גסה.` |
| `keychain` | `RoundedBoxGeometry(50, 50, 5, 4, 3)` עם התבליט על הפאה הקדמית, `TorusGeometry` לטבעת וחור 4 מ"מ. |
| `magnet` | לוח 60x60x5 מ"מ עם תבליט. סיבוב מעבר 90 מעלות חושף את השקע האחורי ודיסקית מגנט אפורה כהה. |
| `framed` | `THREE.Shape` עם `holes` → `ExtrudeGeometry` למסגרת בצבע 2, ובתוכה מישור התבליט בצבע 1. מישור קיר דהוי מאחור ב-35% אטימות, ושבב `בגודל אמיתי` לצד המודל. |

**רזולוציה לפי מכשיר:** `segX = min(256, floor(mapWidth / 2))`. אם `navigator.hardwareConcurrency <= 4` או `navigator.deviceMemory <= 4`, התקרה יורדת ל-160. היסט קודקודים ב-JS ולא ב-shader, כי `computeVertexNormals()` נותן נורמלים נכונים בחינם ואין תלות ב-`displacementMap`. עלות חד-פעמית ~40ms על 49 אלף קודקודים.

---

### A3. שלב 3: צבעים

**רכיבים:** `StepColors.tsx`, `FilamentSwatch.tsx`, `ExtraColorSheet.tsx`

**טבלת `filaments`**
```ts
filaments: defineTable({
  nameHe: v.string(),            // "אדום סוכריה"
  hex: v.string(),               // "#F5333F"
  finish: v.union(v.literal("matte"), v.literal("glossy"), v.literal("silk"),
                  v.literal("glow"), v.literal("wood"), v.literal("transparent")),
  emissiveHex: v.optional(v.string()),      // "#7CFFB2" לזוהרים
  costPerGramOverride: v.optional(v.number()),
  inStock: v.boolean(), sortOrder: v.number(), active: v.boolean(),
})
filamentPresets: defineTable({   // "הבחירה של שי"
  nameHe: v.string(), filamentIds: v.array(v.id("filaments")), sortOrder: v.number(),
})
```

**הגריד:** עיגולים 56px (יעד נגיעה 72px), טבעת cream בעובי 3px, שם מתחת ב-12px. `gap: 14px`.
טאבים של גימור מעל הגריד: `רגיל · משי · זוהר · עץ · שקוף`. שבב שאין ממנו מלאי מקבל `opacity .45` וכיתוב `אזל`.

**הסדר משמעותי.** צבע נבחר מקבל טבעת אדומה 3px ומספר סדר בתוך התג. מעל הגריד מוצגות התוויות לפי הסוג:
* `framed`: `צבע 1 - הלוח` / `צבע 2 - המסגרת`
* `standee`: `צבע 1 - הדמות` / `צבע 2 - הבסיס`
* שאר הסוגים: `צבע 1 - הגוף` והלאה.

**מקרה `maxColors === 1`** (ליתופן וליתופן זוהר): הגריד הופך לבחירה יחידה, והכותרת מוסברת: `בליתופן יש צבע אחד. העובי הוא מה שמצייר את התמונה.` גיליון הצבע החמישי לא קיים כאן.

**רגע הצבע החמישי הוא הצעה שנפתחת.**
לחיצה על הצבע החמישי לא נחסמת. עולה גיליון תחתון (`ExtraColorSheet`, ספרינג `stiffness 220, damping 18`, 280ms, מגיע עד 62% מגובה המסך):

> **רוצה עוד צבע?**
> ארבעה צבעים כלולים במחיר. כל צבע נוסף מוסיף ₪9, כי אני עוצר את ההדפסה באמצע, מחליף פילמנט ומתחיל את השכבה מחדש.
> `[ מוסיף אותו ]`  ← כפתור אדום מלא
> `נשאר עם ארבעה`  ← כפתור טקסט ink עם קו תחתון טורקיז

הסיבה המכנית היא מה שהופך את זה למכירה במקום למכשול. אחרי אישור נשמר `extraColorsAccepted = true` והגיליון לא חוזר; במקומו מופיע שבב צהוב מתחת לגריד: `צבע חמישי · ₪9`, ואחריו `צבע שישי · ₪9`.

**שורת "הבחירה של שי":** שלושה קומבינציות מוכנות מ-`filamentPresets`, כל אחת כשורת עיגולים חופפים בלחיצה אחת.

---

### A4. שלב 4: גודל וכמות

**רכיבים:** `StepSize.tsx`, `SizeScaleSilhouette.tsx`, `QuantityStepper.tsx`

**טבלת `sizePresets`**
```ts
sizePresets: defineTable({
  printTypeId: v.id("printTypes"),
  nameHe: v.string(),              // "בינוני"
  labelCm: v.string(),             // "10x15 ס\"מ"
  widthCm: v.number(), heightCm: v.number(), depthCm: v.number(),
  scaleFactor: v.number(),         // ביחס לגודל הייחוס: 0.8 / 1.0 / 1.3
  gramsOverride: v.optional(v.number()),   // אם שי הדביק מספר מהסלייסר, הוא גובר
  hoursOverride: v.optional(v.number()),
  sortOrder: v.number(), active: v.boolean(),
}).index("by_type", ["printTypeId"])
```

**בורר המידה:** סגמנטים אופקיים, 3 עד 4 אפשרויות, כל אחד עם המידה בס"מ ועם צללית SVG של המוצר לצד צללית יד בקנה מידה קבוע. הצללית מצוירת מחדש לפי `widthCm/heightCm` וזה מה שהופך מספר בס"מ לתחושה פיזית.

**כמות:** סטפר עם כפתורי 48px, טווח 1..25. שבב הנחה חי מתחת: כשעוברים סף הוא נכנס בקפיצה עם `--ease-toy` ומקבל רקע `--color-yellow` עם טקסט ink: `3 יחידות · 10% הנחה`.

**דחיפות:** מתג `צריך את זה עד תאריך` פותח בורר תאריך. אם התאריך קטן מ-`leadTimeDays` (שדה ב-`pricingSettings`, ברירת מחדל 7), אז `rush = true` והשורה מוצגת מיד: `דחוף מוסיף 25% ולפחות ₪15.` בלי הפתעה בחשיפת המחיר.

**מסירה:** שני רדיו גדולים: `איסוף עצמי (נסגור מקום בוואטסאפ)` · `משלוח לכתובת שלך ₪25`. אין שם עיר בשום מקום באתר.

---

### A5. שלב 5א: "בנה לי את המודל" ומצב ההמתנה

**רכיבים:** `StepBuild.tsx`, `BuildingState.tsx`, `PreviewStage.tsx` (טעינה דינמית), `lib/generator/heightmap.worker.ts`

תווית הכפתור: **`בנה לי את המודל`**. גלולה אדומה מלאה ברוחב מלא, 56px, עם סוויפ טורקיז שעובר עליה פעם אחת בכניסה.

בלחיצה, ברצף:
1. `drafts.patch` מיידי (בלי debounce).
2. `const PreviewStage = dynamic(() => import('./PreviewStage'), { ssr: false })`. כאן נוחת הצ'אנק של three.
3. Web Worker: מפענח את תמונת ה-512, ממיר ללומיננסיה `Float32Array`, מטשטש גאוסיאן ברדיוס 1.2 (מוריד רעש JPEG שהופך לחספוס בהדפסה), מנרמל בין אחוזון 5 לאחוזון 95, ומחזיר ב-transfer.
4. בניית הגאומטריה, חימום החומר, רינדור פריים אחד, ואז חשיפה.

**מצב ההמתנה: מינימום 2200ms גם אם הכל מוכן קודם.** מיידי מרגיש מזויף.
קובייה אדומה קטנה מתגלגלת ב-CSS 3D (לא three, כדי שתעבוד לפני שהצ'אנק נחת), פס התקדמות טורקיז בעובי 4px נמלא מ-0 ל-100 עם `cubic-bezier(.22,1,.36,1)`, וארבע שורות מתחלפות כל 550ms:
`קורא את התמונה` → `מודד את הצללים` → `בונה שכבות` → `מרים את המודל`

**כישלון אמיתי** (שגיאת worker, אין WebGL, אין `OffscreenCanvas` ואין fallback): לא מגיעים למבוי סתום. `FlatFallbackPreview` מרנדר בקנבס דו-ממדי אמבוס של התמונה בגוון הפילמנט הראשון, ומעליו שבב צהוב:
`המכשיר שלך לא מציג תלת ממד. הנה איך זה ייצא בערך, וההזמנה ממשיכה רגיל.`

---

### A6. שלב 5ב: חשיפת המודל

הקנבס תופס 4:5 בנייד, מקסימום `72dvh`, radius 28px, רקע cream עם וינייטה רדיאלית עדינה, גבול ink בעובי 2px.

**כניסה:** `scale 0.86 → 1` בספרינג (`stiffness 180, damping 16`), אטימות 0→1 ב-260ms, ובמקביל המצלמה עושה יאו איטי של 18 מעלות ב-1.2 שניות עם `easeOut`. המשתמש רואה שזה תלת-ממד בלי לגעת.

**`OrbitControls`:** `enablePan={false}`, `enableDamping` ב-0.08, `rotateSpeed 0.7`, `minPolarAngle 0.35`, `maxPolarAngle 2.4`, `minDistance`/`maxDistance` נעולים סביב גודל המודל. `touch-action: none` על הקנבס.
`dpr={[1, Math.min(devicePixelRatio, 2)]}`, `frameloop="demand"` עם `invalidate()` על שינוי בקונטרולס ובזמן אנימציית הכניסה. בתוך webview זה ההבדל בין סוללה חמה לקרירה.

**רמז ראשוני:** גליף יד קטן שמבצע סוויפ אחד ונעלם ב-`pointerdown` הראשון.

**שורת פעולות טורקיז מתחת לקנבס:** `אור מאחור` (ליתופן) · `חושך` (זוהר) · `סיבוב אוטומטי` · `צלם מסך` (`canvas.toDataURL` → הורדה בדסקטופ, פתיחה בטאב חדש בנייד).

**שורת כנות, תמיד גלויה, 13px ב-ink/65:**
`זו הדמיה. את המודל האמיתי אני בונה אצלי אחרי שנסגור פרטים.`

---

## PART C · מנוע התמחור

### C1. איך מעריכים גרמים ושעות

שי לא מנחש צפיפות ולא אחוזי מילוי. הוא **מדביק את שני המספרים שהסלייסר כבר נותן לו** לגודל ייחוס אחד לכל סוג הדפסה: `refGrams` ו-`refHours`. הקנה מידה עושה את השאר:

```
grams = sizePreset.gramsOverride ?? refGrams * scaleFactor ^ volumeExponent
hours = sizePreset.hoursOverride ?? refHours  * scaleFactor ^ volumeExponent
```

`volumeExponent` הוא 2.0 ללוחות שטוחים (העובי לא משתנה עם הגודל), 2.4 למחזיק מפתחות, 2.6 לדמות עומדת (גדל בשלושה מימדים אבל עם מילוי נמוך). אם שי פרס גודל מסוים בסלייסר, ה-override גובר על הנוסחה. זו הדרך לדיוק מלא בלי לוותר על נוחות.

### C2. טבלת `pricingSettings`

הטבלה **מוסיפה שורה בכל שמירה** במקום לעדכן. הפעילה היא בעלת ה-`version` הגבוה ביותר. זה נותן היסטוריה, ביטול, וקישור מכל הצעת מחיר לגרסה שלפיה חושבה.

```ts
pricingSettings: defineTable({
  version: v.number(),
  filamentCostPerGram: v.number(),   // 0.12   ₪ לגרם
  filamentWastePct: v.number(),      // 0.08   פרג', תמיכות, כישלונות
  machineRatePerHour: v.number(),    // 6      חשמל, בלאי, והזמן שלו ליד המדפסת
  setupFee: v.number(),              // 8      להזמנה, לא ליחידה
  marginMultiplier: v.number(),      // 1.35   הכפתור הגלובלי להעלאת כל המחירים
  includedColors: v.number(),        // 4
  extraColorSurcharge: v.number(),   // 9      ליחידה, לכל צבע מעבר לכלול
  finishSurcharge: v.object({        // ליחידה, נלקח המקסימום ולא הסכום
    matte: v.number(),               // 0
    glossy: v.number(),              // 0
    silk: v.number(),                // 6
    glow: v.number(),                // 12
    wood: v.number(),                // 8
    transparent: v.number(),         // 4
  }),
  quantityTiers: v.array(v.object({ minQty: v.number(), discountPct: v.number() })),
                                     // [{2,5},{3,10},{5,15},{10,22}]
  leadTimeDays: v.number(),          // 7
  rushFeePct: v.number(),            // 0.25
  rushFeeMin: v.number(),            // 15
  shippingPrice: v.number(),         // 25
  freeShippingOver: v.number(),      // 250
  minOrderTotal: v.number(),         // 35
  roundTo: v.number(),               // 5
  roundMode: v.union(v.literal("up"), v.literal("nearest"), v.literal("charm")),  // "up"
  priceNoteHe: v.string(),
  vatNoteHe: v.string(),
  savedAt: v.number(),
}).index("by_version", ["version"])
```

**למה מקסימום ולא סכום בתוספת הגימור:** אם בחרו שלושה פילמנטים זוהרים, שי לא מחליף שלוש פעמים למשהו יקר. הוא עובד עם חומר יקר, פעם אחת.

### C3. הנוסחה

`convex/pricing/engine.ts` הוא מודול טהור בלי תלות בקונבקס ובלי תלות ב-React, מיובא משני הצדדים.

```ts
export type QuoteInput = {
  printType: { basePrice: number; complexity: number; refGrams: number;
               refHours: number; volumeExponent: number; forcedFinish?: Finish };
  size: { scaleFactor: number; gramsOverride?: number; hoursOverride?: number };
  finishes: Finish[];        // הגימור של כל פילמנט שנבחר
  colorCount: number;
  quantity: number;
  rush: boolean;
  delivery: "pickup" | "shipping";
};

export type QuoteLine = { key: string; labelHe: string; amount: number; hintHe?: string };
export type Quote = {
  unitPrice: number; lines: QuoteLine[]; rawTotal: number;
  rounding: number; total: number; grams: number; hours: number;
  pricingVersion: number;
};

export function computeQuote(i: QuoteInput, s: PricingSettings): Quote {
  const scale = i.size.scaleFactor;
  const grams = i.size.gramsOverride ?? i.printType.refGrams * Math.pow(scale, i.printType.volumeExponent);
  const hours = i.size.hoursOverride ?? i.printType.refHours  * Math.pow(scale, i.printType.volumeExponent);

  const materialCost = grams * (1 + s.filamentWastePct) * s.filamentCostPerGram;
  const machineCost  = hours * s.machineRatePerHour;

  // המורכבות מכפילה רק את החלק המשתנה. basePrice הוא הרצפה שהעיצוב שווה.
  const unitCore   = i.printType.basePrice + (materialCost + machineCost) * i.printType.complexity;
  const unitMargin = unitCore * s.marginMultiplier;

  const extraColors     = Math.max(0, i.colorCount - s.includedColors);
  const colorSurcharge  = extraColors * s.extraColorSurcharge;
  const allFinishes     = i.printType.forcedFinish ? [...i.finishes, i.printType.forcedFinish] : i.finishes;
  const finishSurcharge = Math.max(0, ...allFinishes.map(f => s.finishSurcharge[f] ?? 0));

  const unitPrice = unitMargin + colorSurcharge + finishSurcharge;

  const tier = [...s.quantityTiers].filter(t => i.quantity >= t.minQty)
                                   .sort((a, b) => b.minQty - a.minQty)[0];
  const discountPct = tier?.discountPct ?? 0;
  const lineTotal   = unitPrice * i.quantity;
  const discount    = lineTotal * (discountPct / 100);

  let subtotal = lineTotal - discount + s.setupFee;
  const rush = i.rush ? Math.max(subtotal * s.rushFeePct, s.rushFeeMin) : 0;
  let beforeDelivery = subtotal + rush;

  if (beforeDelivery < s.minOrderTotal) beforeDelivery = s.minOrderTotal;

  const delivery = i.delivery === "pickup" ? 0
                 : (beforeDelivery >= s.freeShippingOver ? 0 : s.shippingPrice);

  const rawTotal = beforeDelivery + delivery;
  const total    = roundPrice(rawTotal, s.roundTo, s.roundMode);

  const lines: QuoteLine[] = [
    { key: "unit",     labelHe: `${printTypeNameHe} ×${i.quantity}`, amount: lineTotal },
    ...(discount        ? [{ key: "qtyDiscount", labelHe: `הנחת כמות ${discountPct}%`, amount: -discount }] : []),
    ...(colorSurcharge  ? [{ key: "colors",  labelHe: `${extraColors} צבעים נוספים`, amount: colorSurcharge * i.quantity, hintHe: "החלפת פילמנט באמצע" }] : []),
    ...(finishSurcharge ? [{ key: "finish",  labelHe: "חומר מיוחד", amount: finishSurcharge * i.quantity }] : []),
    { key: "setup",     labelHe: "הכנה וחיתוך", amount: s.setupFee },
    ...(rush            ? [{ key: "rush",     labelHe: "דחוף", amount: rush }] : []),
    ...(delivery        ? [{ key: "delivery", labelHe: "משלוח", amount: delivery }] : []),
  ];

  return { unitPrice, lines, rawTotal, rounding: total - rawTotal, total,
           grams, hours, pricingVersion: s.version };
}

export function roundPrice(v: number, step: number, mode: "up" | "nearest" | "charm") {
  if (mode === "nearest") return Math.round(v / step) * step;
  const up = Math.ceil(v / step) * step;
  return mode === "charm" ? up - 1 : up;
}
```

**עיגול: `up` לחמישה שקלים, וזו ברירת המחדל.** 187.43 הופך ל-190. מספר עגול נשמע כמו מחיר שאדם אמר, ו-189 נשמע כמו טריק של חנות. השדה `charm` קיים למקרה ששי ירצה אחרת, ומצריך שינוי אחד בפאנל.

**כפילות ההצגה:** כל שורה בפירוט מוצגת מעוגלת לשקל שלם, ושורת `עיגול` סופגת את ההפרש כדי שהחיבור על המסך יסתדר בדיוק לסכום.

### C4. מע"מ, חשבונית, והמשפט שחייב לשבת ליד המחיר

שי קטין ואין לו עוסק פטור. לכן:
* **המחיר הוא סופי ואין שורת מע"מ בשום מקום.** לא "כולל מע"מ", לא "לפני מע"מ", לא אחוז.
* `vatMode` בכלל לא קיים כשדה. אין מצב שני.
* שני המשפטים האלה יושבים מתחת למספר, 13px, ink/70, שתי שורות נפרדות. הם שדות `pricingSettings.priceNoteHe` ו-`vatNoteHe` כדי ששי יוכל לשנות אותם:

> `הצעת מחיר לפי מה שבחרת. סוגרים סופית בוואטסאפ.`
> `אני בן 13 ועדיין אין לי עוסק מורשה, אז אין חשבונית מס ואין מע"מ מעל המחיר.`

* משפט שלישי מתחת ל-CTA, 13px: `לא מחייב כלום. אפשר לשאול אותי שאלות לפני שמזמינים.`

### C5. שלוש דוגמאות עבודה, מספרים אמיתיים

הגדרות: `costPerGram 0.12` · `waste 8%` · `machineRate 6` · `setup 8` · `margin 1.35` · `includedColors 4` · `extraColor 9` · `silk 6, glow 12` · `tiers 2→5%, 3→10%, 5→15%, 10→22%` · `rush 25% (מינ' 15)` · `shipping 25, חינם מ-250` · `min 35` · `עיגול כלפי מעלה ל-5`

**דוגמה 1: מחזיק מפתחות, קטן, 2 צבעים, 3 יחידות, איסוף**

| שלב | חישוב | תוצאה |
|---|---|---|
| קנה מידה | `0.8 ^ 2.4` | 0.5854 |
| גרמים | `12 × 0.5854` | 7.02 גרם |
| שעות | `0.8 × 0.5854` | 0.468 שעות |
| חומר | `7.02 × 1.08 × 0.12` | ₪0.91 |
| מכונה | `0.468 × 6` | ₪2.81 |
| משתנה × מורכבות 1.0 | `3.72 × 1.0` | ₪3.72 |
| ליבה | `22 + 3.72` | ₪25.72 |
| × מרווח 1.35 | | **₪34.72 ליחידה** |
| צבעים / גימור | 2 ≤ 4, מאט | ₪0 |
| שורה | `34.72 × 3` | ₪104.16 |
| הנחת כמות 10% | | ‎-₪10.42 |
| הכנה | | ₪8 |
| מסירה | איסוף | ₪0 |
| גולמי | | ₪101.74 |
| **עיגול כלפי מעלה ל-5** | | **₪105** |

בפירוט על המסך: `מחזיק מפתחות ×3 ₪104` · `הנחת כמות 10% -₪10` · `הכנה וחיתוך ₪8` · `עיגול ₪3` · **`סה"כ ₪105`** (₪35 ליחידה).

**דוגמה 2: ליתופן, בינוני (גודל הייחוס), צבע אחד, יחידה אחת, משלוח**

| שלב | חישוב | תוצאה |
|---|---|---|
| קנה מידה | `1.0 ^ 2.0` | 1.0 |
| גרמים / שעות | | 60 גרם · 4.5 שעות |
| חומר | `60 × 1.08 × 0.12` | ₪7.78 |
| מכונה | `4.5 × 6` | ₪27.00 |
| משתנה × מורכבות 1.15 | `34.78 × 1.15` | ₪39.99 |
| ליבה | `45 + 39.99` | ₪84.99 |
| × מרווח 1.35 | | **₪114.74 ליחידה** |
| הכנה | | ₪8 |
| משלוח | 122.74 מתחת ל-250 | ₪25 |
| גולמי | | ₪147.74 |
| **עיגול** | | **₪150** |

בפירוט: `ליתופן ×1 ₪115` · `הכנה וחיתוך ₪8` · `משלוח ₪25` · `עיגול ₪2` · **`סה"כ ₪150`**.

**דוגמה 3: תמונה במסגרת, גדול, 6 צבעים (2 מעבר לכלול), אחד מהם משי, יחידה אחת, דחוף, משלוח**

| שלב | חישוב | תוצאה |
|---|---|---|
| קנה מידה | `1.3 ^ 2.0` | 1.69 |
| גרמים | `180 × 1.69` | 304.2 גרם |
| שעות | `11 × 1.69` | 18.59 שעות |
| חומר | `304.2 × 1.08 × 0.12` | ₪39.42 |
| מכונה | `18.59 × 6` | ₪111.54 |
| משתנה × מורכבות 1.45 | `150.96 × 1.45` | ₪218.90 |
| ליבה | `95 + 218.90` | ₪313.90 |
| × מרווח 1.35 | | ₪423.76 |
| 2 צבעים נוספים | `2 × 9` | ₪18 |
| גימור משי (מקסימום) | | ₪6 |
| **מחיר ליחידה** | | **₪447.76** |
| הכנה | | ₪8 |
| דחוף | `max(455.76 × 0.25, 15)` | ₪113.94 |
| משלוח | 569.70 מעל 250 | ₪0 |
| גולמי | | ₪569.70 |
| **עיגול** | | **₪570** |

### C6. פאנל התמחור באדמין

`/admin/pricing`. כל שדה מ-`pricingSettings` בטופס אחד, מחולק לחמש קבוצות: `חומר וזמן` · `צבעים וחומרים` · `כמות ודחיפות` · `מסירה ומינימום` · `עיגול והערות`.

**החלק שהופך אותו לשמיש: פאנל "בדיקה" דביק בצד.** שלוש ההזמנות מדוגמאות C5 מחושבות מחדש בזמן אמת בכל הקלדה, ומציגות את המחיר החדש ליד המחיר הישן עם חץ ואחוז שינוי. שי מזיז את `marginMultiplier` מ-1.35 ל-1.45 ורואה מיד ש-₪150 הפך ל-₪165. בלי זה הוא לא ידע מה כל כפתור עושה.

שמירה יוצרת גרסה חדשה. יש רשימת גרסאות עם `שחזר לגרסה 7`.

---

## PART D · חשיפת המחיר כרגע מעוצב

**רכיבים:** `PriceReveal.tsx`, `PriceTag.tsx`, `PriceBreakdown.tsx`

### D1. הלחיצה השנייה

מתחת לקנבס יושבת גלולה אדומה: **`כמה זה יוצא`**. המשתמש חייב לבקש את המחיר. הבקשה היא מה שהופכת את המספר לתשובה במקום להודעה.

### D2. הכניסה

בנייד הכרטיס עולה כגיליון תחתון עם ספרינג (`stiffness 240, damping 20`, חריגה של 6px). בדסקטופ הוא נכנס לצד הקנבס מימין עם `translateX(24px) → 0` ואטימות ב-260ms.

הכרטיס: רקע cream, radius 28px, גבול ink 2px, `box-shadow: 0 18px 0 -6px rgba(26,20,32,.08)`.

### D3. תג המחיר

צורת תג אמיתית ב-SVG: מלבן עם פינה קטומה ונקב עגול בפינה הימנית העליונה (RTL), מסובבת `-3deg`, בצבע `--color-red`, חופפת את הקצה העליון של הכרטיס ב-24px. אין חבל, אין ציור מיותר.

**טיפוגרפיה:**
* המספר: `--font-display` (Rubik) במשקל 800, `clamp(3.5rem, 14vw, 6rem)`, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.02em`, בצבע cream.
* **מלכודת RTL:** הסכום נכתב `<span dir="ltr">₪150</span>`. בלי `dir="ltr"` מנוע ה-bidi יזיז את סימן השקל לצד השני ברוב הדפדפנים בעברית.
* ניגודיות: cream על אדום מודד 3.64:1. זה עובר את סף 3:1 לטקסט גדול ב-18px/700 ומעלה. **אדום על cream אסור בטקסט בגודל גוף.**

### D4. ספירה עולה

מ-0 עד הסכום ב-900ms עם `easeOutExpo`, **בקפיצות של 5** כדי שלא יופיע אף מספר לא עגול בדרך. הנחיתה: `scale(1.06)` ב-140ms וחזרה, ומאחורי התג נדלקת הבזקה רדיאלית ב-`--color-yellow` שדוהה ב-320ms.
`prefers-reduced-motion: reduce`: אין ספירה, אין הבזקה, אין קפיצה. המספר נכנס באטימות 180ms.

### D5. מה מקיף את המספר

מלמעלה למטה בתוך הכרטיס:
1. תג המחיר עם הסכום.
2. `לפי מה שבחרת` ב-13px ink/60.
3. שורת התצורה, 15px ink: `ליתופן · 10x15 · צבע אחד · יחידה אחת`.
4. שתי שורות הכנות מ-C4.
5. כפתור טקסט **`מאיפה המחיר מגיע`** עם קו תחתון טורקיז.
6. `רוצה להוסיף משהו?`, טקסטאריה מקופלת, עד 120 תווים, נכנסת להודעת הוואטסאפ.
7. שני ה-CTA.

### D6. הפירוט

הרחבה חלקה בלי `max-height` מנוחש: `grid-template-rows: 0fr → 1fr` על עוטף עם `overflow: hidden`, מעבר 260ms.

```
ליתופן ×1                        ₪115
הכנה וחיתוך                        ₪8
משלוח                             ₪25
עיגול                              ₪2
─────────────────────────────────────
סה"כ                             ₪150
```

שורות שהן אפס לא מוצגות בכלל, חוץ משורת הבסיס. לשורות התוספת יש `hintHe` שנפתח בלחיצה: `החלפת פילמנט באמצע`. השורה האחרונה מודגשת ב-700 ומעליה קו ink בעובי 2px.

### D7. שני ה-CTA

* ראשי: גלולה אדומה מלאה, רוחב מלא, 56px, טקסט cream 18px/700, אייקון וואטסאפ כ-SVG inline: **`שלח לשי בוואטסאפ`**.
* משני: גלולה **מלאה בטורקיז עם טקסט ink** (ink על טורקיז מודד 7.9:1; טורקיז כטקסט על cream מודד 2.15:1 ולכן אסור): **`שמור את ההצעה`**. מעתיק את הקישור לטיוטה ומציג טוסט: `הקישור נשמר. אפשר לחזור מתי שרוצה.`

---

## PART E · המסירה לוואטסאפ

**רכיבים:** `WhatsAppButton.tsx`, `lib/generator/waMessage.ts`, `app/o/[code]/page.tsx`, `app/o/[code]/opengraph-image.tsx`, `convex/leads.ts`

### E1. הבעיה ופתרונה

`wa.me` יודע לשאת טקסט בלבד. הוא לא נושא תמונה. הפתרון: **דף הצעה ציבורי קצר, והתצוגה המקדימה של הקישור בוואטסאפ נושאת את התמונה בעצמה.**

1. ברגע שחשיפת המחיר קורית (לפני שהמשתמש לוחץ), רצה `leads.createFromDraft({ draftId, secret })`. היא מקפיאה את `quoteSnapshot`, מסמנת `status = "handoff"`, ומייצרת `publicCode` באורך **10 תווים** מאלפבית Crockford Base32 (בלי I, L, O, U). למה 10 ולא 6: 6 תווים נותנים כמיליארד צירופים וזה קצר מדי מול סריקה אוטומטית כשמדובר בתמונות של ילדים. 10 תווים נותנים ~1.1×10¹⁵ ועדיין קצר בכתובת.
2. `/o/K7M2QW9XT4` הוא דף שרת, `robots: noindex, nofollow`, שמציג את התמונה בגדול, את אותו צופה תלת-ממד במצב קריאה בלבד, את התצורה המלאה, את המחיר, ואת מועד היצירה.
3. **`opengraph-image.tsx`** מייצר תמונת 1200×630: רקע cream, תמונת הלקוח בצד ימין בחיתוך `cover` עם radius, ומשמאל `₪150` ענק ו-`SHAI 3D` באותיות לטיניות.
   **אין עברית בתמונת ה-OG.** Satori דורש טעינת buffer של גופן עברי ידנית, וסידור ה-bidi שלו לא אמין. אותו כלל שחל על gpt-image-2 חל גם כאן: כל עברית היא DOM חי.
   בפועל שי רואה בצ'אט את התמונה של הלקוח ואת המחיר בלי לפתוח כלום.

### E2. בניית הכתובת

```ts
const PHONE = "972585845083";           // בלי פלוס, בלי מקפים
const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
```

**כללי קידוד, כל אחד מהם נשבר בפועל אם מפרים אותו:**
* `encodeURIComponent` על כל ההודעה. **לא** `encodeURI` (משאיר `&`, `#`, `+` גולמיים ושובר את ה-query).
* **אסור `URLSearchParams`.** הוא הופך רווח ל-`+` ווואטסאפ יציג פלוס ממשי בטקסט.
* שורה חדשה היא `\n` בלבד, שהופך ל-`%0A`. אין `\r\n`: חלק מהלקוחות מציגים ריבוע.
* כל תו עברי הוא 3 בתים ב-UTF-8, כלומר 9 תווים בכתובת המקודדת.
* מפרידי מידות נכתבים באסקי: `10x15` עם האות x. הסימן `×` והסימנים הטיפוגרפיים מתהפכים בהקשר RTL בחלק מהלקוחות.
* אין אימוג'י. גם חוק הקופי אוסר, וגם כל אימוג'י עולה 12 תווים בכתובת.

**מגבלת אורך:** iOS חותך בסביבות 2000 תווים של טקסט מפוענח, וחלק מ-webview באנדרואיד נופלים סביב 8000 תווים של כתובת מלאה. לכן **תקרה קשיחה של 600 תווים מפוענחים**, שהם ~5400 תווים מקודדים. `buildWaMessage()` מודד ומקצץ לפי סדר עדיפות קבוע: קודם `note`, אחריו `מסירה`, אחריו `דחוף`. הברכה, הסוג, הגודל, הצבעים, הכמות, המחיר, הקישור והקוד לא נופלים לעולם. בדיקת יחידה נועלת את זה.

### E3. תבנית ההודעה

ההודעה נכתבת **בקולו של הלקוח**, כי הלקוח הוא זה ששולח אותה.

```
היי שי, בניתי הזמנה באתר.

מה: {printTypeNameHe}
גודל: {sizeLabel}
צבעים: {colorNames.join(", ")}
כמות: {quantity}
מסירה: {delivery === "pickup" ? "איסוף" : "משלוח"}
דחוף: עד {neededByHe}            ← רק אם rush
מחיר באתר: {total} שקל

הקישור עם התמונה והמודל:
{SITE_URL}/o/{code}

קוד: {code}

הערה: {note}                      ← רק אם קיימת
```

דוגמה מלאה, 231 תווים מפוענחים:

```
היי שי, בניתי הזמנה באתר.

מה: ליתופן
גודל: 10x15 ס"מ
צבעים: לבן חלבי
כמות: 1
מסירה: משלוח
מחיר באתר: 150 שקל

הקישור עם התמונה והמודל:
https://shai-print.vercel.app/o/K7M2QW9XT4

קוד: K7M2QW9XT4
```

`SITE_URL` מגיע מ-`process.env.NEXT_PUBLIC_SITE_URL`. עד שנרכש דומיין זו כתובת ה-Vercel; החלפה בעתיד היא שינוי משתנה סביבה אחד.
המחיר נכתב `150 שקל` ולא `₪150`: סימן השקל מקודד לשלושה בתים ולעיתים נדבק למספר הפוך בצד השני של הקו בהודעת RTL. המילה "שקל" חסינה.

### E4. איך הכפתור בנוי, ולמה זה קריטי

**ה-`href` מוכן לפני שנוגעים בכפתור.** קוד ה-`lead` נוצר בחשיפת המחיר, ולכן `WhatsAppButton` מרנדר `<a href={waUrl}>` אמיתי, לא כפתור שמריץ מוטציה אסינכרונית ואז מנווט. פתיחת חלון אחרי `await` מאבדת את מחוות המשתמש ונחסמת ב-webview של אינסטגרם ובספארי.

```tsx
<a
  href={waUrl}
  target={isDesktop ? "_blank" : undefined}
  rel={isDesktop ? "noopener noreferrer" : undefined}
  onClick={() => void trackHandoff()}   // מוטציית fire-and-forget, לא חוסמת ניווט
  className="..."
>שלח לשי בוואטסאפ</a>
```

**נייד:** בלי `target`, ניווט רגיל באותו טאב. `wa.me` מזהה את המכשיר ומעביר לאפליקציה.
**דסקטופ:** `target="_blank"`, נפתח `web.whatsapp.com`. מתחת לכפתור מופיעה, בדסקטופ בלבד, שורת מילוט: `אין וואטסאפ במחשב?` עם כפתור `העתק את ההודעה` ועם המספר כטקסט שאפשר לסמן: `058-584-5083`.

**מלכודת webview של אינסטגרם:** לפעמים המעבר לאפליקציה נחסם בשקט. 1500ms אחרי הלחיצה, אם `document.visibilityState === "visible"` ולא היה `pagehide`, עולה טוסט: `נראה שוואטסאפ לא נפתח מכאן. פתח את הדף בדפדפן, או העתק את ההודעה.` עם אותו כפתור העתקה.

### E5. אחרי המסירה

מסך אחרי הלחיצה (אותו שלב, החלפת תוכן): כותרת `ההודעה מוכנה בוואטסאפ`, שורה `אם היא לא נפתחה, הנה הקישור להזמנה שלך`, קישור לדף `/o/{code}`, וכפתור `בנה עוד אחד` שמאפס את הסטור ומשאיר את התמונה.
`leads` נשאר ב-`status: "handoff"`. אי אפשר לדעת אם המשתמש באמת לחץ שלח בתוך וואטסאפ, ולכן אין סטטוס בשם `נשלח`. שי מסמן `won` / `lost` ידנית מתיבת הדואר.

---

## נספח 1 · טוקנים שהמחולל משתמש בהם

```css
@theme {
  --color-cream:     #FFF7EC;
  --color-red:       #F5333F;
  --color-turquoise: #12BFB8;
  --color-yellow:    #FFC531;
  --color-ink:       #1A1420;

  --radius-card: 1.75rem;   /* 28px */
  --radius-tile: 1.25rem;   /* 20px */
  --radius-pill: 999px;

  --font-display: var(--font-rubik);   /* next/font/google, subsets: hebrew+latin, 700/800 */
  --font-body:    var(--font-heebo);   /* 400/500/700 */

  --ease-toy:  cubic-bezier(.34, 1.56, .64, 1);
  --ease-calm: cubic-bezier(.22, 1, .36, 1);
  --dur-fast: 180ms; --dur-base: 260ms; --dur-slow: 420ms;
}
```

**ניגודיות מדודה (יחסי WCAG, מחושבים על הפלטה הזו):**

| שילוב | יחס | שימוש מותר |
|---|---|---|
| ink על cream | 16.9:1 | הכל |
| cream על אדום | 3.64:1 | טקסט 18px/700 ומעלה בלבד |
| ink על טורקיז | 7.9:1 | הכל |
| ink על צהוב | 11.4:1 | הכל |
| טורקיז על cream | 2.15:1 | **אסור כטקסט.** רק מילויים, טבעות, קווים תחתונים |
| אדום על cream | 4.3:1 | כותרות בלבד, לא טקסט גוף |

`framer-motion` נטען רק בצ'אנק של `/generator`. שאר האתר רץ על אנימציות CSS.

---

## נספח 2 · עץ הקבצים

```
app/generator/page.tsx                       // שרת: prefetch ל-printTypes/filaments/settings
app/generator/GeneratorClient.tsx
app/o/[code]/page.tsx
app/o/[code]/opengraph-image.tsx
app/admin/inbox/page.tsx
app/admin/pricing/page.tsx

components/generator/StepShell.tsx
components/generator/ProgressRail.tsx
components/generator/StepPhoto.tsx
components/generator/PhotoDropzone.tsx
components/generator/PhotoQualityNotice.tsx
components/generator/StepPrintType.tsx
components/generator/PrintTypeCard.tsx
components/generator/StepColors.tsx
components/generator/FilamentSwatch.tsx
components/generator/ExtraColorSheet.tsx
components/generator/StepSize.tsx
components/generator/SizeScaleSilhouette.tsx
components/generator/QuantityStepper.tsx
components/generator/StepBuild.tsx
components/generator/BuildingState.tsx
components/generator/PreviewStage.tsx        // dynamic(ssr:false)
components/generator/FlatFallbackPreview.tsx
components/generator/viewer/Scene.tsx
components/generator/viewer/LithophaneMesh.tsx
components/generator/viewer/ReliefMesh.tsx
components/generator/viewer/StandeeMesh.tsx
components/generator/viewer/KeychainMesh.tsx
components/generator/viewer/MagnetMesh.tsx
components/generator/viewer/FramedMesh.tsx
components/generator/viewer/ViewerControls.tsx
components/generator/PriceReveal.tsx
components/generator/PriceTag.tsx
components/generator/PriceBreakdown.tsx
components/generator/WhatsAppButton.tsx

lib/generator/store.ts                       // zustand + persist
lib/generator/imagePipeline.ts
lib/generator/heightmap.worker.ts
lib/generator/marchingSquares.ts
lib/generator/waMessage.ts
lib/generator/format.ts                      // ils(), tabular

convex/schema.ts
convex/printTypes.ts  convex/filaments.ts  convex/sizePresets.ts
convex/pricingSettings.ts  convex/drafts.ts  convex/leads.ts  convex/quotes.ts
convex/pricing/engine.ts  convex/pricing/defaults.ts
convex/crons.ts
```

---

## נספח 3 · בדיקות קבלה

1. `computeQuote` מחזיר בדיוק 105, 150 ו-570 עבור שלוש הדוגמאות של C5. בדיקת יחידה נעולה.
2. שינוי `marginMultiplier` ל-1.45 בפאנל האדמין מזיז את דוגמה 2 מ-₪150 ל-₪165 בלי דיפלוי.
3. `buildWaMessage` על התצורה המקסימלית (הערה מלאה, דחוף, 6 צבעים) מחזיר מתחת ל-600 תווים מפוענחים.
4. הכתובת שנבנתה נפתחת באפליקציית וואטסאפ באייפון ובאנדרואיד, וכל הטקסט העברי מגיע שלם.
5. הדבקת הקישור `/o/{code}` בצ'אט וואטסאפ מציגה תצוגה מקדימה עם תמונת הלקוח ועם המחיר.
6. רענון הדף באמצע שלב 3 משחזר תמונה, סוג, וצבעים.
7. סגירת הדפדפן בשלב 3 יוצרת שורת "ננטש" ב-`/admin/inbox` תוך 30 דקות.
8. העלאת HEIC בכרום אנדרואיד מציגה את הודעת ההחלפה ואת כפתור המצלמה, בלי קריסה.
9. כיבוי WebGL בדפדפן מפעיל את `FlatFallbackPreview` וההזמנה ממשיכה עד הוואטסאפ.
10. `prefers-reduced-motion` מבטל את הספירה העולה, את ההבזקה ואת ספרינג הגיליון.
11. אין באתר את המחרוזות `מע"מ כולל`, `לפני מע"מ`, `לסיכום`, `בשורה התחתונה`, `לא רק`, ואין מקף ארוך מוקף רווחים. בדיקת grep ב-CI על `app/`, `components/` ועל תוכן ה-seed.
12. הקרון מוחק טיוטה בת 46 יום ואת שלושת הקבצים שלה.
