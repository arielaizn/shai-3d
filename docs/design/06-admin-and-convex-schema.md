# 06 · Admin Panel + Convex Backend

Owner document for everything behind the login. The public site is a lead engine; this file defines the machine that feeds it and the single screen where Shai controls his own prices.

Three rules govern every decision below.

1. **Money is never trusted from the browser.** The client can compute a price for display. Only Convex may compute a price that gets written to a document or into a WhatsApp message.
2. **One formula, one file.** `convex/lib/priceEngine.ts` is pure TypeScript with zero Convex imports, so the exact same function runs in the visitor's browser and inside the mutation. There is no second copy to keep in sync.
3. **Shai is thirteen and this is his shop.** Every screen is Hebrew, every destructive action is reversible for 30 days, and no field can be typed into a state that makes his work free.

---

## 0. Conventions

| Concern | Decision | Why |
|---|---|---|
| Money | Integer **agorot** everywhere in the database. `1250` = ‎12.50 ₪ | Floats produce ‎0.30000000000000004 in a price the customer reads |
| Percentages | Integer **basis points** (`bp`), 0..10000. `1500` = 15% | Same reason |
| Timestamps | `createdAt: number`, `updatedAt: number`, `Date.now()` milliseconds UTC | Convex has no server clock helper in queries; write it in the mutation |
| Display timezone | `Asia/Jerusalem`, formatted at render with `Intl.DateTimeFormat("he-IL")` | Never store local time |
| Soft delete | `deletedAt: v.optional(v.number())` on anything a visitor could have seen | Shai will delete a colour by accident on his phone |
| Hard delete | Only from `/admin/trash` after 30 days, or by the nightly cron | |
| IDs in URLs | Convex `_id` for admin routes, `slug` for public routes | Admin URLs are private, slugs are SEO |
| Sort | `sortOrder: number` as a **fractional index** (floats), never a contiguous 0..n | A drag reorder writes one row instead of twenty |
| Text fields | Every user-visible string field ends in `He` (`titleHe`, `labelHe`) | The site is Hebrew only; the suffix stops anyone adding English strings by habit |
| Errors | `throw new ConvexError({ code, he })` where `he` is the Hebrew sentence the admin sees | The UI never invents its own error text |

Two enums are repeated often enough to name once:

```ts
// accent colour role, from the locked palette
type Accent = "red" | "turquoise" | "yellow" | "ink" | "none";
// stock state of a filament spool
type Stock = "in" | "low" | "out";
```

---

## PART A · The Convex backend

### A.1 `convex/schema.ts`

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/* ------------------------------------------------------------------ */
/* shared validators                                                    */
/* ------------------------------------------------------------------ */

/** integer agorot. 1250 === 12.50 ILS */
const money = v.number();
/** basis points, 0..10000. 1500 === 15% */
const bp = v.number();

const accent = v.union(
  v.literal("red"),
  v.literal("turquoise"),
  v.literal("yellow"),
  v.literal("ink"),
  v.literal("none"),
);

const stock = v.union(v.literal("in"), v.literal("low"), v.literal("out"));

/** one selectable size inside a print type */
const sizeOption = v.object({
  key: v.string(),                 // "s" | "m" | "l" | free text, unique inside the print type
  labelHe: v.string(),             // "קטן 10 ס\"מ"
  widthMm: v.number(),
  heightMm: v.number(),
  depthMm: v.number(),
  multiplier: v.number(),          // 1.0 .. 10.0, multiplies the base price
  estimatedGrams: v.number(),      // informational, shown to Shai only
  estimatedMinutes: v.number(),    // informational, shown to Shai only
  sortOrder: v.number(),
  active: v.boolean(),
});

/** the full, auditable arithmetic behind one price. written by the server only */
const priceBreakdown = v.object({
  configVersion: v.number(),
  currency: v.literal("ILS"),

  basePriceAgorot: money,
  sizeKey: v.string(),
  sizeMultiplier: v.number(),
  materialMultiplier: v.number(),
  materialFlatAgorot: money,

  colorCount: v.number(),
  freeColorCount: v.number(),
  extraColorsAgorot: money,

  addons: v.array(
    v.object({
      ruleId: v.id("surchargeRules"),
      labelHe: v.string(),
      amountAgorot: money,
    }),
  ),

  unitBeforeRoundingAgorot: money,
  unitPriceAgorot: money,
  quantity: v.number(),
  lineTotalAgorot: money,

  discountTierId: v.optional(v.id("quantityDiscountTiers")),
  discountBp: bp,
  discountAgorot: money,

  deliveryMethod: v.union(v.literal("pickup"), v.literal("shipping")),
  shippingAgorot: money,

  roundingAgorot: money,          // signed. what rounding added or removed
  minOrderBumpAgorot: money,      // signed. what the minimum order added
  totalAgorot: money,
});

/** denormalised human labels, frozen at the moment a lead is created */
const configSnapshot = v.object({
  printTypeLabelHe: v.string(),
  materialLabelHe: v.string(),
  sizeLabelHe: v.string(),
  sizeMm: v.string(),                        // "120 × 80 × 3 מ\"מ"
  colors: v.array(v.object({ nameHe: v.string(), hex: v.string() })),
  quantity: v.number(),
  addonLabelsHe: v.array(v.string()),
  deliveryLabelHe: v.string(),
  noteHe: v.optional(v.string()),
});

/* ------------------------------------------------------------------ */

export default defineSchema({
  /* ---------- auth ---------- */
  ...authTables, // users, authAccounts, authSessions, authRefreshTokens, authVerificationCodes, authRateLimits

  admins: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("editor")),
    displayNameHe: v.string(),
    email: v.string(),
    createdAt: v.number(),
    createdBy: v.optional(v.id("admins")),
    lastLoginAt: v.optional(v.number()),
    disabledAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

  /** the only door into the password provider. no invite, no account */
  adminInvites: defineTable({
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("editor")),
    displayNameHe: v.string(),
    createdAt: v.number(),
    createdBy: v.optional(v.id("admins")),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    consumedByUserId: v.optional(v.id("users")),
  }).index("by_email", ["email"]),

  adminActivity: defineTable({
    adminId: v.optional(v.id("admins")),   // null for cron jobs
    actorLabelHe: v.string(),              // "שי" | "המערכת"
    action: v.string(),                    // "pricing.publish" | "products.softDelete"
    tableName: v.string(),
    docId: v.optional(v.string()),
    summaryHe: v.string(),                 // "העלה מחיר בסיס של מחזיק מפתחות מ-25 ₪ ל-32 ₪"
    before: v.optional(v.any()),           // capped at 8 KB by the writer
    after: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_table_doc", ["tableName", "docId"]),

  /* ---------- site content ---------- */

  /** singleton. exactly one row, key === "main" */
  siteSettings: defineTable({
    key: v.literal("main"),

    businessNameHe: v.string(),            // "שי איזנשטט"
    taglineHe: v.string(),                 // "הופך רעיונות לדברים אמיתיים"
    whatsappNumberE164: v.string(),        // "972585845083"
    whatsappGreetingHe: v.string(),        // opening line of the generated message
    contactEmail: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),

    announcementEnabled: v.boolean(),
    announcementTextHe: v.optional(v.string()),
    announcementHref: v.optional(v.string()),

    turnaroundDaysMin: v.number(),
    turnaroundDaysMax: v.number(),
    pickupCityHe: v.string(),

    ogImageId: v.optional(v.id("_storage")),
    faviconId: v.optional(v.id("_storage")),

    maintenanceMode: v.boolean(),
    maintenanceTextHe: v.optional(v.string()),

    /** admin-only fields. never returned by settings.publicSettings */
    notifyEmail: v.optional(v.string()),
    notifyWhatsapp: v.optional(v.string()),
    internalNotesHe: v.optional(v.string()),

    updatedAt: v.number(),
    updatedBy: v.optional(v.id("admins")),
  }).index("by_key", ["key"]),

  homeSections: defineTable({
    kind: v.union(
      v.literal("hero"),
      v.literal("howItWorks"),
      v.literal("featuredProducts"),
      v.literal("generatorTeaser"),
      v.literal("gallery"),
      v.literal("storyTeaser"),
      v.literal("faq"),
      v.literal("finalCta"),
    ),
    enabled: v.boolean(),
    sortOrder: v.number(),

    eyebrowHe: v.optional(v.string()),
    headlineHe: v.optional(v.string()),
    /** the one word that gets the red marker box behind it */
    headlineAccentWord: v.optional(v.string()),
    subHe: v.optional(v.string()),
    bodyHe: v.optional(v.string()),

    primaryCtaLabelHe: v.optional(v.string()),
    primaryCtaHref: v.optional(v.string()),
    secondaryCtaLabelHe: v.optional(v.string()),
    secondaryCtaHref: v.optional(v.string()),

    imageId: v.optional(v.id("_storage")),
    imageAltHe: v.optional(v.string()),
    accent: accent,

    items: v.optional(
      v.array(
        v.object({
          titleHe: v.string(),
          bodyHe: v.optional(v.string()),
          iconKey: v.optional(v.string()),
          imageId: v.optional(v.id("_storage")),
          accent: accent,
        }),
      ),
    ),

    updatedAt: v.number(),
    updatedBy: v.optional(v.id("admins")),
  }).index("by_sort", ["sortOrder"]),

  aboutSections: defineTable({
    kind: v.union(
      v.literal("opener"),
      v.literal("paragraph"),
      v.literal("pullQuote"),
      v.literal("timelineItem"),
      v.literal("imageFull"),
      v.literal("twoUp"),
      v.literal("statement"),
    ),
    headingHe: v.optional(v.string()),
    bodyHe: v.optional(v.string()),
    quoteHe: v.optional(v.string()),
    labelHe: v.optional(v.string()),        // timeline label: "גיל שש חודשים"
    imageId: v.optional(v.id("_storage")),
    imageAltHe: v.optional(v.string()),
    accent: accent,
    sortOrder: v.number(),
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort", ["sortOrder"])
    .index("by_active_sort", ["active", "sortOrder"]),

  galleryItems: defineTable({
    titleHe: v.string(),
    captionHe: v.optional(v.string()),
    imageId: v.id("_storage"),
    imageAltHe: v.string(),
    width: v.number(),
    height: v.number(),
    blurDataUrl: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    /** set when the photo came from a customer who ticked the consent box */
    sourceLeadId: v.optional(v.id("leads")),
    tagsHe: v.array(v.string()),
    accent: accent,
    featured: v.boolean(),
    sortOrder: v.number(),
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active_sort", ["active", "sortOrder"])
    .index("by_featured", ["featured", "sortOrder"])
    .index("by_product", ["productId"]),

  faqItems: defineTable({
    questionHe: v.string(),
    answerHe: v.string(),
    placement: v.union(
      v.literal("home"),
      v.literal("generator"),
      v.literal("product"),
      v.literal("contact"),
    ),
    sortOrder: v.number(),
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_placement_sort", ["placement", "sortOrder"]),

  /* ---------- catalog ---------- */

  categories: defineTable({
    slug: v.string(),
    nameHe: v.string(),
    blurbHe: v.optional(v.string()),
    iconKey: v.optional(v.string()),
    accent: accent,
    sortOrder: v.number(),
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_sort", ["active", "sortOrder"]),

  products: defineTable({
    slug: v.string(),
    titleHe: v.string(),
    subtitleHe: v.optional(v.string()),
    descriptionHe: v.string(),               // markdown, rendered with a whitelist
    categoryId: v.optional(v.id("categories")),

    /** when set, the product page CTA opens the generator prefilled with this type */
    printTypeId: v.optional(v.id("printTypes")),

    priceMode: v.union(v.literal("fixed"), v.literal("from"), v.literal("quote")),
    priceAgorot: money,                      // 0 when priceMode === "quote"

    sizeNoteHe: v.optional(v.string()),
    leadTimeDaysMin: v.number(),
    leadTimeDaysMax: v.number(),

    badgeHe: v.optional(v.string()),         // "חדש" / "הכי מבוקש"
    badgeAccent: accent,
    accent: accent,

    heroImageId: v.optional(v.id("_storage")),
    featured: v.boolean(),
    sortOrder: v.number(),
    active: v.boolean(),
    deletedAt: v.optional(v.number()),

    seoTitleHe: v.optional(v.string()),
    seoDescriptionHe: v.optional(v.string()),
    ogImageId: v.optional(v.id("_storage")),

    viewCount: v.number(),
    whatsappClickCount: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("admins")),
  })
    .index("by_slug", ["slug"])
    .index("by_active_sort", ["active", "sortOrder"])
    .index("by_category", ["categoryId", "sortOrder"])
    .index("by_featured", ["featured", "sortOrder"])
    .searchIndex("search_title", { searchField: "titleHe", filterFields: ["active"] }),

  productImages: defineTable({
    productId: v.id("products"),
    storageId: v.id("_storage"),
    altHe: v.string(),
    width: v.number(),
    height: v.number(),
    blurDataUrl: v.optional(v.string()),
    isHero: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_product_sort", ["productId", "sortOrder"])
    .index("by_storage", ["storageId"]),

  productModels: defineTable({
    productId: v.id("products"),
    storageId: v.id("_storage"),
    filename: v.string(),
    sizeBytes: v.number(),
    triangleCount: v.optional(v.number()),
    boundingBoxMm: v.object({ x: v.number(), y: v.number(), z: v.number() }),
    defaultMaterialId: v.optional(v.id("materials")),
    defaultColorId: v.optional(v.id("filamentColors")),
    cameraPreset: v.object({
      position: v.array(v.number()),   // [x, y, z]
      target: v.array(v.number()),
      fov: v.number(),
    }),
    autoRotate: v.boolean(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_storage", ["storageId"]),

  /* ---------- generator building blocks ---------- */

  printTypes: defineTable({
    key: v.string(),                          // "lithophane" | "relief" | "glow" | "standee" | "keychain" | "magnet" | "framed"
    nameHe: v.string(),
    shortHe: v.string(),                      // one line under the tile in the generator
    descriptionHe: v.string(),
    basePriceAgorot: money,
    sizes: v.array(sizeOption),

    maxColors: v.number(),                    // hard cap the UI enforces, e.g. 6
    requiresPhoto: v.boolean(),
    allowedMaterialIds: v.array(v.id("materials")),

    /** react-three-fiber preview hints, read by the generator */
    previewGeometry: v.union(
      v.literal("plane"),
      v.literal("cylinder"),
      v.literal("keychain"),
      v.literal("magnet"),
      v.literal("framed"),
      v.literal("standee"),
    ),
    displacementScale: v.number(),            // 0.02 .. 0.6
    invertHeight: v.boolean(),                // true for lithophane
    planeSegments: v.number(),                // 128 .. 512
    backlitPreview: v.boolean(),              // lithophane renders with a light behind

    iconImageId: v.optional(v.id("_storage")),
    sampleImageId: v.optional(v.id("_storage")),
    accent: accent,

    sortOrder: v.number(),
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("admins")),
  })
    .index("by_key", ["key"])
    .index("by_active_sort", ["active", "sortOrder"]),

  materials: defineTable({
    key: v.string(),                          // "pla" | "matte" | "silk" | "glow"
    nameHe: v.string(),
    shortHe: v.string(),
    priceMultiplier: v.number(),              // 1.0 .. 3.0
    flatAddAgorot: money,

    /** three.js material hints */
    roughness: v.number(),
    metalness: v.number(),
    clearcoat: v.number(),
    emissiveHex: v.optional(v.string()),
    emissiveIntensity: v.number(),
    transmission: v.number(),

    swatchImageId: v.optional(v.id("_storage")),
    sortOrder: v.number(),
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_active_sort", ["active", "sortOrder"]),

  filamentColors: defineTable({
    nameHe: v.string(),                       // "אדום סוכריה"
    hex: v.string(),                          // "#F5333F"
    familyHe: v.string(),                     // "אדומים"
    isMetallic: v.boolean(),
    isGlow: v.boolean(),
    isTranslucent: v.boolean(),
    extraCostAgorot: money,                   // per unit, 0 for a normal spool
    stock: stock,
    swatchImageId: v.optional(v.id("_storage")),
    sortOrder: v.number(),                    // fractional index
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active_sort", ["active", "sortOrder"])
    .index("by_stock", ["stock", "sortOrder"]),

  /* ---------- pricing ---------- */

  /** exactly two rows. channel "live" is what the site charges, "draft" is what Shai edits */
  pricingConfig: defineTable({
    channel: v.union(v.literal("live"), v.literal("draft")),
    version: v.number(),

    freeColorCount: v.number(),               // 4
    extraColorAgorot: money,                  // per colour beyond the free count

    rushEnabled: v.boolean(),
    rushPercentBp: bp,
    rushLabelHe: v.string(),

    shippingFlatAgorot: money,
    freeShippingThresholdAgorot: money,
    pickupEnabled: v.boolean(),
    pickupLabelHe: v.string(),

    minOrderAgorot: money,
    roundToAgorot: v.number(),                // 1 | 10 | 50 | 100 | 500 | 1000
    roundingMode: v.union(v.literal("up"), v.literal("nearest")),
    charmEnding: v.boolean(),                 // subtract 10 agorot after rounding, ‎40 ₪ -> ‎39.90 ₪

    priceDisclaimerHe: v.string(),            // shown under the price tag
    maxPlausibleTotalAgorot: money,           // guard ceiling, default 300000

    updatedAt: v.number(),
    updatedBy: v.optional(v.id("admins")),
    publishedAt: v.optional(v.number()),
  }).index("by_channel", ["channel"]),

  /** full snapshot of everything that affects a price, written on every publish */
  pricingVersions: defineTable({
    version: v.number(),
    noteHe: v.optional(v.string()),
    publishedAt: v.number(),
    publishedBy: v.optional(v.id("admins")),
    snapshot: v.any(),                        // { config, printTypes, materials, filamentColors, surchargeRules, tiers }
  }).index("by_version", ["version"]),

  surchargeRules: defineTable({
    labelHe: v.string(),
    descriptionHe: v.optional(v.string()),
    trigger: v.union(
      v.object({
        kind: v.literal("optionalAddon"),
        mode: v.union(v.literal("flat"), v.literal("percent"), v.literal("perUnit")),
        amountAgorot: money,
        percentBp: bp,
      }),
      v.object({
        kind: v.literal("autoOversize"),
        minLongestEdgeMm: v.number(),
        amountAgorot: money,
      }),
      v.object({
        kind: v.literal("autoMaterial"),
        materialId: v.id("materials"),
        amountAgorot: money,
      }),
      v.object({
        kind: v.literal("autoColorCount"),
        minColors: v.number(),
        amountAgorot: money,
      }),
    ),
    appliesToAll: v.boolean(),
    printTypeIds: v.array(v.id("printTypes")),
    sortOrder: v.number(),
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active_sort", ["active", "sortOrder"]),

  quantityDiscountTiers: defineTable({
    minQty: v.number(),
    discountBp: bp,
    labelHe: v.string(),                      // "3 יחידות ומעלה"
    active: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active_qty", ["active", "minQty"]),

  /** three configurations Shai keeps as reference points in the pricing lab */
  pricingSamples: defineTable({
    labelHe: v.string(),                      // "ליתופן בינוני, 2 צבעים"
    printTypeId: v.id("printTypes"),
    materialId: v.id("materials"),
    sizeKey: v.string(),
    colorCount: v.number(),
    quantity: v.number(),
    deliveryMethod: v.union(v.literal("pickup"), v.literal("shipping")),
    rush: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  }).index("by_sort", ["sortOrder"]),

  /* ---------- visitor data ---------- */

  generatorDrafts: defineTable({
    /** uuid v4 the browser stores in localStorage. the only identity a visitor has */
    sessionKey: v.string(),
    status: v.union(
      v.literal("building"),
      v.literal("previewed"),
      v.literal("submitted"),
      v.literal("abandoned"),
    ),
    step: v.number(),                         // 1..6, furthest step reached
    furthestStep: v.number(),

    photoId: v.optional(v.id("_storage")),
    photoMeta: v.optional(
      v.object({
        width: v.number(),
        height: v.number(),
        bytes: v.number(),
        mime: v.string(),
      }),
    ),
    photoShareConsent: v.boolean(),           // visitor ticked "מותר לשי להראות את זה בגלריה"

    /** PNG the client captures off the r3f canvas after the preview renders */
    previewSnapshotId: v.optional(v.id("_storage")),

    printTypeId: v.optional(v.id("printTypes")),
    materialId: v.optional(v.id("materials")),
    sizeKey: v.optional(v.string()),
    colorIds: v.array(v.id("filamentColors")),
    quantity: v.number(),
    addonRuleIds: v.array(v.id("surchargeRules")),
    rush: v.boolean(),
    deliveryMethod: v.union(v.literal("pickup"), v.literal("shipping")),
    noteHe: v.optional(v.string()),

    /** server computed, rewritten on every save. never accepted from the client */
    priceAgorot: v.optional(money),
    breakdown: v.optional(priceBreakdown),

    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),

    leadId: v.optional(v.id("leads")),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    utm: v.optional(v.object({
      source: v.optional(v.string()),
      medium: v.optional(v.string()),
      campaign: v.optional(v.string()),
    })),

    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_session", ["sessionKey"])
    .index("by_status_updated", ["status", "updatedAt"])
    .index("by_updated", ["updatedAt"])
    .index("by_lead", ["leadId"]),

  leads: defineTable({
    draftId: v.optional(v.id("generatorDrafts")),
    source: v.union(
      v.literal("generator"),
      v.literal("product"),
      v.literal("contact"),
      v.literal("manual"),
    ),

    name: v.string(),
    phone: v.string(),                        // normalised to E.164 on write
    email: v.optional(v.string()),

    productId: v.optional(v.id("products")),
    configSnapshot: v.optional(configSnapshot),
    breakdown: v.optional(priceBreakdown),
    priceAgorot: money,
    priceOverrideAgorot: v.optional(money),   // what Shai actually charged after talking
    overrideReasonHe: v.optional(v.string()),

    photoId: v.optional(v.id("_storage")),
    previewSnapshotId: v.optional(v.id("_storage")),
    photoShareConsent: v.boolean(),

    /** exact text handed to WhatsApp, generated server side */
    whatsappMessage: v.string(),
    whatsappOpenedAt: v.optional(v.number()),

    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("quoted"),
      v.literal("printing"),
      v.literal("done"),
      v.literal("lost"),
    ),
    statusHistory: v.array(
      v.object({
        status: v.string(),
        at: v.number(),
        byAdminId: v.optional(v.id("admins")),
        noteHe: v.optional(v.string()),
      }),
    ),
    lostReasonHe: v.optional(v.string()),

    dueDate: v.optional(v.number()),
    internalNotesHe: v.optional(v.string()),
    pinned: v.boolean(),
    archivedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_created", ["createdAt"])
    .index("by_phone", ["phone"])
    .index("by_archived", ["archivedAt"])
    .index("by_pinned_created", ["pinned", "createdAt"]),

  contactMessages: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    subjectHe: v.optional(v.string()),
    bodyHe: v.string(),
    sessionKey: v.optional(v.string()),
    status: v.union(
      v.literal("new"),
      v.literal("read"),
      v.literal("replied"),
      v.literal("spam"),
    ),
    convertedLeadId: v.optional(v.id("leads")),
    internalNotesHe: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_created", ["createdAt"]),

  /* ---------- plumbing ---------- */

  /** fixed window counter. key is "action:identity" */
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  /** one-shot permission to write a file. issued by a public mutation, consumed once */
  pendingUploads: defineTable({
    token: v.string(),
    sessionKey: v.string(),
    purpose: v.union(v.literal("generatorPhoto"), v.literal("previewSnapshot")),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
  })
    .index("by_token", ["token"])
    .index("by_session", ["sessionKey", "createdAt"]),
});
```

### A.2 Relationships worth stating out loud

- `printTypes.allowedMaterialIds` is the whitelist the generator shows in step 3. A material that is soft deleted stays in the array; the query filters it out, so the array never needs repair.
- `leads.configSnapshot` duplicates the labels on purpose. When Shai renames "ליתופן" to "תמונת אור" next month, a lead from March still reads correctly. The live ids are kept in the draft; the frozen text is kept in the lead.
- `generatorDrafts` -> `leads` is one directional at write time and linked both ways after (`draft.leadId`, `lead.draftId`), because both inboxes need to jump to each other.
- `galleryItems.sourceLeadId` exists so that a customer photo can only enter the gallery through a lead whose `photoShareConsent` is true. The mutation checks it.
- `pricingVersions.snapshot` holds copies of print types, materials, colours, rules and tiers, so a rollback restores the whole price surface, not only the global knobs.

### A.3 Soft delete and the trash

`products`, `categories`, `printTypes`, `materials`, `filamentColors`, `surchargeRules`, `quantityDiscountTiers`, `galleryItems`, `aboutSections`, `faqItems` all carry `deletedAt`.

- Every public query filters `q.eq(q.field("deletedAt"), undefined)`.
- `/admin/trash` lists everything with `deletedAt` set, grouped by table, newest first, with a "שחזר" button.
- The nightly cron hard deletes rows whose `deletedAt` is older than 30 days and deletes their `_storage` files in the same mutation.
- `leads` and `contactMessages` are never deleted, only archived. A thirteen year old should not be able to erase the record of a customer.

### A.4 Function inventory

Naming: `module.functionName`. Every mutation that writes anything other than a draft or a contact message starts with `const admin = await requireAdmin(ctx)`.

#### `convex/lib/authz.ts` (not Convex functions, plain helpers)

```ts
requireAdmin(ctx): Promise<Doc<"admins">>          // throws UNAUTHENTICATED / FORBIDDEN
requireOwner(ctx): Promise<Doc<"admins">>          // additionally role === "owner"
currentAdmin(ctx): Promise<Doc<"admins"> | null>   // no throw, used by the shell
logActivity(ctx, admin, entry): Promise<void>
```

#### `convex/admins.ts`

| Function | Kind | Signature | Access |
|---|---|---|---|
| `me` | query | `() => { admin, user } \| null` | authenticated, returns null when not an admin |
| `list` | query | `() => Doc<"admins">[]` | **owner** |
| `invite` | mutation | `({ email, role, displayNameHe }) => Id<"adminInvites">` | **owner** |
| `revokeInvite` | mutation | `({ inviteId }) => null` | **owner** |
| `listInvites` | query | `() => Doc<"adminInvites">[]` | **owner** |
| `setDisplayName` | mutation | `({ displayNameHe }) => null` | admin, self only |
| `disable` | mutation | `({ adminId }) => null` | **owner**, refuses the last active owner |
| `enable` | mutation | `({ adminId }) => null` | **owner** |
| `inviteFromCli` | **internal**Mutation | `({ email, role, displayNameHe }) => Id<"adminInvites">` | deploy key only, the break-glass path |
| `bootstrapStatus` | query | `() => { adminCount, hasOwner }` | public, returns counts only, no identities |

#### `convex/settings.ts`

| Function | Kind | Signature | Access |
|---|---|---|---|
| `publicSettings` | query | `() => PublicSettings` | **public**, whitelisted fields only |
| `get` | query | `() => Doc<"siteSettings">` | admin |
| `update` | mutation | `({ patch: Partial<Settings> }) => null` | admin |
| `ensureSingleton` | internalMutation | `() => null` | seed script |

`PublicSettings` explicitly excludes `notifyEmail`, `notifyWhatsapp`, `internalNotesHe`. The query builds a new object field by field. Never `return doc`.

#### `convex/home.ts`, `convex/about.ts`, `convex/gallery.ts`, `convex/faq.ts`

Same shape in each:

```
list           query      () => Doc[]                              public, active + not deleted
listAll        query      () => Doc[]                              admin, includes disabled
create         mutation   ({ ...fields }) => Id                     admin
update         mutation   ({ id, patch }) => null                   admin
reorder        mutation   ({ id, beforeId?, afterId? }) => null      admin
setActive      mutation   ({ id, active }) => null                  admin
softDelete     mutation   ({ id }) => null                          admin
restore        mutation   ({ id }) => null                          admin
```

`gallery.createFromLead({ leadId, titleHe, captionHe })` is admin only and throws `he: "הלקוח לא אישר להציג את התמונה"` when `photoShareConsent` is false.

#### `convex/products.ts`

| Function | Kind | Signature | Access |
|---|---|---|---|
| `list` | query | `({ categorySlug?, limit? }) => ProductCard[]` | public |
| `bySlug` | query | `({ slug }) => ProductDetail \| null` | public |
| `featured` | query | `({ limit }) => ProductCard[]` | public |
| `listAdmin` | query | `({ includeDeleted? }) => Doc<"products">[]` | admin |
| `get` | query | `({ id }) => ProductDetail` | admin |
| `create` | mutation | `({ titleHe, slug?, ... }) => Id<"products">` | admin |
| `update` | mutation | `({ id, patch }) => null` | admin |
| `reorder` | mutation | `({ id, beforeId?, afterId? }) => null` | admin |
| `setActive` | mutation | `({ id, active }) => null` | admin |
| `softDelete` / `restore` / `hardDelete` | mutation | `({ id })` | admin, `hardDelete` is **owner** |
| `addImage` | mutation | `({ productId, storageId, altHe, width, height, blurDataUrl })` | admin |
| `removeImage` | mutation | `({ imageId })` | admin |
| `reorderImages` | mutation | `({ imageId, beforeId?, afterId? })` | admin |
| `setHeroImage` | mutation | `({ productId, imageId })` | admin |
| `attachModel` | mutation | `({ productId, storageId, filename, sizeBytes, triangleCount?, boundingBoxMm })` | admin |
| `updateModel` | mutation | `({ modelId, patch })` | admin |
| `removeModel` | mutation | `({ modelId })` | admin |
| `trackView` | mutation | `({ slug }) => null` | **public**, rate limited to 1 per slug per session per hour |

`ProductDetail` resolves storage URLs with `ctx.storage.getUrl` inside the query, so the client never sees a raw `storageId`.

#### `convex/printTypes.ts`, `convex/materials.ts`, `convex/filamentColors.ts`, `convex/surcharges.ts`, `convex/discountTiers.ts`

```
listActive     query      () => Doc[]            public
listAdmin      query      ({includeDeleted?}) => Doc[]   admin
create         mutation   admin
update         mutation   admin
reorder        mutation   admin
setActive      mutation   admin
softDelete     mutation   admin
restore        mutation   admin
```

Plus type specific ones:

- `printTypes.upsertSize({ printTypeId, size })`, `printTypes.removeSize({ printTypeId, key })`, `printTypes.reorderSizes({ printTypeId, keys })` (admin). Sizes live inside the document, so reordering rewrites one row.
- `filamentColors.setStock({ id, stock })` (admin). Out of stock colours stay visible in the generator with a diagonal line and the label "אזל, אפשר לבחור אחר", because hiding them makes the palette feel smaller than it is.
- `discountTiers.replaceAll({ tiers })` (admin). Tiers are edited as a small table and saved together, so validation runs on the whole ladder at once.

#### `convex/pricing.ts` (the important module)

| Function | Kind | Signature | Access |
|---|---|---|---|
| `publicConfig` | query | `() => PriceEngineConfig` | **public**. The whole live pricing surface: config knobs, active print types with sizes, active materials, active colours, active rules, active tiers, plus `version` |
| `quote` | query | `({ input: PriceInput }) => PriceBreakdown` | **public**. Server authoritative quote for one configuration. Read only, writes nothing |
| `draftConfig` | query | `() => PriceEngineConfig` | admin. Same shape, built from the `draft` channel |
| `previewQuote` | query | `({ input, overrides: ConfigOverrides }) => PriceBreakdown` | admin. Applies unsaved form values on top of the draft config, used by the pricing lab |
| `updateDraft` | mutation | `({ patch }) => { warnings: string[] }` | admin. Validates with `assertConfigSane`, throws on a hard failure, returns soft warnings |
| `publish` | mutation | `({ noteHe? }) => { version } ` | **owner**. Copies draft to live, bumps `version`, writes a `pricingVersions` snapshot |
| `discardDraft` | mutation | `() => null` | admin. Copies live back over draft |
| `listVersions` | query | `({ limit }) => VersionRow[]` | admin |
| `rollback` | mutation | `({ version }) => null` | **owner**. Restores a snapshot into the draft channel. Publishing is still a second, deliberate action |
| `samples` | query | `() => Doc<"pricingSamples">[]` | admin |
| `upsertSample` / `deleteSample` | mutation | admin |
| `lastRealConfig` | query | `() => PriceInput \| null` | admin. The newest draft a visitor built, used as a fourth sample in the lab |

#### `convex/drafts.ts`

| Function | Kind | Signature | Access |
|---|---|---|---|
| `saveDraft` | mutation | `({ sessionKey, patch: DraftPatch }) => { draftId, breakdown }` | **public**, rate limited |
| `getBySession` | query | `({ sessionKey }) => DraftView \| null` | **public**, only its own session |
| `requestPhotoUpload` | mutation | `({ sessionKey, purpose }) => { uploadUrl, token }` | **public**, rate limited |
| `attachPhoto` | mutation | `({ sessionKey, token, storageId, meta }) => null` | **public**, validates the token |
| `attachPreviewSnapshot` | mutation | `({ sessionKey, token, storageId }) => null` | **public** |
| `setConsent` | mutation | `({ sessionKey, photoShareConsent }) => null` | **public** |
| `listAdmin` | query | `({ status?, cursor?, limit }) => Page<DraftAdminRow>` | admin |
| `getAdmin` | query | `({ id }) => DraftAdminDetail` | admin, resolves photo and snapshot URLs |
| `funnel` | query | `({ days }) => { step: number, reached: number }[]` | admin |
| `deleteDraft` | mutation | `({ id }) => null` | admin |
| `markAbandoned` | internalMutation | cron |
| `purgeOld` | internalMutation | cron |

`DraftPatch` accepts only these keys: `printTypeId`, `materialId`, `sizeKey`, `colorIds`, `quantity`, `addonRuleIds`, `rush`, `deliveryMethod`, `noteHe`, `step`, `contactName`, `contactPhone`. Anything else is rejected by the argument validator. **`priceAgorot` and `breakdown` are not in the validator**, so a crafted request cannot set them.

#### `convex/leads.ts`

| Function | Kind | Signature | Access |
|---|---|---|---|
| `submit` | mutation | `({ sessionKey, name, phone, email?, noteHe? }) => { leadId, whatsappUrl, breakdown }` | **public**, rate limited to 5 per session per hour |
| `submitFromProduct` | mutation | `({ sessionKey, productSlug, name, phone, noteHe? }) => { leadId, whatsappUrl }` | **public** |
| `markWhatsappOpened` | mutation | `({ leadId, sessionKey }) => null` | **public**, one write, ignores repeats |
| `list` | query | `({ status?, archived?, search?, cursor?, limit }) => Page<LeadRow>` | admin |
| `get` | query | `({ id }) => LeadDetail` | admin |
| `setStatus` | mutation | `({ id, status, noteHe? }) => null` | admin |
| `setNotes` | mutation | `({ id, internalNotesHe }) => null` | admin, autosaved |
| `setOverridePrice` | mutation | `({ id, priceOverrideAgorot, overrideReasonHe }) => null` | admin |
| `setPinned` | mutation | `({ id, pinned }) => null` | admin |
| `setDueDate` | mutation | `({ id, dueDate })` | admin |
| `archive` / `unarchive` | mutation | `({ id })` | admin |
| `createManual` | mutation | `({ name, phone, noteHe, priceAgorot })` | admin, for orders that arrive by phone |
| `counts` | query | `() => Record<LeadStatus, number>` | admin |

#### `convex/contact.ts`

| Function | Kind | Signature | Access |
|---|---|---|---|
| `send` | mutation | `({ name, phone, email?, subjectHe?, bodyHe, sessionKey? }) => null` | **public**, rate limited to 3 per session per hour and 60 globally per hour |
| `list` | query | `({ status?, cursor?, limit }) => Page<Doc<"contactMessages">>` | admin |
| `setStatus` | mutation | `({ id, status }) => null` | admin |
| `setNotes` | mutation | `({ id, internalNotesHe }) => null` | admin |
| `convertToLead` | mutation | `({ id }) => Id<"leads">` | admin |

#### `convex/files.ts`

| Function | Kind | Signature | Access |
|---|---|---|---|
| `generateAdminUploadUrl` | mutation | `({ purpose }) => string` | admin |
| `registerAdminUpload` | mutation | `({ storageId, purpose, meta })` | admin |
| `deleteFile` | mutation | `({ storageId })` | admin, refuses when the file is still referenced |

Visitor uploads never touch this module. They go through `drafts.requestPhotoUpload`, which is the only public path to `ctx.storage.generateUploadUrl()`, and it is rate limited to 12 uploads per session per hour and 400 per hour globally.

#### `convex/dashboard.ts`

| Function | Kind | Signature | Access |
|---|---|---|---|
| `summary` | query | `() => { newLeads, openOrders, draftsToday, abandonedToday, unpublishedPricing, messagesUnread }` | admin |
| `recentActivity` | query | `({ limit }) => Doc<"adminActivity">[]` | admin |
| `launchChecklist` | query | `() => ChecklistItem[]` | admin |
| `weekChart` | query | `() => { day: string, drafts: number, leads: number }[]` | admin |

#### `convex/crons.ts`

```ts
crons.hourly("mark abandoned drafts", { minuteUTC: 7 }, internal.drafts.markAbandoned, {});
crons.daily("purge trash", { hourUTC: 0, minuteUTC: 20 }, internal.maintenance.purgeTrash, {});
crons.daily("purge old drafts", { hourUTC: 0, minuteUTC: 35 }, internal.drafts.purgeOld, {});
crons.weekly("renormalise sort orders", { dayOfWeek: "sunday", hourUTC: 1, minuteUTC: 0 },
  internal.maintenance.renormaliseSortOrders, {});
crons.hourly("sweep rate limits", { minuteUTC: 50 }, internal.maintenance.sweepRateLimits, {});
```

`markAbandoned` moves a draft from `building` to `abandoned` when `lastSeenAt` is older than 45 minutes and no lead exists. `purgeOld` deletes abandoned drafts with no phone number older than 90 days, together with their storage files.

### A.5 The authorisation boundary, stated plainly

**A visitor with no session may write exactly four things:**

1. a row in `generatorDrafts` keyed by a `sessionKey` they generated, and only the configuration keys listed in `DraftPatch`
2. a file in `_storage` through a one shot token issued by `drafts.requestPhotoUpload`
3. a row in `leads` through `leads.submit`, where every money field is computed by the server
4. a row in `contactMessages` through `contact.send`

Everything else in the database is admin only. There is no public mutation that takes a price, a discount, a boolean called `isAdmin`, or a document id belonging to another session.

**Session ownership.** `sessionKey` is a uuid v4 in `localStorage`. It is a capability, not an identity: knowing it grants access to that one draft. That is acceptable because the draft holds a photo the visitor uploaded themselves and a price they already saw. `drafts.getBySession` never accepts a draft `_id`, only the `sessionKey`, so ids cannot be enumerated.

**Public read surface.** Public queries return built objects, never raw documents. `pricing.publicConfig` returns exactly the numbers already visible in the running price, so exposing it costs nothing. Visitor photos are never resolvable publicly: `_storage` URLs for `generatorDrafts.photoId` are only produced inside `drafts.getAdmin` and `leads.get`.

### A.6 Pricing is computed on the server, and the client never duplicates the formula

This is the part that must not be improvised during the build.

**The engine.** `convex/lib/priceEngine.ts` exports:

```ts
export type PriceInput = {
  printTypeKey: string;
  materialKey: string;
  sizeKey: string;
  colorIds: string[];
  quantity: number;
  addonRuleIds: string[];
  rush: boolean;
  deliveryMethod: "pickup" | "shipping";
};

export type PriceEngineConfig = {
  version: number;
  config: { freeColorCount: number; extraColorAgorot: number; rushEnabled: boolean;
            rushPercentBp: number; shippingFlatAgorot: number; freeShippingThresholdAgorot: number;
            pickupEnabled: boolean; minOrderAgorot: number; roundToAgorot: number;
            roundingMode: "up" | "nearest"; charmEnding: boolean; maxPlausibleTotalAgorot: number };
  printTypes: PrintTypeLite[];
  materials: MaterialLite[];
  colors: ColorLite[];
  rules: RuleLite[];
  tiers: TierLite[];
};

export function computePrice(input: PriceInput, cfg: PriceEngineConfig): PriceBreakdown;
export function assertConfigSane(cfg: PriceEngineConfig): { errors: Issue[]; warnings: Issue[] };
export const SAMPLE_INPUTS: PriceInput[]; // six canonical configurations used by the guards
```

The file imports nothing. No `convex/values`, no `ctx`, no React, no `Id<>` types (ids are plain strings inside the engine). That constraint is what lets the identical module load in the browser bundle and in the Convex runtime. Enforce it with an ESLint `no-restricted-imports` rule scoped to `convex/lib/priceEngine.ts`.

**The order of operations**, fixed, and the order itself is part of the contract:

```
1  base            = printType.basePriceAgorot
2  size            = base * size.multiplier
3  material        = size * material.priceMultiplier + material.flatAddAgorot
4  colours         = + max(0, colorCount - freeColorCount) * extraColorAgorot
                     + sum(color.extraCostAgorot) for every selected colour
5  auto rules      = + oversize / material / colour-count rules that match
6  optional addons = + flat, percent-of-current, or perUnit addons the visitor ticked
7  rush            = + round(current * rushPercentBp / 10000) when rush and rushEnabled
8  round unit      = roundingMode applied at roundToAgorot, then charmEnding subtracts 10 agorot
9  line total      = unitPrice * quantity
10 discount        = - round(lineTotal * highestMatchingTier.discountBp / 10000)
11 delivery        = + shippingFlatAgorot, unless pickup or afterDiscount >= freeShippingThreshold
12 minimum         = total = max(total, minOrderAgorot), the difference recorded as minOrderBumpAgorot
```

Every intermediate value lands in the returned `PriceBreakdown`, so the admin lab and the customer's price tag both display the same rows and nobody has to guess where a number came from.

**How the live client price works.** The generator page runs:

```ts
const cfg = useQuery(api.pricing.publicConfig);           // one subscription, reactive
const breakdown = useMemo(
  () => (cfg ? computePrice(input, cfg) : null),
  [input, cfg],
);
```

Instant, no network call per slider tick, and it is literally the same function the server runs. When Shai publishes a price change, the Convex subscription pushes the new config and every open browser recomputes within a second.

**How the server stays authoritative.** `leads.submit` never receives a price. It:

1. loads the draft by `sessionKey`
2. rebuilds `PriceEngineConfig` from the **live** channel inside the mutation
3. calls the same `computePrice`
4. writes `breakdown`, `priceAgorot` and `configSnapshot` from that result
5. builds the WhatsApp text from that result with `buildWhatsappMessage(lead, settings)` in `convex/lib/whatsappMessage.ts`, another pure module shared by both runtimes
6. returns `{ leadId, whatsappUrl, breakdown }`

The final generator screen shows the price returned by step 6, not the local one. If the two differ (Shai published mid-session), the UI swaps to the server number and shows one calm line: `"המחיר עודכן. זה המחיר הנכון."` Nothing in the flow breaks, and no customer is ever handed a WhatsApp message with a number Shai does not honour.

**Drift detection.** `pricing.quote` is a read only query taking the same `PriceInput`. A dev-mode assertion in the generator calls it once when the preview finishes and logs a console error when the local and server totals differ. `convex/lib/priceEngine.test.ts` holds golden cases (twelve inputs, expected totals in agorot) so a change in the order of operations fails CI instead of failing a customer.

---

## PART B · Convex Auth, admin only

### B.1 Provider choice

**Password provider from `@convex-dev/auth/providers/Password`, email plus password, with public sign-up closed by an invite check.**

Why this and nothing else: a magic link needs a mail provider, a verified sending domain and a working inbox on Shai's phone, which adds two dependencies to a site that has one user. OAuth would tie his shop to a Google account managed by his school. A password he chooses himself, on a form in Hebrew, works on a phone in a bomb shelter with bad reception.

```ts
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: String(params.email).trim().toLowerCase(),
          name: String(params.name ?? "").trim(),
        };
      },
    }),
  ],

  session: {
    totalDurationMs: 1000 * 60 * 60 * 24 * 30,   // 30 days before a forced re-login
    inactiveDurationMs: 1000 * 60 * 60 * 24 * 14, // 14 days of silence ends the session
  },

  callbacks: {
    /**
     * THE ONLY user creation path in this project.
     * Everything that must happen when an account appears happens HERE.
     * Do not add afterUserCreatedOrUpdated. See the note below.
     */
    async createOrUpdateUser(ctx, args) {
      const email = String(args.profile.email ?? "").trim().toLowerCase();
      if (!email) throw new ConvexError({ code: "BAD_EMAIL", he: "כתובת מייל לא תקינה" });

      // existing user signing in again
      if (args.existingUserId) {
        const admin = await ctx.db
          .query("admins")
          .withIndex("by_userId", (q) => q.eq("userId", args.existingUserId!))
          .unique();
        if (!admin || admin.disabledAt) {
          throw new ConvexError({ code: "FORBIDDEN", he: "אין לך הרשאה להיכנס" });
        }
        await ctx.db.patch(admin._id, { lastLoginAt: Date.now() });
        return args.existingUserId;
      }

      // new account. two doors, both narrow.
      const invite = await ctx.db
        .query("adminInvites")
        .withIndex("by_email", (q) => q.eq("email", email))
        .filter((q) => q.eq(q.field("consumedAt"), undefined))
        .unique();

      const adminCount = (await ctx.db.query("admins").take(1)).length;
      const bootstrapEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
      const isBootstrap = adminCount === 0 && bootstrapEmail !== "" && email === bootstrapEmail;

      if (!invite && !isBootstrap) {
        throw new ConvexError({ code: "NO_INVITE", he: "אין הרשאה לפתוח משתמש" });
      }
      if (invite && invite.expiresAt < Date.now()) {
        throw new ConvexError({ code: "INVITE_EXPIRED", he: "ההזמנה פגה. בקש הזמנה חדשה" });
      }

      const userId = await ctx.db.insert("users", {
        email,
        name: args.profile.name || invite?.displayNameHe || "מנהל",
        emailVerificationTime: Date.now(),
      });

      const adminId = await ctx.db.insert("admins", {
        userId,
        role: isBootstrap ? "owner" : (invite!.role),
        displayNameHe: invite?.displayNameHe ?? "שי",
        email,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      });

      if (invite) {
        await ctx.db.patch(invite._id, { consumedAt: Date.now(), consumedByUserId: userId });
      }

      await ctx.db.insert("adminActivity", {
        actorLabelHe: "המערכת",
        action: "admins.created",
        tableName: "admins",
        docId: adminId,
        summaryHe: `נפתח משתמש מנהל ל-${email}`,
        createdAt: Date.now(),
      });

      return userId;
    },
  },
});
```

### B.2 The `afterUserCreatedOrUpdated` trap

Convex Auth runs `afterUserCreatedOrUpdated` **only when you have not defined `createOrUpdateUser`**. Defining `createOrUpdateUser` replaces the library's default user creation, and the after hook that the default path invokes never fires. A project that puts "insert the admins row" in the after hook and "check the invite" in `createOrUpdateUser` gets a user with no admin row, a login that succeeds, and an admin panel that rejects the only person who can fix it.

The rule for this repo, one line, and it belongs as a comment at the top of `convex/auth.ts`:

> `createOrUpdateUser` is defined here, so `afterUserCreatedOrUpdated` will never run. Every side effect of account creation lives inside `createOrUpdateUser`.

Guard it in CI with a grep test in `convex/auth.test.ts`:

```ts
it("never defines afterUserCreatedOrUpdated", () => {
  const src = readFileSync("convex/auth.ts", "utf8");
  expect(src).not.toMatch(/afterUserCreatedOrUpdated/);
});
```

### B.3 Bootstrapping the first admin without locking anyone out

Fresh deployment, empty database, nobody can log in and nobody can invite. Three layers, in this order:

**Layer 1, the self-closing env door.** Set the deployment variable once:

```bash
npx convex env set BOOTSTRAP_ADMIN_EMAIL "shai@example.com"
```

The condition in `createOrUpdateUser` is `adminCount === 0 && email === bootstrapEmail`. The instant the first admin row exists, that door closes on its own. Leaving the variable in place afterwards is harmless, which matters because a thirteen year old will not remember to unset it. Still, the deploy checklist includes `npx convex env remove BOOTSTRAP_ADMIN_EMAIL` after the first successful login.

**Layer 2, invites from inside.** Once an owner exists, `/admin/settings/admins` issues invites: an email, a role, a display name, an expiry of 7 days. The invited person goes to `/admin/login`, switches to "פתיחת משתמש", enters the same email and a password, and the invite is consumed inside the same transaction that creates their admin row.

**Layer 3, the break-glass.** `admins.inviteFromCli` is an `internalMutation`. Internal functions are unreachable from any browser and require the deploy key, so this is the recovery path when the last owner forgets the password and the invite list is empty:

```bash
npx convex run admins:inviteFromCli '{"email":"ariel@example.com","role":"owner","displayNameHe":"אריאל"}'
```

Password reset for an existing account uses the same mechanism: `npx convex run admins:clearPassword '{"email":"shai@example.com"}'` deletes the `authAccounts` row for that provider, which lets the person set a new password with the same invited email. Nothing here can be triggered from the public internet.

`admins.bootstrapStatus` is public but returns only `{ adminCount, hasOwner }`, so `/admin/login` can show "עוד לא נפתח משתמש" on a fresh deployment without leaking who the admins are.

### B.4 Role storage and checks

The role lives in `admins.role`, never in the JWT and never in `users`. Reason: a role in a token stays valid until the token expires, so disabling an admin would take up to an hour to take effect. A database read per call is cheap in Convex and takes effect immediately.

```ts
// convex/lib/authz.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED", he: "צריך להתחבר" });
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!admin || admin.disabledAt) {
    throw new ConvexError({ code: "FORBIDDEN", he: "אין לך הרשאה" });
  }
  return admin;
}

export async function requireOwner(ctx: QueryCtx | MutationCtx) {
  const admin = await requireAdmin(ctx);
  if (admin.role !== "owner") {
    throw new ConvexError({ code: "FORBIDDEN_ROLE", he: "רק בעל האתר יכול לעשות את זה" });
  }
  return admin;
}
```

Role matrix:

| Action | owner | editor |
|---|---|---|
| Read every admin screen | yes | yes |
| Edit content, products, colours, leads | yes | yes |
| Edit the pricing **draft** | yes | yes |
| **Publish** prices, roll back a version | yes | no |
| Hard delete, empty the trash | yes | no |
| Invite, disable and enable admins | yes | no |
| Change the WhatsApp number | yes | no |

Shai is the owner. Ariel gets an owner account too, because the person who can fix a locked-out deployment should not be a thirteen year old alone. Anyone else who ever helps gets `editor`.

### B.5 Session behaviour

- Refresh token in an httpOnly cookie, handled by `ConvexAuthNextjsServerProvider`.
- 30 day total lifetime, 14 day inactivity window. Shai logs in roughly once a month.
- `signOut` clears the refresh token server side, so "יציאה" on a shared laptop actually ends the session.
- The login form is rate limited by Convex Auth's own `authRateLimits` table. On top of that, `/admin/login` shows a Hebrew cooldown message after 5 failures: `"יותר מדי ניסיונות. נסה שוב בעוד דקה."`
- No "remember me" checkbox. One behaviour, always.

### B.6 Protecting `/admin` in Next 16 App Router

Three layers, and the third is the only one that is actually security.

**1. The proxy file.** Next 16 renamed `middleware.ts` to `proxy.ts`. When the app uses a `src/` directory the file must be at **`src/proxy.ts`**. Placed at the repo root next to `package.json` it is silently ignored, the build succeeds, and `/admin` looks protected while it is wide open. This has burned this stack before.

```ts
// src/proxy.ts
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
  isAuthenticatedNextjs,
} from "@convex-dev/auth/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isLoginRoute = createRouteMatcher(["/admin/login"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();
  if (isAdminRoute(request) && !isLoginRoute(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/admin/login");
  }
  if (isLoginRoute(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/admin");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

**2. The protected layout.** `src/app/admin/(protected)/layout.tsx` is a server component that reads the token and checks the admin row before rendering anything:

```tsx
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/../convex/_generated/api";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const token = await convexAuthNextjsToken();
  const me = token ? await fetchQuery(api.admins.me, {}, { token }) : null;
  if (!me) redirect("/admin/login");
  return <AdminShell admin={me.admin}>{children}</AdminShell>;
}
```

This catches the case the proxy cannot: a valid session belonging to a user who is authenticated but not an admin, or an admin who was disabled five minutes ago.

**3. Every Convex function checks for itself.** Layers 1 and 2 are user experience. The boundary is `requireAdmin` inside each query and mutation. A `curl` against the Convex HTTP endpoint bypasses Next entirely, so the answer has to live in the function.

Root layout wiring:

```tsx
// src/app/layout.tsx
<html lang="he" dir="rtl">
  <body>
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  </body>
</html>
```

`/admin` sets `export const dynamic = "force-dynamic"` and `robots: { index: false, follow: false }` in its metadata, and `src/app/robots.ts` disallows `/admin`.

---

## PART C · The admin panel

### C.1 Who is using this

One boy, thirteen, usually on an iPhone, often standing next to a running printer, sometimes at 11pm. He is not going to read a tooltip. The panel is built around four assumptions:

1. **Phone first.** The desktop layout is the enhancement, not the base. Minimum touch target 48px. The primary action of every screen is reachable with a thumb.
2. **Nothing is permanent.** Delete means "goes to the trash for 30 days". Status changes get a 6 second undo toast. Prices have versions.
3. **Numbers are shown in shekels, always with the ₪ sign, always with two decimals when they are not round.** The database stores agorot; he never sees the word "agorot".
4. **Every error is a sentence, in Hebrew, that says what to do.** Never a code, never "invalid input".

### C.2 Visual language of the admin

The same palette, turned down. The toy store loudness belongs to the public site; the admin is the back room, and it stays calm so that the red button is unmistakable.

```css
/* src/app/admin/admin-theme.css, layered on the global @theme */
--admin-bg:        #FFF7EC;   /* cream, same ground as the site */
--admin-surface:   #FFFFFF;
--admin-line:      #EFE3D2;
--admin-line-strong:#E2D2BB;
--admin-ink:       #1A1420;
--admin-muted:     #6E6473;
--admin-red:       #F5333F;   /* one primary action per screen */
--admin-turquoise: #12BFB8;   /* links, toggles, focus ring, "saved" */
--admin-yellow:    #FFC531;   /* unsaved changes, warnings */
--admin-green:     #14A06A;   /* only for a completed order */
```

- Radius: cards `1.25rem` (20px), inputs `0.875rem` (14px), pills `999px`.
- Card shadow: `0 2px 0 0 var(--admin-line-strong)`, flat and printed looking, no blur haze.
- Focus ring: `outline: 3px solid var(--admin-turquoise); outline-offset: 2px`. Visible, always, no `:focus-visible` cleverness that hides it from a stylus.
- Type: Heebo via `next/font/google`, weights 400 / 700 / 900. Body `1rem` / `1.6`. Screen title `1.75rem` / 900. Numbers get `font-variant-numeric: tabular-nums` so a price does not jump while it recalculates.
- Motion: 160ms `cubic-bezier(0.2, 0.8, 0.2, 1)` on hover and press, 240ms on panel entry. Full stop under `prefers-reduced-motion`.
- Direction: `dir="rtl"` on `<html>`, sidebar on the right, back arrows point right, drag handles on the right edge of a row.

### C.3 Information architecture

```
src/app/admin/
  layout.tsx                          RTL wrapper, Heebo, admin-theme.css, Toaster
  login/page.tsx                      AdminLoginForm
  (protected)/
    layout.tsx                        auth gate + <AdminShell>
    page.tsx                          לוח בקרה              DashboardScreen
    leads/
      page.tsx                        פניות והזמנות        LeadsInboxScreen
      [id]/page.tsx                                        LeadDetailScreen
    drafts/
      page.tsx                        תצורות שנעזבו        AbandonedDraftsScreen
      [id]/page.tsx                                        DraftDetailScreen
    products/
      page.tsx                        מוצרים               ProductsListScreen
      new/page.tsx                                         ProductEditor (create)
      [id]/page.tsx                                        ProductEditor (edit)
    categories/page.tsx               קטגוריות             CategoriesScreen
    print-types/
      page.tsx                        סוגי הדפסה           PrintTypesListScreen
      [id]/page.tsx                                        PrintTypeEditor
    colors/page.tsx                   צבעי חוט             FilamentColorsScreen
    materials/page.tsx                חומרים               MaterialsScreen
    pricing/
      page.tsx                        מחירים               PricingControlPanel
      history/page.tsx                היסטוריית מחירים     PricingHistoryScreen
    home/page.tsx                     דף הבית              HomeContentEditor
    about/page.tsx                    הסיפור שלי           AboutStoryEditor
    gallery/page.tsx                  גלריה                GalleryManagerScreen
    faq/page.tsx                      שאלות ותשובות        FaqScreen
    messages/page.tsx                 הודעות               ContactMessagesScreen
    settings/
      page.tsx                        הגדרות               SettingsScreen
      admins/page.tsx                 מי מנהל את האתר      AdminUsersScreen
    trash/page.tsx                    פח                   TrashScreen
```

Sidebar order and labels, exactly as they appear:

```
לוח בקרה
פניות והזמנות        (badge: מספר פניות חדשות, red pill)
תצורות שנעזבו
הודעות               (badge: לא נקראו)
──
מוצרים
קטגוריות
גלריה
──
המחולל
  סוגי הדפסה
  צבעי חוט
  חומרים
מחירים               (badge: "לא פורסם", yellow pill, when draft ≠ live)
──
דף הבית
הסיפור שלי
שאלות ותשובות
──
הגדרות
פח
```

On a phone the sidebar collapses into a bottom tab bar with five items (לוח בקרה, פניות, מוצרים, מחירים, עוד) and "עוד" opens the full list as a sheet.

### C.4 Shared components

`src/components/admin/`:

| Component | Job |
|---|---|
| `AdminShell.tsx` | sidebar, top bar, mobile tab bar, toast host, unsaved-changes guard |
| `AdminSidebar.tsx` / `AdminMobileTabBar.tsx` | navigation with live badges from `dashboard.summary` |
| `PageHeader.tsx` | title, one line of help, primary action slot |
| `SaveBar.tsx` | sticky bottom bar. appears only when the form is dirty. "שמור" (red) + "בטל שינויים" |
| `EmptyState.tsx` | illustration slot, one sentence, one button |
| `DangerDialog.tsx` | destructive confirm, red button on the left in RTL so it is not the thumb default |
| `ConfirmTypeToName.tsx` | hard delete. the admin types the item name to enable the button |
| `UndoToast.tsx` | 6 second countdown ring, "בטל" |
| `MoneyInput.tsx` | ₪ prefix, shekels in, agorot out, blocks letters, min and max from the field spec |
| `PercentInput.tsx` | `%` suffix, basis points under the hood |
| `NumberStepper.tsx` | plus and minus buttons, because typing on a phone is worse |
| `HebrewField.tsx` | label, hint, error, character counter, RTL by default |
| `ImageDropzone.tsx` | drag, tap to pick, camera capture on mobile, client resize to 2000px, WebP q82, progress |
| `GlbUploader.tsx` | .glb only, magic-byte check, size guard, drei preview, triangle count |
| `SortableList.tsx` | dnd-kit sortable, drag handle on the right, keyboard reorder with the arrow keys |
| `ColorSwatchInput.tsx` | hex field + native colour picker + live swatch chip |
| `StatusPill.tsx` | lead and message statuses, fixed colour map |
| `PriceBreakdownTable.tsx` | the shared breakdown renderer, used in the lab, the lead detail and the draft detail |
| `ThreeDConfigViewer.tsx` | read-only r3f canvas that replays a draft's exact configuration |
| `ActivityFeed.tsx` | `adminActivity` rows, Hebrew relative time |
| `HelpNote.tsx` | one plain sentence in a turquoise-outlined box, used sparingly |

Third party: `dnd-kit` for reordering, `recharts` for the two small charts, `sonner` for toasts, `react-hook-form` + `zod` for forms with Hebrew messages, `@react-three/fiber` and `@react-three/drei` reused from the public generator.

### C.5 Dashboard, `/admin`

Top: greeting with his name and the date in Hebrew. `"בוקר טוב שי"` by hour, no exclamation marks, no emoji.

**Four number tiles**, two by two on a phone, in a row on desktop:

| Tile | Value | Tap goes to |
|---|---|---|
| פניות חדשות | `summary.newLeads` | `/admin/leads?status=new` |
| הזמנות בעבודה | `contacted + quoted + printing` | `/admin/leads?status=printing` |
| תצורות שנעזבו היום | `summary.abandonedToday` | `/admin/drafts` |
| הודעות שלא נקראו | `summary.messagesUnread` | `/admin/messages` |

A tile with the value 0 renders in muted ink with no badge, so a quiet day does not look like an alarm.

**Unpublished prices strip.** When `pricingConfig.draft.version !== live.version`, a yellow strip sits under the tiles: `"יש שינויי מחיר שעוד לא פורסמו"` with a button `"לפתוח את מסך המחירים"`. It cannot be dismissed. Prices sitting in draft forever is the single most likely way this site quietly stops making sense.

**Launch checklist**, only while at least one item is unchecked, driven by `dashboard.launchChecklist`:

```
5 דברים לפני שהאתר עולה
[v] מספר וואטסאפ מוגדר
[v] יש לפחות סוג הדפסה אחד פעיל
[ ] יש לפחות 6 צבעי חוט
[ ] מחיר בסיס גדול מאפס בכל סוג הדפסה
[ ] יש לפחות 3 מוצרים באתר
```

Each unchecked row is a link straight to the screen that fixes it. When all five pass, the block disappears and never returns.

**This week**, a small bar chart: drafts started against leads sent, seven days. Two colours, turquoise for drafts and red for leads. Beneath it one line of live text: `"השבוע 41 אנשים בנו משהו, 9 שלחו לך הודעה."`

**Newest 5 leads** as compact cards with the preview thumbnail, then a link `"כל הפניות"`.

**Empty state (fresh install).** No tiles, no chart. One card, centred: `"עוד לא קרה כלום. זה בסדר, האתר חדש."` plus two buttons: `"הוסף מוצר ראשון"` and `"פתח את מסך המחירים"`.

### C.6 Leads and orders inbox, `/admin/leads`

**List.** Filter chips across the top, horizontally scrollable on a phone, each with a count:
`הכל · חדש · דיברתי · נתתי הצעה · בהדפסה · הושלם · לא יצא · מוצמד`
Search field matches name, phone and note. Toggle `"כולל ארכיון"`.

Each row is a card, 96px tall, in this order right to left: the preview snapshot thumbnail (72px, rounded 12px, on cream), then name and phone, the print type and a row of colour dots, the price in bold tabular numerals, and the time as `"לפני 12 דקות"`. Status pill on the left edge. A long press (or a right click) opens the quick menu: change status, pin, archive, open WhatsApp.

Rows where `whatsappOpenedAt` is null after 20 minutes get a small turquoise dot and the label `"עוד לא פתח וואטסאפ"`, which is the highest value signal in the whole panel: that person built a thing, saw a price, and vanished at the last step.

**Detail, `/admin/leads/[id]`.** Single column on a phone, two columns from 1024px.

Right column (the story):
1. Name, phone as a `tel:` link, and a big red `"פתח וואטסאפ"` button that opens `whatsappUrl` with the stored message.
2. The customer photo, full width, tappable to full screen.
3. `ThreeDConfigViewer` replaying the configuration, with the preview snapshot as the poster image until the canvas is ready.
4. `configSnapshot` as a plain list: sort of print, size in millimetres, material, colours as named chips with their hex, quantity, extras, delivery.
5. The customer's note in a quoted block.

Left column (the work):
1. `PriceBreakdownTable`, every line from the breakdown, total in a red price tag identical in shape to the one the customer saw.
2. `"מחיר מתוקן"` field with a reason box. When set, the list and the dashboard show the corrected number with a small pencil icon and the original price stays visible underneath, struck through.
3. Status stepper: `חדש → דיברתי → נתתי הצעה → בהדפסה → הושלם`, plus a separate `"לא יצא"` with a reason field. Every change writes `statusHistory` and fires an undo toast.
4. `"תאריך יעד"` date picker. A lead past its due date shows a red date in the list.
5. Internal notes, autosaved with an 800ms debounce, with a quiet `"נשמר"` in turquoise.
6. `"הוסף לגלריה"` button, enabled only when `photoShareConsent` is true. Disabled it reads `"הלקוח לא אישר להציג את התמונה"`.

**Empty state.** `"אין פניות עדיין."` and under it, smaller: `"כשמישהו יבנה משהו במחולל וישלח לך הודעה, זה יופיע כאן."` One button: `"בדוק שהמחולל עובד"` which opens the public generator in a new tab.

### C.7 Abandoned configurations, `/admin/drafts`

This screen exists because the drafts table records every configuration built, including the ones that never became a message. It is the only honest picture of what people actually want.

**Sorting** defaults to "closest to finishing": `furthestStep` descending, then `updatedAt` descending. A person who reached the price screen and stopped is worth more attention than a person who uploaded a photo and left.

**Each card** shows: the uploaded photo thumbnail, the preview snapshot next to it, the step reached as `"הגיע לשלב 4 מתוך 6"` with a thin progress bar, the print type and colour dots, the computed price, `"לפני 3 שעות"`, and the phone number when one was typed before the drop off.

- With a phone: a red button `"שלח לו הודעה"` which opens WhatsApp with a short pre-filled Hebrew line built from the same message builder, in a softer variant: `"היי, ראיתי שהתחלת להרכיב משהו באתר. רוצה שאמשיך מאיפה שעצרת?"`
- Without a phone: no button, and one honest line under the card: `"אין דרך ליצור קשר. זה עדיין עוזר להבין איפה אנשים נתקעים."`

**Funnel bar** at the top of the screen, from `drafts.funnel({ days: 30 })`, six horizontal bars with counts and the drop percentage between steps. The step with the largest drop is drawn in red, everything else in turquoise. Under it one live sentence: `"הכי הרבה אנשים עוזבים בשלב בחירת הצבעים."`

**Detail, `/admin/drafts/[id]`** is the lead detail without the customer block: photo, 3D viewer, config, price breakdown, timeline of `createdAt` to `lastSeenAt`, device and referrer. One button, `"מחק תצורה"`, which deletes the row and its files immediately (this is the one place a hard delete is fine, because nothing here is a customer record).

**Empty state.** `"אף אחד לא בנה כלום ב-30 הימים האחרונים."` with a link to the generator.

### C.8 Products, `/admin/products`

**List.** Grid of cards on desktop, list on a phone. Each card: hero image, title, price, category, status pill (`פעיל` / `מוסתר`), drag handle for ordering. Filter by category, toggle `"כולל מוסתרים"`. Primary action: `"מוצר חדש"`.

**Editor, `ProductEditor`.** One page, sections separated by cards, explicit save with `SaveBar`. Sections in order:

1. **בסיס.** `titleHe` (required, 2 to 60 characters), `subtitleHe`, slug. The slug field is collapsed under `"כתובת באתר"` and auto-generated by transliterating the Hebrew title into a latin slug; editing it after publish shows a warning `"שינוי הכתובת ישבור קישורים ישנים"`.
2. **תיאור.** Markdown textarea with a live preview tab. Toolbar has bold, list and a link only. No rich text editor; a thirteen year old writing three lines does not need a document engine, and markdown survives a database migration.
3. **תמונות.** `ImageDropzone` multi upload, thumbnails in a `SortableList`, a star icon to set the hero. Client side resize to 2000px on the long edge and WebP quality 82 before upload, which is the same compression the site's generated assets use. Minimum one image before a product can be set active.
4. **מודל תלת מימד.** `GlbUploader`. `.glb` only, hard limit 25MB, warning over 8MB with the text `"קובץ כבד. באינטרנט של הטלפון זה ייטען לאט."` After upload the panel renders the model in a small drei canvas with orbit controls and shows the triangle count and bounding box. A `"קבע זווית התחלה"` button captures the current camera position into `cameraPreset`, which is far easier than typing three numbers.
5. **מחיר.** Radio: `מחיר קבוע` / `מתחיל מ-` / `לפי הצעה`. The money field hides for `לפי הצעה`.
6. **קישור למחולל.** Optional `printTypeId` picker with the line `"כפתור המוצר יפתח את המחולל עם הסוג הזה כבר נבחר."`
7. **מיון ותצוגה.** Featured toggle, badge text with a colour choice from the palette, active toggle.
8. **SEO.** Collapsed by default. Title, description, OG image, with a Google-style preview.

**Delete.** `"מחק מוצר"` at the bottom, outlined in red rather than filled, opening `DangerDialog`: `"למחוק את «מחזיק מפתחות לב»? אפשר לשחזר מהפח במשך 30 יום."` Buttons `"מחק"` and `"ביטול"`.

**Empty state.** `"עוד אין מוצרים."` / `"כל מוצר שתוסיף יופיע בקטלוג ובדף הבית."` / button `"מוצר חדש"`.

### C.9 Print types, `/admin/print-types`

The catalogue of what the generator can make, and the place where the base price of everything lives.

**List** shows each type with its icon, name, base price, number of active sizes, max colours, and a status toggle. Reorder by drag, because the order here is the order of the tiles in the generator's step 2.

**Editor, `PrintTypeEditor`.** Sections:

1. **פרטים.** `nameHe`, `shortHe` (one line, max 60 characters, this is the tile subtitle), `descriptionHe`, icon image, sample image, accent colour from the palette.
2. **מחיר בסיס.** One `MoneyInput` with the range guard 5 to 5,000 shekels, and directly under it a live line: `"בגודל בינוני, חומר רגיל, צבע אחד, יחידה אחת: 68 ₪"` computed with `pricing.previewQuote` against the unsaved value. He changes the base price and sees a real price move as he types.
3. **גדלים.** A `SortableList` of size rows, each with `labelHe`, width, height, depth in millimetres, and a multiplier. Next to the multiplier, the resulting price is printed live. A `"הוסף גודל"` button appends a row prefilled from the previous one. Removing a size that is referenced by an open lead is allowed (the lead has its own snapshot) but shows the note `"יש 3 פניות פתוחות עם הגודל הזה."`
4. **צבעים וחומרים.** `maxColors` stepper 1 to 8. Material checkboxes filling `allowedMaterialIds`, with at least one required.
5. **תצוגת תלת מימד.** `previewGeometry` picker as six labelled thumbnails, `displacementScale` slider 0.02 to 0.6 with a live r3f preview using a stock sample photo, `invertHeight` toggle labelled `"הפוך גובה (לליתופן)"`, `planeSegments` as three choices (128 / 256 / 512) labelled `"טוב" / "יפה" / "הכי חלק"` with the note `"יותר חלק, יותר כבד לטלפון."`, `backlitPreview` toggle.
6. **תצוגה בגנרטור.** Active toggle, sort order.

Explicit save. Every save writes an `adminActivity` row with a Hebrew summary of what moved.

### C.10 Filament colours, `/admin/colors`

The screen he will open most often, because spools run out.

**Layout.** A grid of swatch tiles, 4 across on a phone, 8 on desktop. Each tile: the colour as a filled rounded square 64px, the Hebrew name under it, and a stock dot in the corner (turquoise for `in`, yellow for `low`, muted with a diagonal line for `out`). Tapping a tile opens the edit sheet; the drag handle is the tile itself in reorder mode.

**Reorder.** A `"סדר מחדש"` toggle turns the grid into a dnd-kit sortable surface. Order matters, because this is the palette order in the generator and the first six colours are what most people pick. Reordering calls `filamentColors.reorder({ id, beforeId, afterId })` and the server writes a **fractional index**: the new `sortOrder` is the midpoint of its neighbours, so one drag writes one row instead of renumbering the whole list. When two neighbours get closer than `1e-6`, the mutation renormalises that list to whole numbers in the same transaction, and the weekly cron does the same as a safety net.

**Edit sheet.** `nameHe`, `hex` with `ColorSwatchInput`, `familyHe` as a picker (`אדומים · כחולים · ירוקים · צהובים · לבנים ושחורים · מיוחדים`), three toggles (`מטאלי`, `זוהר בחושך`, `שקוף`), `extraCostAgorot` labelled `"תוספת מחיר לגליל הזה"` with the hint `"רוב הצבעים 0"`, stock as three big buttons (`יש · נגמר כמעט · אזל`), swatch photo upload.

**Bulk stock.** A `"סימון מהיר"` mode where each tap on a tile cycles its stock state, with a single save at the end. This is what he uses after a printing session.

**Contrast warning.** When a hex sits within a small distance of `#FFF7EC` (the site ground) the sheet shows a yellow note: `"הצבע הזה כמעט נעלם על רקע האתר. הוא יוצג עם מסגרת."` Not blocking. White filament is real.

**Empty state.** `"אין צבעים. המחולל לא יעבוד בלי לפחות אחד."` with a button `"הוסף 8 צבעים נפוצים"` that seeds a starter palette he can then rename.

### C.11 Materials, `/admin/materials`

Small table screen. Each row: name, multiplier, flat addition, a rendered sphere preview using the three.js hints, active toggle. The editor exposes `priceMultiplier` as a percentage field labelled `"תוספת מחיר"` (`1.25` shows as `25%`), because "multiplier" means nothing to him and a percentage does. Emissive controls appear only when the material key is `glow`, under the heading `"זוהר בחושך"`, with a dark preview background so he can actually see the effect.

### C.12 THE PRICING CONTROL PANEL, `/admin/pricing`

The most important screen in the project. It has to let a thirteen year old change what he earns per print, see the consequence before it is real, and make it impossible to publish something absurd.

#### Structure

Two columns from 1024px: controls on the right (RTL reading order), the **מעבדת מחיר** locked to the left as a sticky panel. On a phone the lab becomes a bottom sheet, collapsed to a single bar that always shows one number and expands on tap:

```
דוגמה: ליתופן בינוני   68 ₪  →  74 ₪   +9%      ▲
```

Top of the screen, always visible:

- Version line: `"גרסה 12, פורסמה לפני 4 ימים"` with a link to היסטוריית מחירים.
- When draft differs from live, a yellow bar: `"יש שינויים שלא פורסמו"` plus `"פרסם"` (red) and `"בטל שינויים"` (outlined).

#### Control sections

1. **מחיר בסיס לכל סוג הדפסה.** A compact table of the print types with an inline `MoneyInput` each, so he does not have to open six editors to compare six numbers. Editing here writes the same field as the print type editor.
2. **גדלים.** Read-only summary per type with a link into the type editor, to avoid two screens that both own the same numbers.
3. **חומרים.** Same treatment: inline percentage and flat addition per material.
4. **צבעים.** `freeColorCount` stepper (labelled `"כמה צבעים כלולים במחיר"`) and `extraColorAgorot` (`"מחיר לכל צבע נוסף"`). A live sentence underneath: `"מי שיבחר 6 צבעים ישלם 14 ₪ יותר."`
5. **כמויות והנחות.** The tier ladder as an editable table: `"מ-3 יחידות"` / `10%`. Add, remove and edit inline, saved together through `discountTiers.replaceAll`. Under the table, a **quantity curve**: a small line chart of the unit price for quantities 1 to 50 using the current sample. An inverted tier (ordering more costs more) shows as an upward kink and is caught by a guard before it can be saved.
6. **דחוף.** `rushEnabled` toggle, `rushPercentBp`, and the label the customer sees.
7. **משלוח ואיסוף.** `pickupEnabled`, pickup label, `shippingFlatAgorot`, `freeShippingThresholdAgorot`. Live line: `"מעל 180 ₪ המשלוח חינם."`
8. **עיגול ומינימום.** `roundToAgorot` as six buttons (`1 אגורה · 10 אגורות · 50 אגורות · 1 ₪ · 5 ₪ · 10 ₪`), `roundingMode` as two buttons (`מעגל למעלה` / `מעגל לקרוב`), `charmEnding` toggle labelled `"לסיים ב-90 אגורות"`, `minOrderAgorot` labelled `"הזמנה מינימלית"`.
9. **תוספות.** The `surchargeRules` list with a drag handle, each showing its label and what it adds. The add form picks a trigger kind first, then shows only the fields that kind needs.
10. **טקסט מתחת למחיר.** `priceDisclaimerHe`, a single line the customer reads under the price tag. Character counter at 90.

Everything on this screen writes to the **draft** channel through `pricing.updateDraft`. The live site does not move until he presses פרסם.

#### מעבדת מחיר (the live calculator)

The panel that makes this screen safe.

**Sample selector** across its top, as pill buttons: three saved samples from `pricingSamples`, plus a fourth generated live, `"התצורה האחרונה שמישהו בנה"`, from `pricing.lastRealConfig`. That fourth pill is the one that convinces him, because it is a real person's choice from an hour ago.

**The comparison table.** Two columns, `עכשיו באתר` and `אחרי השינוי`, one row per breakdown line, computed by calling `pricing.previewQuote` with the unsaved form values as `overrides`:

```
                       עכשיו באתר    אחרי השינוי
מחיר בסיס                 45.00        52.00
גודל (בינוני ×1.6)         72.00        83.20
חומר (מט +15%)            82.80        95.68
צבעים (2, כלולים)          0.00         0.00
סה"כ ליחידה               83.00        96.00
כמות ×2                  166.00       192.00
הנחת כמות (10%)          -16.60       -19.20
משלוח                     25.00         0.00      חינם מעל 180 ₪
──────────────────────────────────────────────
סה"כ                     174.40       172.80
                                       -1%
```

The delta chip is turquoise when the price drops, red when it rises, and both are neutral facts rather than warnings. Under the table, a six bar chart of all `SAMPLE_INPUTS` before and after, so a change that helps one configuration and destroys another is visible in one glance.

**Nothing in the lab writes anything.** `pricing.previewQuote` is a query. He can drag every slider on the screen and the site does not change.

#### Guards

Two tiers. Hard errors block the save. Soft warnings need one extra tap.

**Hard errors** (`assertConfigSane` returns them, `pricing.updateDraft` throws, the field turns red and `SaveBar` is disabled with the reason printed next to it):

| Rule | Hebrew message |
|---|---|
| `basePriceAgorot < 500` | `"מחיר בסיס חייב להיות לפחות 5 ₪"` |
| `basePriceAgorot > 500000` | `"מחיר בסיס עד 5,000 ₪"` |
| `size.multiplier` outside `0.2 .. 10` | `"מכפיל גודל חייב להיות בין 0.2 ל-10"` |
| `material.priceMultiplier` outside `0.5 .. 3` | `"תוספת חומר חייבת להיות בין -50% ל-200%"` |
| any `discountBp > 4000` | `"הנחה מקסימלית 40%"` |
| tiers not strictly increasing by `minQty` | `"כל מדרגה חייבת להתחיל בכמות גדולה יותר"` |
| tier discount decreasing as quantity rises | `"הנחה לא יכולה לרדת כשהכמות עולה"` |
| `minOrderAgorot < 1000` | `"הזמנה מינימלית לפחות 10 ₪"` |
| `roundToAgorot` not in the allowed set | `"בחר אחת מאפשרויות העיגול"` |
| `rushPercentBp > 10000` | `"תוספת דחוף עד 100%"` |
| `freeShippingThresholdAgorot < shippingFlatAgorot` | `"סף משלוח חינם חייב להיות גבוה ממחיר המשלוח"` |
| `extraColorAgorot > 20000` | `"תוספת לצבע עד 200 ₪"` |
| any sample total `< minOrderAgorot` | `"עם ההגדרות האלה הדוגמה «X» יוצאת מתחת למינימום"` |
| any sample total `> maxPlausibleTotalAgorot` (default 3,000 ₪) | `"עם ההגדרות האלה הדוגמה «X» יוצאת 4,120 ₪. משהו כאן לא נכון."` |
| any sample total `<= 0` | `"עם ההגדרות האלה יש הזמנה שיוצאת בחינם"` |

**Soft warnings** (yellow, save allowed after a confirm dialog):

| Rule | Hebrew message |
|---|---|
| a sample moves more than ±40% | `"הדוגמה «ליתופן בינוני» עולה מ-68 ₪ ל-119 ₪. זה קפיצה של 75%. להמשיך?"` |
| every sample drops more than 25% | `"כל המחירים יורדים בהרבה. בדוק שזה מה שרצית."` |
| `freeColorCount >= maxColors` on every type | `"אף אחד לא ישלם על צבעים נוספים בהגדרה הזאת."` |
| `rushPercentBp === 0` while `rushEnabled` | `"דחוף מופעל אבל לא מוסיף כלום."` |

The confirm dialog for a soft warning quotes the exact numbers. It never says "are you sure", it says what changes.

#### Publishing

`"פרסם"` opens a full screen review, not a dialog:

1. A list of every field that changed, in Hebrew, old value on the right and new on the left.
2. The six sample comparison table.
3. An optional note field, `"מה שינית ולמה"`, stored in `pricingVersions.noteHe`.
4. A red `"פרסם עכשיו"` button, owner only. An editor sees the same screen with the button disabled and the line `"רק בעל האתר יכול לפרסם מחירים."`

After publishing: a 6 second `UndoToast` with `"פורסם. אפשר לבטל"`, which calls `pricing.rollback` on the previous version and republishes. Past that window, `/admin/pricing/history` lists every version with its note, its author, its timestamp and a `"חזור לגרסה הזאת"` button that loads the snapshot into the draft channel and hands him back to the review screen. Rollback never skips the review step.

**Empty state.** On a fresh deployment the screen shows the seeded defaults with a `HelpNote`: `"אלה מחירי התחלה. שנה אותם למה שמתאים לך, בדוק במעבדה מימין, ואז פרסם."`

### C.13 Home content editor, `/admin/home`

A vertical list of the eight sections, each as a collapsed card with its kind icon, headline preview, an enable toggle and a drag handle. Expanding a card reveals only the fields that kind uses, from a mapping table in `src/components/admin/homeSectionFields.ts`.

The hero card gets special treatment, because it carries the site's central device:

- `headlineHe` field, and beneath it `headlineAccentWord` with the label `"המילה שתקבל הדגשה אדומה"`. A live preview renders the headline in the real display type with the red marker box drawn behind that one word. If the word does not appear in the headline, the field turns yellow with `"המילה הזאת לא נמצאת בכותרת"`.
- The hero image uses `ImageDropzone` with a 4:5 crop guide and the note `"תמונה של הדפסה אמיתית, על רקע נקי."`

Explicit save per card, with `SaveBar` appearing at the bottom of the expanded card only. A `"תצוגה מקדימה"` button opens the public home page in a new tab with `?preview=1`, which reads unsaved values from `sessionStorage`.

### C.14 Story editor, `/admin/about`

The most sensitive screen in the panel, because the text is his own life. It is built to make editing easy and deleting hard.

A `SortableList` of sections. Each row shows the kind, the first 60 characters, an accent chip and a drag handle. The editor for each kind exposes exactly what it needs: `paragraph` gets a textarea, `pullQuote` gets a single line with a live preview in the display face, `timelineItem` gets `labelHe` plus body, `imageFull` gets an upload with alt text, `statement` gets one sentence with a character counter at 80.

Two specific behaviours:

- **The two spine phrases are pinned.** `הופך רעיונות לדברים אמיתיים` and `לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם` live in dedicated sections marked `pinned` in the UI (no schema field needed; they are simply the `opener` and the last `statement`). They can be edited but not deleted, and the delete button on those two rows is replaced with the text `"המשפט הזה הוא הבסיס של האתר."`
- **Alt text is required** on every image before the section can be set active, message: `"כתוב מה רואים בתמונה. זה מה שקורא המסך יקריא."`

Explicit save. Deleting a section is a soft delete with the standard dialog.

### C.15 Gallery, `/admin/gallery`

Masonry grid of the items with drag reorder, a star for featured, an active toggle, and a filter by tag. Upload accepts multiple files at once, resizes client side and writes `width`, `height` and a `blurDataUrl` so the public grid never jumps while loading.

The valuable path is `"הוסף מהפניות"`: a drawer listing every lead where `photoShareConsent` is true and no gallery item exists yet, each with the customer photo and the preview snapshot. One tap adds it with the print type as the default title. Leads without consent are not listed at all, so the rule cannot be broken by accident.

**Empty state.** `"הגלריה ריקה."` / `"אפשר להעלות תמונות, או להוסיף מתוך פניות של לקוחות שאישרו."`

### C.16 Contact messages, `/admin/messages`

A simple list with `חדש · נקרא · עניתי · ספאם` filters. Opening a message marks it `read` after 1.5 seconds on screen. Each message has a `tel:` link, a `"פתח וואטסאפ"` button, an internal note field and `"הפוך לפנייה"` which creates a `leads` row with `source: "manual"` so a phone conversation lands in the same pipeline as everything else.

Spam handling is a single button that sets the status; nothing is deleted.

### C.17 Settings, `/admin/settings`

Grouped cards, explicit save per card so a wrong tap in one group cannot ruin another.

1. **פרטי העסק.** Business name, tagline, contact email, Instagram, TikTok.
2. **וואטסאפ.** The number in a masked field showing `+972 58-584-5083`, owner only, with a `DangerDialog` on change: `"שינוי המספר ישלח את כל הפניות החדשות למספר אחר."` Below it, the greeting template with `{{name}}`, `{{printType}}`, `{{price}}` chips he can tap to insert, a live preview of the full generated message with sample values, and a `"שלח לעצמי בדיקה"` button that opens WhatsApp with the rendered preview.
3. **זמני אספקה.** `turnaroundDaysMin` and `turnaroundDaysMax` steppers, pickup city.
4. **רצועת הודעה.** The black announcement bar: enable, text (max 70 characters), optional link. Live preview at full width.
5. **תמונת שיתוף.** OG image with a preview of how the link looks in WhatsApp.
6. **מצב תחזוקה.** A toggle that replaces the public site with a single Hebrew card. Turning it on requires typing the word `סגור`, because this one takes the whole shop offline.
7. **מי מנהל את האתר** (link to `/admin/settings/admins`, owner only): the admin list, invites with an expiry countdown, disable and enable, and the rule `"חייב להישאר לפחות בעל אתר אחד פעיל"` enforced in the mutation with the message `"אי אפשר לכבות את המנהל האחרון"`.

### C.18 Trash, `/admin/trash`

Grouped by table, each row showing what it was, who deleted it, when, and how many days remain before it is gone. Two buttons per row: `"שחזר"` and, owner only, `"מחק לתמיד"` behind `ConfirmTypeToName`. A header line reads `"פריטים נמחקים לצמיתות אחרי 30 יום."`

### C.19 Save behaviour, decided once

| Data | Pattern | Reason |
|---|---|---|
| Prices, print types, materials, colours | **Explicit save** with `SaveBar` and a leave guard | Money |
| Products, home, about, gallery, FAQ, settings | **Explicit save** per screen or per card | Public text |
| Lead status, pin, archive | **Instant** with a 6 second undo toast | One tap actions during a phone call |
| Internal notes on a lead or a message | **Autosave**, 800ms debounce, quiet `"נשמר"` | Nobody should lose a note by navigating away |
| Stock state of a colour in bulk mode | **Batched**, one save at the end | He is tapping fast next to a printer |
| Reordering anything | **Instant** on drop, undo toast | The order is visible; a mistake is obvious and cheap |

The leave guard is a single `useUnsavedChanges` hook used by every explicit-save screen. It intercepts navigation and browser close with the dialog: `"יש שינויים שלא נשמרו. לצאת בלי לשמור?"` and buttons `"צא בלי לשמור"` / `"חזור לעריכה"`.

### C.20 Destructive actions, decided once

| Level | Pattern | Used for |
|---|---|---|
| 1 | Instant with undo toast | status changes, reordering, hiding an item |
| 2 | `DangerDialog`, one red button | soft delete of anything |
| 3 | `ConfirmTypeToName`, type the exact name | hard delete from the trash, removing an admin, changing the WhatsApp number |
| 4 | Type a fixed word (`סגור`) | maintenance mode |

`DangerDialog` places the destructive button on the **left** in RTL and the safe option on the right, under the thumb. Both buttons are the same size. No dialog uses the word "אזהרה" as a title; the title is the question itself.

### C.21 Hebrew validation messages

Centralised in `src/lib/admin/messages.ts` so the same failure never has two wordings.

```ts
export const V = {
  required:        "צריך למלא את השדה הזה",
  tooShort:  (n: number) => `לפחות ${n} תווים`,
  tooLong:   (n: number) => `עד ${n} תווים`,
  numberOnly:      "רק מספרים",
  positive:        "המספר חייב להיות גדול מאפס",
  rangeIls: (a: string, b: string) => `בין ${a} ל-${b}`,
  phoneIl:         "מספר טלפון לא תקין. לדוגמה 0585845083",
  emailBad:        "כתובת מייל לא תקינה",
  hexBad:          "צבע לא תקין. צריך להיראות כך: #F5333F",
  slugTaken:       "הכתובת הזאת כבר תפוסה",
  slugBad:         "רק אותיות באנגלית, מספרים ומקפים",
  imageTooBig:     "התמונה גדולה מדי. עד 10MB",
  imageBadType:    "אפשר להעלות JPG, PNG או WebP",
  glbBadType:      "רק קובץ GLB",
  glbTooBig:       "הקובץ גדול מדי. עד 25MB",
  glbHeavy:        "קובץ כבד. באינטרנט של הטלפון זה ייטען לאט",
  needOneImage:    "צריך לפחות תמונה אחת לפני שמפרסמים מוצר",
  needOneMaterial: "צריך לבחור לפחות חומר אחד",
  needOneSize:     "צריך לפחות גודל אחד פעיל",
  altRequired:     "כתוב מה רואים בתמונה. זה מה שקורא המסך יקריא",
  lastOwner:       "אי אפשר לכבות את המנהל האחרון",
  noConsent:       "הלקוח לא אישר להציג את התמונה",
  offline:         "אין חיבור. השינוי יישמר כשהחיבור יחזור",
  saveFailed:      "השמירה נכשלה. נסה שוב",
  saved:           "נשמר",
} as const;
```

Rules the copy follows: the message says what to do, never what went wrong in English, never an error code, and never an exclamation mark. Field errors sit under the field in `--admin-red` at `0.875rem`. Screen level failures are a toast, not a banner, except for the pricing guards, which are a banner because they block a save.

### C.22 Empty states, one table

| Screen | Line | Action |
|---|---|---|
| Dashboard, fresh | `"עוד לא קרה כלום. זה בסדר, האתר חדש."` | `"הוסף מוצר ראשון"` |
| Leads | `"אין פניות עדיין."` | `"בדוק שהמחולל עובד"` |
| Drafts | `"אף אחד לא בנה כלום ב-30 הימים האחרונים."` | `"פתח את המחולל"` |
| Products | `"עוד אין מוצרים."` | `"מוצר חדש"` |
| Print types | `"אין סוגי הדפסה. המחולל לא יעבוד בלי לפחות אחד."` | `"הוסף סוג הדפסה"` |
| Colours | `"אין צבעים."` | `"הוסף 8 צבעים נפוצים"` |
| Gallery | `"הגלריה ריקה."` | `"העלה תמונות"` |
| Messages | `"אין הודעות."` | link to the contact page |
| Trash | `"הפח ריק."` | none |
| Search with no result | `"לא מצאתי כלום עם «X»."` | `"נקה חיפוש"` |

Each empty state renders one flat illustration: a single line-art shape in turquoise on cream, no photography, no stock art, no emoji.

### C.23 Accessibility and phone realities

- Every interactive element reaches 48×48px. Colour swatch tiles are 64px.
- Contrast: `--admin-ink` on `--admin-surface` is 14.8:1. `--admin-red` on white is 4.1:1, which is why red is never used for body text, only for fills, borders and large bold numbers at 24px and above.
- Every icon-only button carries `aria-label` in Hebrew.
- The sortable lists support keyboard reordering through dnd-kit's keyboard sensor, announced in Hebrew with `aria-live`.
- The r3f canvases in the admin get `frameloop="demand"` and pause when off screen, because he opens lead cards on cellular data.
- Number inputs use `inputMode="decimal"` so the phone keyboard opens on digits.
- Offline: writes are queued by the Convex client and a persistent bar reads `"אין חיבור. השינויים יישמרו כשהחיבור יחזור."`

### C.24 Seed data, `convex/seed.ts`

An `internalMutation` run once with `npx convex run seed:run`, safe to re-run (it no-ops when `printTypes` is non-empty). It creates:

- `siteSettings` with the real WhatsApp number `972585845083`, the tagline `הופך רעיונות לדברים אמיתיים`, turnaround 3 to 7 days.
- 7 print types with sensible base prices, 3 sizes each, and the r3f hints filled per the 3D spec.
- 4 materials: `רגיל`, `מט`, `משי`, `זוהר בחושך`.
- 12 filament colours including the four palette colours by name.
- Both `pricingConfig` rows at version 1, identical, `freeColorCount: 4`, `extraColorAgorot: 700`, `minOrderAgorot: 3500`, `roundToAgorot: 100`, `roundingMode: "up"`, `charmEnding: true`.
- 3 quantity tiers: 3 units 10%, 5 units 15%, 10 units 22%.
- 3 `pricingSamples`.
- 8 `homeSections` and 9 `aboutSections` carrying the story text from the film, first person, unedited.

### C.25 Build order

1. `schema.ts`, `auth.ts`, `lib/authz.ts`, `lib/priceEngine.ts` with its golden tests. Nothing renders yet and this is still the day that decides whether the project works.
2. `src/proxy.ts`, `/admin/login`, `(protected)/layout.tsx`, `admins.me`. Verify that `/admin` redirects while signed out, from a private window.
3. Print types, materials, colours, pricing config, plus `pricing.publicConfig` and `pricing.quote`. The generator has nothing to price without these.
4. The pricing control panel with the lab and the guards.
5. Drafts and leads, both public mutations and both admin inboxes.
6. Products, images, `.glb` upload.
7. Home, about, gallery, FAQ, messages, settings, trash.
8. Crons, seed, activity log.

### C.26 Open items for the build

- `blurDataUrl` generation runs client side with a 4×4 canvas downscale before upload. If that proves slow on an old phone, move it to a Convex action with `sharp` in a Node runtime file.
- Lead notifications are out of scope here. When Shai asks for them, the cheapest honest path is a Convex `action` posting to a WhatsApp Business template, and it belongs behind a settings toggle rather than being always on.
- `pricingVersions.snapshot` is `v.any()`. If it grows past 1MB, move the snapshot into `_storage` and keep the storage id in the row.
