# 09c · קופי האתר · כל מחרוזת חוזרת

**Every recurring Hebrew string on the site, ready to paste into `src/content/`.**

מסמך זה מכיל טקסט, לא תיאור של טקסט. כל מפתח כאן הוא היעד בפועל בקוד.
הסמכות עליו: `09-story-and-site-copy.md` (חלק א, הקול) ו-`DECISIONS.md`. איפה ש-`03`, `04` או `05`
סותרים אותם, `09` גובר, וההכרעה מתועדת בטבלת ההכרעות למטה.

מה **לא** כאן: נרטיב עמוד `/about` (הוא `09b`), מחרוזות הניהול (`06` C.21, C.22), תיאורי alt לתמונות
(`08`).

---

## 0 · מפת קבצי היעד

| קובץ | מה יושב בו | מקור |
|---|---|---|
| `src/content/nav.ts` | ניווט ראשי, פוטר, סרגל דביק | סטטי |
| `src/content/global.ts` | הודעת מערכת, כותרת, פוטר, 404, שגיאות רוחביות | סטטי + `siteSettings` |
| `src/content/home.ts` | כל דף הבית | סטטי (LCP) |
| `src/content/products.ts` | קטלוג, סינון, מיון, מצב ריק | סטטי |
| `src/content/product.ts` | תוויות דף מוצר, מפרט, צופה | סטטי |
| `src/content/generator.he.ts` | המחולל במלואו, כולל בלוק הכנות | סטטי, ניתן לעריכה מהניהול בהמשך |
| `src/content/contact.ts` | יצירת קשר, טופס, שעות, משלוח | סטטי + `siteSettings` |
| `src/content/faq.ts` | 5 שאלות ותשובות | סטטי |
| `src/content/meta.ts` | title, description, OG | סטטי |
| `src/lib/whatsapp.ts` | תבניות ההודעות | קוד |

ערכים שמגיעים מ-`siteSettings` (שי עורך מהניהול) מסומנים בכל בלוק כ**ברירת מחדל**. הם חייבים ערך
בקוד, כי דף שנטען לפני שהשאילתה חזרה לא יכול להציג שדה ריק.

---

## 1 · טבלת ההכרעות: איפה הקופי סוטה ממסמך נעול

כל שורה כאן היא שינוי מודע מול `03`, `04` או `05`. אף אחת מהן אינה טעות הקלדה.

| # | מה היה | מה נכתב כאן | למה |
|---|---|---|---|
| 1 | `בחר תמונה` · `צלם עכשיו` · `בנה לי את המודל` · `שלח לשי בוואטסאפ` · `כבו את האור` · `גררו לסובב` · `סובבו אותי` · `תעלו תמונה` | `לבחור תמונה` · `לצלם עכשיו` · `לבנות את הדגם` · `לשלוח לשי בוואטסאפ` · `לכבות את האור` · `לגרור כדי לסובב` · `אפשר לסובב אותו` · `מעלים תמונה` | `09` §5: אין ציווי ישיר בשום מקום. כפתור בשם פועל, הוראה בבינוני סתמי |
| 2 | `בואו נדבר` (h1 יצירת קשר, h2 סגירת הבית) | `כותבים לי` · `מה בא לכם שאדפיס?` | `בואו` הוא ציווי. ההחלפה שומרת על החום בלי לשבור את הכלל. אם אריאל מכריע ש"בואו נדבר" עובר, זו החזרה של שתי מחרוזות |
| 3 | `תלת מימד` (ב-`03` §4.3, `05` C.5, ההירו) | `תלת ממד` | `02` §5, `09` §6: כתיב נעול |
| 4 | `₪45` · `₪9` · `₪25` · `₪150` | `45 ש״ח` · `9 ש״ח` · `25 ש״ח` · `150 ש״ח` | `09` §6: אין `₪` צמוד לספרה בטקסט עברי. סימן השקל נשאר **רק** בתג המחיר הגרפי, שם הוא עטוף `dir="ltr"` |
| 5 | `מ"מ` · `ס"מ` · `סה"כ` · `מע"מ` | `מ״מ` · `ס״מ` · `סך הכול` · `מע״מ` | `02` §5 גרשיים U+05F4. `סה״כ` הוחלף למילים כי הוא נכנס גם להודעת וואטסאפ |
| 6 | `המודל שלך` · `כמה זה יוצא` (יחיד) · `המכשיר שלך` · `לכתובת שלך` | `הדגם שלכם` · `המכשיר שלכם` · `לכתובת שלכם` | `03` פונה בלשון רבים בכל הקופי הנעול שלו, `04` בלשון יחיד. נבחר **רבים** בכל האתר |
| 7 | `המודל` בשפת המחולל | `הדגם` | `05` C.6 כבר קובע `לבנות את הדגם`. מילה אחת לאובייקט מודפס, בקטלוג ובמחולל |
| 8 | h2 בטיזר הסיפור בדף הבית = ציטוט הסרט | h2 חדש: `מצאתי דרך משלי.` | `09` §2: ציטוט הסרט מופיע **פעם אחת בכל האתר**, בסוף `/about`. `grep -n "אלא" src/content/` חייב להחזיר שורה אחת |
| 9 | `איסוף מ{עיר}` (פוטר, דף מוצר) | `איסוף עצמי בתיאום` | `04` A4: אין שם עיר בשום מקום באתר. זו החלטת בטיחות על קטין, והיא גוברת על הפירוט בפוטר |
| 10 | `נמחקת אחרי 45 יום` (`04` B6) | `נמחקת אחרי 7 ימים` | `DECISIONS.md`: 7 ימים, אושר. **הקרון ב-`convex/crons.ts` חייב להשתנות ל-7, אחרת הקופי משקר** |
| 11 | `התמונה נשארת אצלכם במכשיר עד הרגע שאתם שולחים` (`05` C.1) | `נבנית מהתמונה שלכם ישר בדפדפן, בלי לחכות לשום שרת` | לפי `04` B4 התמונה עולה לקונבקס מיד בסיום ההעלאה. המשפט המקורי היה הבטחה שאי אפשר לקיים |
| 12 | `אין לי עוסק מורשה` | `אין לי עוסק` | `DECISIONS.md`: אין עוסק פטור ואין עוסק מורשה. הניסוח הקודם משתמע שיש פטור |
| 13 | `עד ארבעה צבעים` (מילים) | `עד 4 צבעים` (ספרות) | `09` §6: ספרות מ-2 ומעלה. מילים נשמרות לעמוד הסיפור בלבד |

---

## 2 · GLOBAL

### 2.1 הודעת המערכת · `src/content/global.ts` + `siteSettings`

```
global.announcement.text            משלוחים לכל הארץ. איסוף עצמי בתיאום.
global.announcement.linkLabel       לפרטים
global.announcement.dismissAria     לסגור את ההודעה
```
`text` הוא **ברירת המחדל** של `siteSettings.announcementHe`. המילה שנצבעת בטורקיז: `איסוף`.

### 2.2 ניווט · `src/content/nav.ts`

```
nav.items[0].label   דגמים          href  /products
nav.items[1].label   המחולל         href  /generator
nav.items[2].label   הסיפור שלי     href  /about
nav.items[3].label   יצירת קשר      href  /contact
```

### 2.3 כותרת עליונה

```
global.header.cta                להפוך תמונה להדפסה
global.header.wordmarkAria       שי איזנשטט, לדף הבית
global.header.menuOpenAria       לפתוח תפריט
global.header.menuCloseAria      לסגור תפריט
global.header.skipLink           לדלג לתוכן
global.brandName                 שי איזנשטט
```

### 2.4 תפריט נייד

```
global.mobileNav.primaryCta      להפוך תמונה להדפסה
global.mobileNav.secondaryCta    לכתוב לשי בוואטסאפ
global.mobileNav.socialLine      אינסטגרם · טיקטוק
```
`[אריאל: לוודא שיש חשבון אינסטגרם וחשבון טיקטוק פעילים. אם אין, השורה יורדת ולא מוחלפת בפלייסהולדר]`

### 2.5 סרגל דביק · `StickyActionBar`

```
global.stickyBar.generator.primary     להפוך תמונה להדפסה
global.stickyBar.generator.secondary   דגמים
global.stickyBar.product.primary       לשלוח לשי בוואטסאפ
global.stickyBar.catalog.primary       להפוך תמונה להדפסה
global.stickyBar.catalog.secondary     וואטסאפ
global.stickyBar.contact.primary       לפתוח וואטסאפ
global.stickyBar.contact.secondary     למלא טופס
```

### 2.6 פוטר

```
global.footer.spine                    הופך רעיונות לדברים אמיתיים.
global.footer.ctaLabel                 וואטסאפ

global.footer.columns.nav.title        ניווט
global.footer.columns.nav.items        דגמים · המחולל · הסיפור שלי · יצירת קשר

global.footer.columns.hours.title      שעות
global.footer.columns.hours.lines[0]   ראשון עד חמישי 16:00-20:00
global.footer.columns.hours.lines[1]   שישי 09:00-13:00
global.footer.columns.hours.lines[2]   שבת סגור

global.footer.columns.shipping.title      משלוח ואיסוף
global.footer.columns.shipping.lines[0]   איסוף עצמי בתיאום
global.footer.columns.shipping.lines[1]   משלוח עד הבית 25 ש״ח
global.footer.columns.shipping.lines[2]   מוכן תוך 3 ימי עבודה

global.footer.noPaymentNote            אין תשלום באתר. סוגרים הכול בוואטסאפ.
global.footer.credit                   אריאל · 2026
```
הנקודה ב-`spine` היא אדומה. `noPaymentNote` היא השורה הטורקיז, והיא לא אותיות קטנות.
`[אריאל: לאשר את השעות ואת מחיר המשלוח מול שי וההורים לפני עלייה לאוויר]`

### 2.7 עמוד 404 · `src/app/not-found.tsx`

```
global.notFound.title        הדף הזה יצא עקום
global.notFound.body         בהדפסה הייתי מדפיס אותו שוב. כאן אפשר פשוט לחזור אחורה.
global.notFound.tilesTitle   אולי חיפשתם את זה
global.notFound.homeLink     לחזור לדף הבית
global.notFound.imageAlt     סבך של חוט הדפסה טורקיז
```
שלוש האריחים שמתחת: `דגמים` · `המחולל` · `הסיפור שלי`.

### 2.8 שגיאות ומצבים רוחביים

הודעה ברמת מסך היא משפט מלא עם נקודה. שגיאת שדה נכתבת בלי נקודה. אף אחת מהן לא מאשימה את המבקר.

```
global.error.boundary.title     זה נפל לי כאן
global.error.boundary.body      אני מתקן. בינתיים אפשר לחזור לדף הבית או לכתוב לי בוואטסאפ.
global.error.retry              לנסות שוב
global.error.generic            משהו נתקע אצלי. שווה לנסות שוב עוד רגע.
global.error.offline            אין חיבור לאינטרנט כרגע. ברגע שהוא חוזר אפשר להמשיך מכאן.
global.error.tooManyRequests    יותר מדי בקשות ברצף. עוד דקה זה נפתח.
global.loading.generic          רגע אחד
global.loading.aria             טוען תוכן
```

### 2.9 מטא ו-Open Graph · `src/content/meta.ts`

```
meta.site.titleTemplate     %s | שי איזנשטט
meta.site.defaultTitle      שי איזנשטט · הדפסות תלת ממד
meta.site.description       אני בן 13 ואני מדפיס בתלת ממד. שולחים לי תמונה, בוחרים צבעים, ורואים
                            איך זה ייראה עוד לפני שמזמינים.

meta.home.title             שי איזנשטט · הופך רעיונות לדברים אמיתיים
meta.home.description       מדפיס בתלת ממד, בן 13, ומקבל הזמנות. שולחים תמונה, בוחרים צבעים,
                            ורואים את הדגם ואת המחיר לפני שמזמינים.

meta.products.title         דגמים
meta.products.description   כל הדגמים שאני מדפיס, עם מחיר ובצבעים שבוחרים.

meta.generator.title        להפוך תמונה להדפסה
meta.generator.description  מעלים תמונה, בוחרים מה מדפיסים ובאיזה צבעים, ורואים את הדגם ואת המחיר.

meta.about.title            הסיפור שלי
meta.about.description      אני שי, בן 13. זה מה שקרה בדרך, ואיך הגעתי למדפסת.

meta.contact.title          יצירת קשר
meta.contact.description    כותבים לי בוואטסאפ ואני עונה בעצמי.
```
בתמונות ה-OG שמיוצרות ב-`next/og` אין עברית (`04` E1). הטקסט שם לטיני: `SHAI 3D`.

---

## 3 · HOME · `src/content/home.ts`

### 3.1 הירו

```
home.hero.eyebrow            מדפיס בתלת ממד, בן 13, ומקבל הזמנות
home.hero.headline.line1     הופך רעיונות
home.hero.headline.line2     לדברים אמיתיים.
home.hero.subhead            שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה. אפשר לראות
                             איך זה ייראה עוד לפני שמזמינים.
home.hero.primaryCta         להפוך תמונה להדפסה        →  /generator
home.hero.secondaryCta       לראות דגמים                →  /products
```

**המילה שנושאת את מכשיר הטוש: `אמיתיים`.** מילה אחת, בשורה השנייה של ה-h1, בטורקיז, מתוך
`MarkerHighlight`. היא המופע היחיד של המכשיר בדף הבית ואחד משלושה מופעים באתר כולו (הירו · טיזר
הסיפור · המשפט הסוגר ב-`/about`). הנקודה שאחריה היא `<span class="text-red">.</span>` ב-`1.15em`,
והיא לא חלק מהטוש.

מבנה הרינדור:
```tsx
<h1>
  הופך רעיונות<br />
  לדברים <MarkerHighlight color="turquoise">אמיתיים</MarkerHighlight>
  <span className="text-red">.</span>
</h1>
```

### 3.2 שורת האמון

```
home.trust.items[0]   40+ הדפסות שיצאו מהבית
home.trust.items[1]   מוכן תוך 3 ימים
home.trust.items[2]   איסוף עצמי או משלוח
```
ברירת מחדל ל-`siteSettings.trustStats`. שלושה פריטים, לא שניים ולא ארבעה.
`[אריאל: לאמת מול שי כמה הדפסות באמת יצאו עד היום. מספר שאי אפשר להגן עליו מוריד את כל האתר,
כי כל הנכס שלו הוא שהסיפור נכון. אם אין ספירה, השורה מוחלפת ב"ההזמנות כבר מגיעות"]`

### 3.3 איך זה עובד

```
home.how.heading                איך זה עובד

home.how.steps[0].title         שולחים תמונה
home.how.steps[0].body          כל תמונה מהטלפון מתאימה.
home.how.steps[1].title         בוחרים צבעים
home.how.steps[1].body          עד 4 צבעים בהדפסה אחת.
home.how.steps[2].title         מקבלים
home.how.steps[2].body          איסוף עצמי או משלוח עד הבית.

home.how.invite.heading         רוצים לראות איך התמונה שלכם נראית מודפסת?
home.how.invite.cta             להפוך תמונה להדפסה
```
המספור הצהוב (3, 2, 1 מימין לשמאל) הוא גרפיקה, לא מחרוזת.

### 3.4 טיזר המוצרים

```
home.products.heading   מה כבר מודפס אצלי
home.products.cta       לכל הדגמים        →  /products
```

### 3.5 רצועת הגלריה

```
home.gallery.heading    כל אחד מהדברים האלה יצא מהמדפסת שלי.
home.gallery.pauseAria  להשהות את הגלריה
```
אין כאן CTA, בכוונה.

### 3.6 טיזר הסיפור

```
home.story.eyebrow       קצת עליי
home.story.heading       מצאתי דרך משלי.
home.story.lines[0]      לא תמיד הצלחתי לקרוא את מה שהיה על הדף.
home.story.lines[1]      היום אני מודד, מדפיס, ומתקן עד שזה יוצא נכון.
home.story.link          לקרוא את הסיפור המלא        →  /about
```
**המילה שנושאת את הטוש כאן: `דרך`, בצהוב** (המסגרת דיו, וטורקיז נופל עליה בניגודיות). הנקודה
נשארת בקרם, בלי אדום, כי אדום על דיו לא עומד בניגודיות.

הכותרת הקודמת בטיוטת `03` הייתה ציטוט הסרט. הוא ירד מכאן לפי הכרעה 8 בטבלה למעלה. הציטוט
`"לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם"` יושב אך ורק בשורה האחרונה של `/about`,
ואין לו וריאציה, פרפרזה או הד באף מקום אחר.

שתי השורות הן העיבוד הישיר של שתי עובדות מהסיפור: הדיסלקציה, ומה שהוא עושה היום. אין בהן טענה
רגשית ואין בהן מילה אחת שמבקשת אהדה, וזה בדיוק מה שמייצר את הלחיצה.

### 3.7 בלוק הסגירה

```
home.closing.heading       מה בא לכם שאדפיס?
home.closing.sub           כותבים לי בוואטסאפ, מספרים מה בא לכם, ואני עונה.
home.closing.primaryCta    לכתוב לשי בוואטסאפ
home.closing.secondaryCta  לראות דגמים
home.closing.note          בדרך כלל אני חוזר תוך כמה שעות.
```
רקע אדום מלא, ולכן ה-CTA מתהפך: מילוי קרם עם טקסט דיו. הודעת הוואטסאפ שיוצאת מכאן היא
`wa.messages.homeClosing` (סעיף 7.3).

---

## 4 · PRODUCTS · `src/content/products.ts`

### 4.1 כותרת

```
products.header.heading   הדגמים שלי
products.header.sub       כל אחד מהם אפשר להזמין בצבעים שאתם בוחרים.
```

### 4.2 תוויות סינון

```
products.filters.trigger              סינון
products.filters.triggerActive        סינון ({n})
products.filters.clear                לנקות סינון
products.filters.sheetTitle           סינון
products.filters.sheetApply           להציג {n} דגמים
products.filters.sheetApplyOne        להציג דגם אחד
products.filters.sheetApplyNone       אין דגם שמתאים

products.filters.category.label       קטגוריה
products.filters.category.all         הכול
products.filters.category.figures     דמויות ופסלונים
products.filters.category.home        לבית
products.filters.category.gifts       מתנות
products.filters.category.keychains   מחזיקי מפתחות
products.filters.category.lithophane  ליתופן ותמונות
products.filters.category.games       משחקים
products.filters.category.utility     שימושי

products.filters.color.label          צבע
products.filters.color.soldOut        אזל

products.filters.feature.label        מאפיין
products.filters.feature.glow         זוהר בחושך
products.filters.feature.3d           אפשר לסובב בתלת ממד
products.filters.feature.custom       אפשר להתאים אישית

products.filters.price.label          מחיר
products.filters.price.0-30           עד 30 ש״ח
products.filters.price.30-60          30 עד 60
products.filters.price.60-120         60 עד 120
products.filters.price.120+           מעל 120
```

### 4.3 תוויות מיון

```
products.sort.label         מיון
products.sort.featured      מומלצים
products.sort.new           חדש אצלי
products.sort.price-asc     מחיר: מהנמוך
products.sort.price-desc    מחיר: מהגבוה
```

### 4.4 ספירת תוצאות ותגי כרטיס

```
products.resultCount        {n} דגמים
products.resultCountOne     דגם אחד

products.badges.threeD          3D
products.badges.threeDAria      אפשר לסובב בתלת ממד
products.badges.glow            זוהר בחושך
products.badges.new             חדש
products.card.rotateHint        אפשר לסובב אותו
products.card.priceSuffix       ש״ח
products.card.linkAria          {nameHe}, {price} ש״ח
```
`products.badges.threeD` הוא התג שמסמן מוצר שאפשר לבדוק אותו בתלת ממד. הוא מופיע רק כשקיים
`modelGlbUrl`, כי הבטחה בגריד שדף המוצר לא מקיים היא הדבר היחיד שהורס אמון מהר יותר ממחיר מופתע.
`products.card.rotateHint` נחשף בריחוף בדסקטופ בלבד.

### 4.5 מצב ריק

```
products.empty.title         אין לי דגם כזה עדיין.
products.empty.body          אפשר לבקש ממני להדפיס בדיוק את מה שחיפשתם.
products.empty.primaryCta    לכתוב לשי בוואטסאפ
products.empty.secondaryCta  לנקות סינון
```
זה מסך המרה, ולכן הוא נושא את ה-CTA האדום של העמוד. ההודעה שיוצאת ממנו נושאת את הסינון הפעיל
(`wa.messages.catalogEmpty`, סעיף 7.3).

### 4.6 רצועת המחולל בתוך הגריד

```
products.strip.line   לא מצאתם בדיוק את מה שרציתם? מעלים תמונה ואני מדפיס אותה.
products.strip.cta    להפוך תמונה להדפסה
```

---

## 5 · PRODUCT DETAIL · `src/content/product.ts`

### 5.1 ראש העמוד ופאנל הקנייה

```
product.breadcrumb.root       דגמים
product.price.suffix          ש״ח
product.price.each            ליחידה
product.color.label           צבע
product.color.glowChip        זוהר בחושך
product.color.soldOut         אזל
product.quantity.label        כמות
product.quantity.decAria      פחות אחד
product.quantity.incAria      עוד אחד
product.quantity.max          לכמות גדולה יותר כותבים לי ואני בונה מחיר.

product.cta.primary           לשלוח לשי בוואטסאפ
product.cta.secondary         יש לי שאלה על הדגם הזה

product.assurances[0]         מוכן תוך 3 ימים
product.assurances[1]         איסוף עצמי או משלוח
product.assurances[2]         אין תשלום באתר, סוגרים בוואטסאפ

product.makerNote.line        שי, בן 13, מדפיס כל הזמנה בעצמו.
product.makerNote.link        קצת עליי        →  /about
```

### 5.2 הצופה בתלת ממד

```
product.viewer.dragHint         לגרור כדי לסובב
product.viewer.thumb3d          תלת ממד
product.viewer.reset            לחזור להתחלה
product.viewer.autoRotate       סיבוב אוטומטי
product.viewer.magnetHint       לסובב ולראות את הגב
product.viewer.loading          בונה את התצוגה
product.viewer.loadFailed       התצוגה בתלת ממד לא נטענה. אפשר להזמין גם ככה, ואני שולח צילום
                                של ההדפסה לפני שהיא יוצאת אליכם.
product.viewer.noWebgl          הדפדפן הזה לא מציג תלת ממד. יש כאן תמונה שמסתובבת, והמידות
                                והמחיר נשארים מדויקים.
```

### 5.3 טבלת המפרט

```
product.spec.heading            מפרט
product.spec.rows.dimensions    מידות
product.spec.rows.material      חומר
product.spec.rows.printTime     זמן הדפסה
product.spec.rows.weight        משקל
product.spec.rows.layer         עובי שכבה
product.spec.rows.colors        צבעים אפשריים
product.spec.rows.leadTime      מוכן תוך

product.spec.units.mm           מ״מ
product.spec.units.grams        גרם
product.spec.units.days         ימים
product.spec.empty              עוד לא מדדתי את זה
```
פורמט ערכים (`format.ts`, כל אחד עטוף `<bdi>`):
```
מידות        60x22x4 מ״מ
חומר         PLA · PETG · TPU גמיש · PLA משי · PLA זוהר
זמן הדפסה    2 שעות ו-40 דקות     ·     45 דקות
משקל         38 גרם
עובי שכבה    0.2 מ״מ
מוכן תוך     3 ימים
```

### 5.4 תיאור ומוצרים קשורים

```
product.description.heading   על הדגם
product.related.heading       עוד דברים שיצאו לי מהמדפסת
```

### 5.5 דגם שאינו קיים

```
product.notFound.title        הדגם הזה כבר לא באתר
product.notFound.body         לפעמים אני מוריד דגם כדי לשפר אותו. אפשר לראות מה שיש עכשיו,
                              או לכתוב לי מה חיפשתם.
product.notFound.primaryCta   לראות דגמים
product.notFound.secondaryCta לכתוב לשי בוואטסאפ
```

---

## 6 · THE GENERATOR · `src/content/generator.he.ts`

### 6.1 ראש העמוד

```
generator.page.heading   להפוך תמונה להדפסה
generator.page.sub       מעלים תמונה, בוחרים איך היא נראית בתלת ממד, ורואים את המחיר
                         לפני שמזמינים.
```

### 6.2 שלבים, פס ההתקדמות וניווט

```
generator.rail[0]   תמונה
generator.rail[1]   סוג
generator.rail[2]   צבעים
generator.rail[3]   גודל
generator.rail[4]   דגם

generator.steps[1].title    התמונה
generator.steps[1].helper   מעלים תמונה אחת. ממנה נבנה הכל.
generator.steps[2].title    מה מדפיסים
generator.steps[2].helper   7 דרכים להוציא את התמונה מהמסך.
generator.steps[3].title    צבעים
generator.steps[3].helper   4 צבעים כלולים במחיר.
generator.steps[4].title    גודל וכמות
generator.steps[4].helper   כמה גדול, וכמה יחידות.
generator.steps[5].title    הדגם שלכם
generator.steps[5].helper   מסובבים אותו, ואז רואים כמה זה יוצא.

generator.nav.back          אחורה
generator.nav.next          להמשיך
generator.nav.stepAria      שלב {n} מתוך 5
generator.nav.editStep      לפתוח שוב
```

### 6.3 אזור ההעלאה, כל המצבים

**מנוחה, דסקטופ (אזור גרירה):**
```
generator.upload.idle.title       גוררים לכאן תמונה
generator.upload.idle.sub         או בוחרים אחת מהמחשב
generator.upload.idle.button      לבחור תמונה
generator.upload.idle.formats     JPG · PNG · WEBP · HEIC · עד 25 מגה
```

**מנוחה, נייד (שני כפתורים):**
```
generator.upload.mobile.pick      לבחור תמונה
generator.upload.mobile.camera    לצלם עכשיו
```

**גרירה מעל האזור:**
```
generator.upload.dragging         אפשר לשחרר כאן
```

**העלאה:**
```
generator.upload.uploading        התמונה עולה
generator.upload.uploadingPct     {pct}%
generator.upload.processing       מכין את התמונה
```

**סיום:**
```
generator.upload.done             התמונה מוכנה
generator.upload.replace          להחליף תמונה
generator.upload.removeAria       להסיר את התמונה
```

**שגיאות** (בלי נקודה בסוף שורת השגיאה, עם שורת עזרה נפרדת אחריה):
```
generator.upload.error.tooBig         הקובץ כבד מדי, אני מקבל עד 25 מגה
generator.upload.error.tooBigHelp     תמונה ישר מהגלריה כמעט תמיד נכנסת בגודל הזה.

generator.upload.error.unreadable     לא הצלחתי לפתוח את הקובץ הזה
generator.upload.error.unreadableHelp צילום רגיל מהגלריה כמעט תמיד עובד, וגם צילום חדש מהמצלמה.

generator.upload.error.wrongType      זה לא קובץ תמונה שאני יודע לפתוח
generator.upload.error.wrongTypeHelp  JPG, PNG, WEBP ו-HEIC עובדים אצלי.

generator.upload.error.failed         ההעלאה נעצרה באמצע
generator.upload.error.failedRetry    לנסות שוב

generator.upload.error.offline        אין חיבור כרגע, אני אנסה שוב לבד
```
`unreadable` היא ההודעה שמקבלים כשדפדפן לא מפענח HEIC. היא מספרת מה **אני** לא הצלחתי, במקום
להודיע למבקר שהקובץ שלו נדחה. זה גם נכון טכנית וגם מה שילד היה אומר.

**התראות איכות** (שבב צהוב, אף פעם לא חוסם):
```
generator.quality.small       התמונה קטנה. בהדפסה זה יוצא מרוח, ותמונה גדולה יותר תצא חדה.
generator.quality.dark        התמונה כהה מאוד. בהדפסה כמעט הכול ייצא שחור.
generator.quality.blown       התמונה שרופה באור. הפרטים הבהירים ייעלמו בהדפסה.
generator.quality.alpha       יש ברקע שקיפות. אני אמלא אותה בצבע מלא.

generator.quality.flat        התמונה שטוחה בגוונים. בליתופן זה כמעט לא ייראה, ותבליט יעבוד
                              עליה יותר טוב.
generator.quality.flat.accept להחליף לתבליט
generator.quality.flat.keep   בכל זאת ליתופן
```

**שורת הפרטיות** (סעיף 8, נמצאת כאן במלואה).

### 6.4 בחירת סוג ההדפסה

```
generator.step2.heading      מה מדפיסים
generator.step2.sub          7 דרכים להוציא את התמונה מהמסך.
generator.step2.priceChip    מתחיל מ-{n} ש״ח
generator.step2.whatIs       מה זה
generator.step2.sheetClose   לסגור
generator.step2.selectedAria נבחר
```

שבעת הכרטיסים. השם, הטאגליין, ותיאור הגיליון התחתון:

```
lithophane · ליתופן
  tagline      נדלק כשיש אור מאחור
  description  לוח דק בצבע אחד. איפה שהתמונה כהה אני מדפיס עבה, ואיפה שהיא בהירה אני
               מדפיס דק, ואז האור שעובר דרכו מצייר את התמונה. בלי אור מאחור הוא נראה
               כמו לוח לבן חלק. מגיע עם מעמד קטן.

relief-panel · תבליט מהתמונה
  tagline      בולט מהלוח, נוגעים בו
  description  לוח שטוח שהתמונה עולה ממנו החוצה, כמו מטבע. אפשר להעביר עליו יד ולהרגיש
               את הקווים. עובד הכי טוב על פנים גדולות ורקע פשוט.

glow-lithophane · ליתופן זוהר בחושך
  tagline      ביום תמונה, בלילה זוהר
  description  אותו לוח, בפילמנט שסופג אור ומחזיר אותו בחושך. משאירים אותו כמה דקות ליד
               מנורה והוא זוהר בערך שעה ואז נחלש. הזוהר ירקרק ואי אפשר לבחור לו צבע אחר.

standee · דמות עומדת למדף
  tagline      עומדת לבד על המדף
  description  גזרה של התמונה שעומדת על בסיס משלה. אני מנקה את הרקע, משאיר את מה שחשוב,
               ומדפיס בעובי של סנטימטר עם רגל מאחור.

keychain · מחזיק מפתחות
  tagline      התמונה נוסעת איתכם
  description  קטן, חזק, עם חור לטבעת. אני מדפיס אותו במילוי גבוה כדי שלא יישבר בכיס.
               שם או תאריך אפשר להוסיף, כותבים לי על זה בוואטסאפ.

magnet · מגנט למקרר
  tagline      מחזיק על המקרר באמת
  description  לוח קטן עם שקע מאחור למגנט עגול שאני מדביק בעצמי. נשאר על המקרר גם
               כשסוגרים חזק.

framed · תמונה במסגרת לקיר
  tagline      נתלית כמו תמונה
  description  הלוח הכי גדול שאני מדפיס, עם מסגרת שמודפסת יחד איתו ווו לתלייה מאחור.
               צבע אחד ללוח וצבע שני למסגרת.
```
שני תיקונים מול `04` A2: `התמונה נוסעת איתך` הפך לרבים, ו`תכתוב לי בוואטסאפ` (ציווי) הפך
ל`כותבים לי על זה בוואטסאפ`.

### 6.5 צבעים

```
generator.step3.heading        צבעים
generator.step3.sub            4 צבעים כלולים במחיר.

generator.colors.finish.all    רגיל
generator.colors.finish.silk   משי
generator.colors.finish.glow   זוהר
generator.colors.finish.wood   עץ
generator.colors.finish.clear  שקוף

generator.colors.soldOut       אזל
generator.colors.presetsTitle  הבחירה של שי
generator.colors.reorder       להחליף סדר
```

**תוויות המשבצות, לפי סוג ההדפסה:**
```
generator.colors.slot.body       צבע 1 · הגוף
generator.colors.slot.frame      צבע 2 · המסגרת          (framed)
generator.colors.slot.panel      צבע 1 · הלוח            (framed)
generator.colors.slot.figure     צבע 1 · הדמות           (standee)
generator.colors.slot.base       צבע 2 · הבסיס           (standee)
generator.colors.slot.generic    צבע {n}
```

**מחרוזת הספירה הרצה**, מתחת לגריד, מתעדכנת בכל בחירה:
```
generator.colors.count.none      עוד לא בחרתם צבע
generator.colors.count.one       צבע אחד נבחר. נשארו עוד 3 בלי תוספת מחיר.
generator.colors.count.two       2 צבעים נבחרו. נשארו עוד 2 בלי תוספת מחיר.
generator.colors.count.three     3 צבעים נבחרו. נשאר עוד אחד בלי תוספת מחיר.
generator.colors.count.four      4 צבעים נבחרו. זה הכי הרבה שנכנס במחיר.
generator.colors.count.extra     {n} צבעים נבחרו. {e} מהם בתוספת של {p} ש״ח כל אחד.
```

**שורות הקשר, מוצגות רק כשהתנאי שלהן נכון:**
```
generator.colors.note.one        בחרתם צבע אחד, אז התמונה יוצאת מהגובה ומהצללים.
generator.colors.note.many       בחרתם {n} צבעים, אז התמונה מתחלקת ל-{n} שכבות צבע.
                                 ככה זה יוצא גם בהדפסה.
generator.colors.note.tooClose   {a} ו{b} קרובים מאוד אחד לשני, ובהדפסה קשה להבחין ביניהם.
                                 אפשר להחליף אחד מהם לצבע כהה יותר.
generator.colors.note.single     בליתופן יש צבע אחד. העובי הוא מה שמצייר את התמונה.
generator.colors.note.glow       החומר סופג אור ביום ומחזיר אותו בחושך. אחרי כמה שעות ליד
                                 חלון הזוהר חזק.
```

### 6.6 רגע הצבע החמישי

הרגע הזה הוא **אפסייל**. הלחיצה על הצבע החמישי נשארת פתוחה, בלי חסימה, בלי הבהוב אדום ובלי
"הגעתם למקסימום". היא פותחת גיליון תחתון שמציע משהו, מסביר בדיוק כמה זה עולה, ומספר את הסיבה
המכנית. הסיבה היא מה שהופך תוספת מחיר להצעה, כי היא מתארת ילד שעומד ליד המדפסת ועושה עוד עבודה.

```
generator.extraColor.heading   רוצים צבע חמישי?
generator.extraColor.body      4 צבעים כלולים במחיר. כל צבע נוסף מוסיף 9 ש״ח, כי באמצע
                               ההדפסה אני עוצר את המדפסת, מחליף פילמנט ומתחיל את השכבה מחדש.
generator.extraColor.value     על התצוגה רואים מיד מה הצבע החמישי עושה לדגם.
generator.extraColor.accept    להוסיף את הצבע
generator.extraColor.decline   להישאר עם 4
```
אחרי אישור: `extraColorsAccepted = true`, הגיליון לא חוזר, ובמקומו שבב צהוב מתחת לגריד.
```
generator.extraColor.chip5     צבע חמישי · 9 ש״ח
generator.extraColor.chip6     צבע שישי · 9 ש״ח
generator.extraColor.chipN     צבע {n} · 9 ש״ח
```
מה שאסור להופיע כאן בשום גרסה: `הגעתם למקסימום`, `לא ניתן להוסיף`, `שדרוג`, `פרימיום`.

### 6.7 גודל וכמות

```
generator.step4.heading        גודל וכמות
generator.step4.sub            כמה גדול, וכמה יחידות.

generator.size.label           גודל
generator.size.hint.matchbox   בערך בגודל של קופסת גפרורים.
generator.size.hint.card       בערך בגודל של כרטיס אשראי.
generator.size.hint.palm       בערך בגודל של כף יד.
generator.size.hint.a5         בערך בגודל של דף A5.

generator.quantity.label       כמות
generator.quantity.decAria     פחות אחד
generator.quantity.incAria     עוד אחד
generator.quantity.discount    {n} יחידות · {pct}% הנחה
generator.quantity.max         מעל 25 יחידות כותבים לי ואני בונה מחיר.

generator.rush.toggle          צריך את זה עד תאריך מסוים
generator.rush.dateLabel       עד מתי
generator.rush.note            דחוף מוסיף 25% ולפחות 15 ש״ח.
generator.rush.tooSoon         התאריך הזה קרוב מדי בשבילי, נדבר עליו בוואטסאפ

generator.delivery.label       מסירה
generator.delivery.pickup      איסוף עצמי, נסגור מקום בוואטסאפ
generator.delivery.shipping    משלוח לכתובת שלכם · 25 ש״ח
```

### 6.8 בניית הדגם ומצב ההמתנה

```
generator.build.cta            לבנות את הדגם
generator.build.rebuild        לבנות מחדש
generator.build.lowRes         לנסות ברזולוציה נמוכה יותר

generator.wait.heading         בונה את הדגם
generator.wait.lines[0]        קורא את התמונה
generator.wait.lines[1]        מודד את הצללים
generator.wait.lines[2]        בונה שכבות
generator.wait.lines[3]        מרים את הדגם
generator.wait.aria            בונה את הדגם, רגע אחד
```
המתנת מינימום 2200ms נשמרת. ארבע השורות מתחלפות כל 550ms ואין ביניהן שלוש נקודות.

**נפילות מוצהרות:**
```
generator.fallback.noWebgl     המכשיר שלכם לא מציג תלת ממד. הנה איך זה ייצא בערך,
                               וההזמנה ממשיכה רגיל.
generator.fallback.standee     הגזרה האמיתית נעשית אצלי ביד. זו הדמיה גסה.
generator.fallback.worker      הבנייה נתקעה לי כאן. אפשר לנסות שוב, או להמשיך ולסגור
                               את הפרטים איתי בוואטסאפ.
```

### 6.9 התצוגה המקדימה

```
generator.preview.dragHint          לגרור כדי לסובב
generator.preview.magnetHint        לסובב ולראות את הגב
generator.preview.actions.backlight אור מאחור
generator.preview.actions.lightsOff לכבות את האור
generator.preview.actions.lightsOn  להדליק את האור
generator.preview.actions.rotate    סיבוב אוטומטי
generator.preview.actions.shot      לצלם מסך
generator.preview.actions.reset     לחזור להתחלה
generator.preview.shotSaved         התמונה נשמרה אצלכם
generator.preview.realSizeChip      בגודל אמיתי
```
`lightsOff` היא תווית המתג לזוהר בחושך במצב "האור דולק", ו-`lightsOn` היא אותה תווית אחרי הכיבוי.
המתג הוא הרגע הכי חזק בכל המחולל ולכן הוא נשאר מילה אחת ופעולה אחת.

**בלוק הכנות, קנוני מ-`05` PART C, מוצג תמיד:**
```
generator.honesty.heading      מה רואים כאן
generator.honesty.body[0]      התצוגה הזאת נבנית מהתמונה שלכם ישר בדפדפן, בלי לחכות לשום שרת.
generator.honesty.body[1]      היא מראה את הגובה, את הצבעים ואת הגודל האמיתי של החתיכה.
generator.honesty.body[2]      את קובץ ההדפסה אני בונה אחר כך בעצמי, ואז אני מתקן ידנית
                               כל מקום שיצא עקום.

generator.honesty.texture[0]   בהדפסה אמיתית מרגישים באצבע את קווי השכבות.
generator.honesty.texture[1]   זה החלק שהכי אוהבים כשמקבלים את זה ליד.

generator.honesty.maker[0]     אני שי, בן 13, ואני מדפיס בתלת ממד.
generator.honesty.maker[1]     אני מודד, מדפיס, בודק, ואם יצא עקום אני מדפיס שוב.
generator.honesty.maker[2]     כל הזמנה עוברת דרך הידיים שלי לפני שהיא יוצאת.

generator.honesty.short        זו הדמיה. את הדגם האמיתי אני בונה אצלי אחרי שנסגור פרטים.
```
`generator.honesty.short` היא השורה של 13 פיקסל שיושבת מתחת לקנבס בכל מצב, כולל כשהבלוק המלא
מקופל. היא ההערה הכנה על התלת ממד. היא אומרת מה זה, אומרת מי עושה את השלב הבא, וממשיכה הלאה,
בלי מילה אחת של התנצלות.

### 6.10 חשיפת המחיר

```
generator.price.cta              כמה זה יוצא
generator.price.heading          זה המחיר
generator.price.subline          לפי מה שבחרתם
generator.price.configLine       {printType} · {size} · {colorsHe} · {qtyHe}
generator.price.changeNote       אם משנים משהו, המספר משתנה מולכם.
generator.price.breakdownOpen    מאיפה המחיר מגיע
generator.price.breakdownClose   לסגור את הפירוט
```
`configLine` לדוגמה: `ליתופן · 10x15 ס״מ · צבע אחד · יחידה אחת`.

**תוויות שורות הפירוט** (`QuoteLine.labelHe`, מתוך `convex/pricing/engine.ts`):
```
unit           {printTypeNameHe} ×{qty}
qtyDiscount    הנחת כמות {pct}%
colors         {n} צבעים נוספים          hint: החלפת פילמנט באמצע
finish         חומר מיוחד
setup          הכנה וחיתוך
rush           דחוף
delivery       משלוח
rounding       עיגול
total          סך הכול
```
`סה"כ` הוחלף ל-`סך הכול`: הקיצור דורש גרשיים, והשורה הזאת נכנסת גם להודעת וואטסאפ שבה עדיף
להישאר עם מילים שלמות.

**שדה ההערה:**
```
generator.price.noteLabel        רוצים להוסיף משהו?
generator.price.notePlaceholder  אפשר לכתוב לי כאן משהו קצר
generator.price.noteCounter      {n} מתוך 120
```

**הכנות ליד המספר** (`pricingSettings.priceNoteHe`, `vatNoteHe`, `ctaNoteHe`):
```
generator.price.disclaimer[0]    הצעת מחיר לפי מה שבחרתם. סוגרים סופית בוואטסאפ.
generator.price.disclaimer[1]    אני בן 13 ועדיין אין לי עוסק, אז אין חשבונית מס ואין
                                 מע״מ מעל המחיר.
generator.price.underCta         לא מחייב כלום. אפשר לשאול אותי שאלות לפני שמזמינים.
```
אין שורת מע״מ, אין `כולל מע״מ`, אין `לפני מע״מ` ואין אחוז בשום מקום. המספר שמוצג הוא המספר
המלא. השורה השנייה מסבירה למה, בקול שלו, בעובדה אחת ובלי התנצלות.

**שני ה-CTA:**
```
generator.price.primaryCta       לשלוח לשי בוואטסאפ
generator.price.secondaryCta     לשמור את ההצעה
generator.price.savedToast       הקישור נשמר. אפשר לחזור מתי שרוצים.
```

### 6.11 אחרי המסירה

```
generator.handoff.heading             ההודעה מוכנה בוואטסאפ
generator.handoff.body                אם היא לא נפתחה, הנה הקישור להזמנה שלכם.
generator.handoff.linkLabel           לפתוח את דף ההזמנה
generator.handoff.again               לבנות עוד אחד

generator.handoff.desktop.title       אין וואטסאפ במחשב?
generator.handoff.desktop.copy        להעתיק את ההודעה
generator.handoff.desktop.number      058-584-5083
generator.handoff.copiedToast         ההודעה הועתקה
generator.handoff.blockedToast        נראה שוואטסאפ לא נפתח מכאן. אפשר לפתוח את הדף בדפדפן,
                                      או להעתיק את ההודעה.
```

### 6.12 דף ההצעה `/o/{code}` ותפוגה

```
offer.heading            ההזמנה שבנית באתר
offer.priceLabel         מחיר באתר
offer.codeLabel          קוד
offer.createdLabel       נבנתה ב
offer.cta                לשלוח לשי בוואטסאפ
offer.viewerHint         לגרור כדי לסובב

offer.expired.title      הקישור הזה כבר לא פעיל
offer.expired.body       הזמנה שלא נסגרה נמחקת עם התמונה אחרי 7 ימים. אפשר לבנות אותה
                         שוב תוך דקה.
offer.expired.cta        לבנות מחדש
```
`offer.heading` פונה ליחיד כי הדף הזה נפתח בצ'אט מול שי ולא באתר. זו החריגה היחידה מלשון הרבים,
והיא מכוונת.

---

## 7 · הודעות הוואטסאפ · `src/lib/whatsapp.ts`

### 7.1 כללי כתיבה שנשברים בפועל כשמפרים אותם

- ההודעה נכתבת **בקול הלקוח**, כי הלקוח הוא ששולח אותה. גוף ראשון יחיד, פשוט, בלי מילה מנופחת.
- `encodeURIComponent` על כל ההודעה. אין `encodeURI` ואין `URLSearchParams`.
- שורה חדשה היא `\n` בלבד.
- מפריד מידות באסקי: `60x22x4`. הסימן `×` מתהפך בחלק מהלקוחות.
- אין אימוג'י ואין סימן שקל. המחיר נכתב `150 שקל`. סימן `₪` נדבק למספר הפוך בהודעת RTL.
- תקרה קשיחה 600 תווים מפוענחים. סדר הקיצוץ: `הערה` ← `מסירה` ← `דחוף`. הברכה, הסוג, הגודל,
  הצבעים, הכמות, המחיר, הקישור והקוד לא נופלים לעולם.

### 7.2 הודעת המחולל (הראשית)

המטרה שלה אחת: **ששי יוכל לענות עליה בהודעה אחת.** לכן היא נושאת את כל מה שדרוש כדי לומר "כן,
זה המחיר, זה התאריך", ומסתיימת בשאלה אחת ולא בשלוש.

```
היי שי, בניתי הזמנה באתר.

מה: {printTypeNameHe}
גודל: {sizeLabelHe}
צבעים: {colorNames}
כמות: {quantity}
מסירה: {deliveryHe}
עד מתי: {neededByHe}
מחיר באתר: {total} שקל

הקישור עם התמונה והדגם:
{SITE_URL}/o/{code}
קוד: {code}

הערה: {note}

אשמח לדעת אם זה מסתדר ומתי אפשר לקבל.
```

מיפוי שדות:
```
{printTypeNameHe}   printType.nameHe                      ליתופן
{sizeLabelHe}       sizePreset.labelCm                    10x15 ס״מ
{colorNames}        filaments.map(f => f.nameHe).join(", ")   לבן חלבי, טורקיז
{quantity}          draft.quantity                        1
{deliveryHe}        pickup → איסוף עצמי  |  shipping → משלוח
{neededByHe}        השורה כולה מושמטת כש rush === false
{total}             quoteSnapshot.total                   150
{code}              draft.publicCode                      K7M2QW9XT4
{note}              השורה כולה מושמטת כשהשדה ריק
```

**דוגמה מלאה, כפי שהיא נשלחת:**
```
היי שי, בניתי הזמנה באתר.

מה: ליתופן
גודל: 10x15 ס״מ
צבעים: לבן חלבי
כמות: 1
מסירה: משלוח
מחיר באתר: 150 שקל

הקישור עם התמונה והדגם:
https://shai-print.vercel.app/o/K7M2QW9XT4
קוד: K7M2QW9XT4

אשמח לדעת אם זה מסתדר ומתי אפשר לקבל.
```

**דוגמה עם דחוף, 6 צבעים והערה:**
```
היי שי, בניתי הזמנה באתר.

מה: דמות עומדת למדף
גודל: 12 ס״מ גובה
צבעים: אדום סוכריה, טורקיז, צהוב, שחור, לבן חלבי, אפור
כמות: 3
מסירה: איסוף עצמי
עד מתי: 20.09
מחיר באתר: 405 שקל

הקישור עם התמונה והדגם:
https://shai-print.vercel.app/o/8QT4M2K7XW
קוד: 8QT4M2K7XW

הערה: זה למסיבת סיום של הכיתה, אם אפשר בלי הרקע

אשמח לדעת אם זה מסתדר ומתי אפשר לקבל.
```

```ts
// src/lib/whatsapp.ts
export function buildGeneratorMessage(d: DraftView) {
  return [
    'היי שי, בניתי הזמנה באתר.',
    '',
    `מה: ${d.printTypeNameHe}`,
    `גודל: ${d.sizeLabelHe}`,
    `צבעים: ${d.colorNames.join(', ')}`,
    `כמות: ${d.quantity}`,
    `מסירה: ${d.delivery === 'pickup' ? 'איסוף עצמי' : 'משלוח'}`,
    d.rush ? `עד מתי: ${d.neededByHe}` : null,
    `מחיר באתר: ${d.total} שקל`,
    '',
    'הקישור עם התמונה והדגם:',
    `${siteUrl('/o/' + d.code)}`,
    `קוד: ${d.code}`,
    d.note ? '' : null,
    d.note ? `הערה: ${d.note}` : null,
    '',
    'אשמח לדעת אם זה מסתדר ומתי אפשר לקבל.',
  ].filter(v => v !== null).join('\n');
}
```

### 7.3 הווריאנטים

**מוצר מהקטלוג** (`source: product_cta`), מ-`ProductBuyPanel` ומהסרגל הדביק:
```
היי שי, הגעתי מהאתר.

מעניין אותי: {nameHe}
קוד דגם: {slug}
צבע: {colorNameHe}
כמות: {quantity}
מידות: {w}x{h}x{d} מ״מ
מחיר באתר: {unit} שקל ליחידה, {total} שקל בסך הכול

קישור: {SITE_URL}/products/{slug}

אשמח לדעת מתי אפשר לקבל.
```
כשהכמות היא 1, שורת המחיר מתקצרת ל-`מחיר באתר: {unit} שקל`. שורת הצבע מושמטת כשלא נבחר צבע.
שורה אופציונלית נוספת כשיש טקסט להטבעה: `טקסט להדפסה: {personalisationText}`.

דוגמה:
```
היי שי, הגעתי מהאתר.

מעניין אותי: מחזיק מפתחות בהתאמה אישית
קוד דגם: custom-keychain
צבע: אדום סוכריה
כמות: 2
מידות: 60x22x4 מ״מ
מחיר באתר: 45 שקל ליחידה, 90 שקל בסך הכול

קישור: https://shai-print.vercel.app/products/custom-keychain

אשמח לדעת מתי אפשר לקבל.
```

**שאלה על מוצר** (`source: product_question`):
```
היי שי, ראיתי באתר את "{nameHe}".
יש לי שאלה לפני שאני מזמין.

קישור: {SITE_URL}/products/{slug}
```

**מצב ריק בקטלוג** (`source: catalog_empty`):
```
היי שי, חיפשתי באתר בקטגוריה {categoryHe} ולא מצאתי.
אשמח לדעת אם אפשר להדפיס משהו כזה.
```

**סגירת דף הבית** (`source: closing_home`):
```
היי שי, הגעתי מהאתר.
יש לי רעיון להדפסה ואשמח לשמוע אם אפשר.
```

**גנרי** (`source: header`, `footer`, `sticky_home`, `contact_channel`, `nav`):
```
היי שי, הגעתי מהאתר.
רציתי לשאול על הדפסה.
```

**אחרי טופס יצירת קשר** (`source: contact_form_success`):
```
היי שי, מילאתי טופס באתר.

שם: {nameHe}
מה בא לי להדפיס: {messageHe}
```

### 7.4 ערכי `source` לאנליטיקס

`header` · `footer` · `nav` · `sticky_home` · `sticky_product` · `sticky_catalog` · `sticky_contact` ·
`hero` · `closing_home` · `catalog_empty` · `product_cta` · `product_question` · `generator_price` ·
`offer_page` · `contact_channel` · `contact_form_success`

---

## 8 · שורת הפרטיות ליד ההעלאה

זו הפעם היחידה באתר שבו נוגעים בנושא, ולכן היא צריכה לעשות שני דברים בבת אחת: לומר את האמת,
ולהוריד את החשש במקום להעלות אותו. ניסוח משפטי היה מייצר בדיוק את החשש שהוא בא לפתור, ולכן
היא כתובה כמו שילד מסביר.

**השורה עצמה**, 13 פיקסל, `ink/65`, ישר מתחת לאזור ההעלאה:
```
generator.photo.privacy   התמונה נשמרת רק בשביל ההזמנה הזאת. אם ההזמנה לא נסגרת, היא
                          נמחקת אחרי 7 ימים.
```

**הרחבה בלחיצה** (`<details>`, סגור כברירת מחדל):
```
generator.photo.privacyMoreLabel  מה קורה לתמונה
generator.photo.privacyMore       הכתובת של התמונה אקראית וארוכה, והיא לא מופיעה בגוגל ולא
                                  בשום עמוד באתר. אני רואה אותה כדי לדעת מה להדפיס. הזמנה
                                  שלא נסגרה נמחקת עם התמונה אחרי 7 ימים, ואפשר גם לבקש
                                  ממני למחוק אותה קודם.
```

מה שנבדק כאן מול הקוד לפני שזה עולה לאוויר:
- `DECISIONS.md` קובע 7 ימים. `04` B6 כותב 45 יום בקרון. **הקרון משתנה ל-7**, אחרת השורה משקרת.
- "אפשר לבקש ממני למחוק אותה קודם" נשען על כפתור המחיקה הידני בממשק הניהול. הוא חייב להתקיים
  ביום ההשקה.
- אין כאן הבטחה שאף אחד חוץ משי לא רואה את התמונה, כי מי שיש לו את הקישור רואה אותה. מה שנאמר
  הוא שהקישור אקראי ולא מפורסם, וזה נכון.

---

## 9 · CONTACT · `src/content/contact.ts`

### 9.1 ראש העמוד

```
contact.hero.heading   כותבים לי
contact.hero.sub       הכי מהר זה בוואטסאפ. אני קורא הכול.
```

### 9.2 ערוצים

```
contact.channels.whatsapp.title   וואטסאפ
contact.channels.whatsapp.number  058-584-5083
contact.channels.whatsapp.cta     לפתוח וואטסאפ

contact.channels.instagram.title  אינסטגרם
contact.channels.instagram.sub    לראות עוד הדפסות

contact.channels.email.title      מייל
contact.channels.email.sub        לכתוב לי
```
`[אריאל: אם אין כתובת מייל ואין אינסטגרם, הכרטיס יורד. כרטיס ריק גרוע מכרטיס חסר]`
המספר נבנה בג'אווהסקריפט ולא יושב כטקסט גולמי ב-HTML.

### 9.3 הטופס

```
contact.form.heading          או ממלאים כאן ואני חוזר
contact.form.fields.name.label         איך קוראים לכם
contact.form.fields.name.placeholder   שם פרטי מספיק
contact.form.fields.phone.label        טלפון
contact.form.fields.phone.placeholder  050-0000000
contact.form.fields.email.label        מייל (לא חובה)
contact.form.fields.email.placeholder  רק אם נוח לכם ככה
contact.form.fields.message.label      מה בא לכם להדפיס
contact.form.fields.message.placeholder  משפט אחד מספיק לי כדי להתחיל

contact.form.submit           לשלוח את ההודעה
contact.form.submitPending    שולח
contact.form.altCta           או בוואטסאפ
contact.form.privacy          אני לא שומר את המספר שלכם לשום דבר חוץ מלחזור אליכם.
```

### 9.4 הודעות ולידציה

בלי נקודה בסוף, ואף אחת מהן לא מאשימה את מי שמילא.
```
contact.form.errors.name.required     צריך שם כדי שאדע איך לפנות אליכם
contact.form.errors.name.short        השם הזה קצר לי מדי
contact.form.errors.name.long         השם הזה ארוך מהמקום שיש לי כאן

contact.form.errors.phone.required    צריך טלפון כדי שאחזור אליכם
contact.form.errors.phone.invalid     המספר הזה לא נראה לי שלם

contact.form.errors.email.invalid     הכתובת הזאת לא נראית לי שלמה

contact.form.errors.message.required  צריך משפט אחד על מה שאתם רוצים
contact.form.errors.message.short     עוד כמה מילים יעזרו לי להבין
contact.form.errors.message.long      זה ארוך מהמקום שיש לי כאן, אפשר לקצר
```
שגיאה ברמת מסך (משפט מלא עם נקודה):
```
contact.form.errors.submit            ההודעה לא נשלחה. אפשר לנסות שוב, או לכתוב לי בוואטסאפ.
```

### 9.5 הצלחה

```
contact.success.heading   קיבלתי.
contact.success.body      אני חוזר אליכם בדרך כלל תוך כמה שעות.
contact.success.cta       לפתוח וואטסאפ עכשיו
```

### 9.6 שעות, זמן תגובה, משלוח ואיסוף

```
contact.hours.heading      מתי אני זמין
contact.hours.lines[0]     ראשון עד חמישי 16:00-20:00
contact.hours.lines[1]     שישי 09:00-13:00
contact.hours.lines[2]     שבת סגור
contact.hours.response     בדרך כלל אני חוזר תוך כמה שעות. בימי לימודים זה יכול לקחת
                           עד הערב.

contact.shipping.heading   משלוח ואיסוף
contact.shipping.pickup    איסוף עצמי בתיאום, נסגור מקום בוואטסאפ
contact.shipping.delivery  משלוח עד הבית 25 ש״ח
contact.shipping.lead      מוכן תוך 3 ימי עבודה
contact.shipping.note      משלוח חינם מ-{n} ש״ח
```
`contact.shipping.note` מוצגת רק כש-`freeShippingOver` מוגדר.
`שבת סגור` נצבעת ב-`ink/50`, ולא מוקפת בשום הסבר.
`[אריאל: לאשר את השעות מול ההורים. אלה שעות של ילד אחרי בית ספר, והן חייבות להיות אמיתיות]`

### 9.7 שאלות שחוזרות · `src/content/faq.ts`

```
contact.faq.heading   שאלות שחוזרות
```

```
[0] q  כמה זמן לוקחת הדפסה?
    a  רוב הדברים מוכנים אצלי תוך 3 ימי עבודה. דגם גדול או כמות גדולה לוקחים יותר,
       ואת זה אני אומר מראש בוואטסאפ.

[1] q  אפשר לשלם באתר?
    a  לא. באתר רק בוחרים ורואים מחיר. את התשלום סוגרים איתי ישירות בוואטסאפ, במזומן
       או בהעברה.

[2] q  איזה תמונות מתאימות להדפסה?
    a  תמונה חדה עם צללים ברורים עובדת הכי טוב. תמונה כהה מאוד או שטוחה בגוונים יוצאת
       פחות טוב, ואני אומר את זה כשאני רואה אותה.

[3] q  כמה צבעים אפשר בהדפסה אחת?
    a  4 צבעים כלולים במחיר. אפשר גם יותר, וכל צבע נוסף מוסיף 9 ש״ח כי אני עוצר את
       המדפסת ומחליף פילמנט באמצע.

[4] q  מה קורה אם ההדפסה יוצאת לא טוב?
    a  אני מדפיס שוב. אני בודק כל הזמנה לפני שהיא יוצאת, ואם משהו יצא עקום זה לא
       מגיע אליכם.
```
תשובה `[1]` היא התשובה החשובה בעמוד. היא לוקחת את החולשה המבנית של האתר ואומרת אותה ישר,
וזה מה שהופך אותה מהתנצלות להסבר.
`[אריאל: לאשר עם ההורים שמזומן והעברה הם באמת האופציות, ומי מקבל את הכסף בפועל]`

---

## 10 · אינדקס מצבים ריקים ושגיאות

כל מצב באתר, במקום אחד, כדי שאף מסך לא יישאר בלי מחרוזת.

| מצב | מפתח | טקסט |
|---|---|---|
| קטלוג בלי תוצאות | `products.empty.title` | `אין לי דגם כזה עדיין.` |
| דגם שהוסר | `product.notFound.title` | `הדגם הזה כבר לא באתר` |
| דף לא קיים | `global.notFound.title` | `הדף הזה יצא עקום` |
| קישור הצעה שפג | `offer.expired.title` | `הקישור הזה כבר לא פעיל` |
| גלריה ריקה | `home.gallery.empty` | `עוד לא העליתי לכאן תמונות` |
| אין מוצרים מומלצים | `home.products.empty` | `אני מעלה לכאן דגמים בימים הקרובים` |
| אין צבעים במלאי לסוג | `generator.colors.empty` | `נגמרו לי הצבעים לסוג הזה. כותבים לי ואני אומר מה יש` |
| אין מידות מוגדרות | `generator.size.empty` | `עוד לא הגדרתי מידות לסוג הזה. נסגור את זה בוואטסאפ` |
| קובץ כבד | `generator.upload.error.tooBig` | `הקובץ כבד מדי, אני מקבל עד 25 מגה` |
| קובץ לא נפתח | `generator.upload.error.unreadable` | `לא הצלחתי לפתוח את הקובץ הזה` |
| סוג קובץ לא נתמך | `generator.upload.error.wrongType` | `זה לא קובץ תמונה שאני יודע לפתוח` |
| העלאה נכשלה | `generator.upload.error.failed` | `ההעלאה נעצרה באמצע` |
| בנייה נכשלה | `generator.fallback.worker` | `הבנייה נתקעה לי כאן. אפשר לנסות שוב, או להמשיך ולסגור את הפרטים איתי בוואטסאפ.` |
| אין WebGL, מחולל | `generator.fallback.noWebgl` | `המכשיר שלכם לא מציג תלת ממד. הנה איך זה ייצא בערך, וההזמנה ממשיכה רגיל.` |
| אין WebGL, קטלוג | `product.viewer.noWebgl` | `הדפדפן הזה לא מציג תלת ממד. יש כאן תמונה שמסתובבת, והמידות והמחיר נשארים מדויקים.` |
| glb לא נטען | `product.viewer.loadFailed` | `התצוגה בתלת ממד לא נטענה. אפשר להזמין גם ככה, ואני שולח צילום של ההדפסה לפני שהיא יוצאת אליכם.` |
| וואטסאפ לא נפתח | `generator.handoff.blockedToast` | `נראה שוואטסאפ לא נפתח מכאן. אפשר לפתוח את הדף בדפדפן, או להעתיק את ההודעה.` |
| טופס נכשל | `contact.form.errors.submit` | `ההודעה לא נשלחה. אפשר לנסות שוב, או לכתוב לי בוואטסאפ.` |
| אין רשת | `global.error.offline` | `אין חיבור לאינטרנט כרגע. ברגע שהוא חוזר אפשר להמשיך מכאן.` |
| קריסה כללית | `global.error.boundary.title` | `זה נפל לי כאן` |
| טעינה | `global.loading.generic` | `רגע אחד` |

---

## 11 · מה עדיין צריך את שי או את אריאל

| # | מחרוזת | מה חסר |
|---|---|---|
| 1 | `home.trust.items[0]` | `[אריאל: כמה הדפסות באמת יצאו עד היום. בלי מספר שאפשר להגן עליו, השורה מוחלפת ב"ההזמנות כבר מגיעות"]` |
| 2 | `global.footer.columns.hours` · `contact.hours.lines` | `[אריאל: לאשר שעות אמיתיות מול שי וההורים]` |
| 3 | `global.footer.columns.shipping.lines[1]` · `contact.shipping.delivery` | `[אריאל: לאשר 25 ש״ח כמחיר משלוח, ומי סופג אותו]` |
| 4 | `global.mobileNav.socialLine` · `contact.channels.instagram` | `[אריאל: לוודא שיש אינסטגרם וטיקטוק פעילים, אחרת להוריד]` |
| 5 | `contact.channels.email` | `[אריאל: כתובת מייל, או להוריד את הכרטיס]` |
| 6 | `contact.faq[1].a` | `[אריאל: לאשר שמזומן והעברה נכונים, ולמי הכסף מגיע בפועל]` |
| 7 | `generator.photo.privacy` | `[אריאל: לשנות את הקרון מ-45 יום ל-7 ימים לפני שהשורה עולה לאוויר]` |
| 8 | `product.assurances[1]` · `contact.shipping.pickup` | `[אריאל: לאשר שאין שם עיר בשום מקום, גם לא בפוטר]` |
| 9 | `generator.price.disclaimer[1]` | `[אריאל: לאשר את הנוסח מול ההורים. זו הצהרה על מעמד עסקי של קטין]` |
| 10 | תאריכי הסיפור | `[אריאל: אין באתר שנתונים. אם שי ימסור שנים אמיתיות, הן נכנסות רק לתוויות ציר הזמן ב-/about]` |

---

## 12 · בדיקות מסירה לפני עלייה לאוויר

הרצה על `src/content/` ועל `src/lib/whatsapp.ts`:

```bash
grep -rn "אלא" src/content/                    # שורה אחת בלבד, בקובץ about
grep -rn "אנחנו\|אנו " src/content/            # אפס
grep -rn " — \| – " src/content/               # אפס
grep -rn "…\|\.\.\." src/content/              # אפס
grep -rn "!" src/content/                      # אפס
grep -rn "₪" src/content/                      # אפס. הסימן חי רק ב-PriceTag.tsx בתוך dir="ltr"
grep -rn 'מ"מ\|ס"מ\|סה"כ\|מע"מ' src/content/   # אפס. גרשיים בלבד
grep -rn "תלת מימד\|ליטופן" src/content/       # אפס
grep -rn "שלח\|לחץ\|בחר \|כבו \|גררו\|סובבו\|תעלו\|בואו" src/content/   # אפס
grep -rn "45 יום\|45 ימים" src/ convex/        # אפס
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src/content/   # אפס אימוג'י
```

בדיקות ידניות שאף grep לא תופס:
- כל תווית כפתור באתר היא שם פועל. עוברים על `PillButton` בכל השימושים.
- כל הוראה בגוף טקסט היא בינוני סתמי.
- אין באתר משפט שמבקש אהדה. קוראים בקול רם כל שורה שמזכירה את הגיל ובודקים אם היא נשמעת
  כמו עובדה או כמו כרזה.
- כל שגיאת שדה מתחילה במה ש**אני** לא הצלחתי, ולא במה ש**אתם** עשיתם.
- אין באתר הבטחה על דיוק התצוגה המקדימה. `generator.honesty.short` גלויה בכל מצב.
