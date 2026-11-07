import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/* ==================================================================== *
 * 06 §A.1 owns this file. 03 / 04 / 05 are consumers of it.
 *
 * Conventions, from 06 §0:
 *   money          integer agorot. 1250 === 12.50 ש״ח. never a float shekel
 *   bp             basis points 0..10000. 1500 === 15%
 *   timestamps     Date.now() milliseconds UTC, written by the mutation
 *   soft delete    deletedAt on anything a visitor could have seen
 *   sortOrder      fractional index, so one drag rewrites one row
 *   *He suffix     every string a human reads is Hebrew
 * ==================================================================== */

/** integer agorot. 1250 === 12.50 ILS */
export const money = v.number();
/** basis points, 0..10000. 1500 === 15% */
export const bp = v.number();

/** accent colour role, from the locked palette */
export const accent = v.union(
  v.literal("red"),
  v.literal("turquoise"),
  v.literal("yellow"),
  v.literal("ink"),
  v.literal("none"),
);

/** stock state of a filament spool */
export const stock = v.union(v.literal("in"), v.literal("low"), v.literal("out"));

/**
 * RESOLUTIONS §6. The seven keys are locked, because 08 §6 resolves the tile
 * artwork as `/assets/print-types/${key}.webp` with no lookup table. A key that
 * drifts is a 404 on the flagship screen.
 */
export const printTypeKey = v.union(
  v.literal("lithophane"),
  v.literal("relief"),
  v.literal("glow"),
  v.literal("standee"),
  v.literal("keychain"),
  v.literal("magnet"),
  v.literal("framed"),
);

export const deliveryMethod = v.union(v.literal("pickup"), v.literal("shipping"));

/**
 * The filament finishes the engine knows about (priceEngine.types `FinishKey`).
 * The finish surcharge is taken as a MAX across everything selected, never a sum:
 * three glow spools still mean one expensive material, loaded once.
 */
export const finishKey = v.union(
  v.literal("matte"),
  v.literal("glossy"),
  v.literal("silk"),
  v.literal("glow"),
  v.literal("wood"),
  v.literal("transparent"),
);

/**
 * One selectable size inside a print type.
 *
 * `multiplier` is the LINEAR SCALE FACTOR against the print type's reference
 * size (0.8 / 1.0 / 1.3), not a price multiplier. The engine turns it into grams
 * and hours through `volumeExponent`, so the size and the cost are the same
 * number computed once.
 */
export const sizeOption = v.object({
  key: v.string(),                 // unique inside the print type
  labelHe: v.string(),             // "קטן 10 ס״מ"
  widthMm: v.number(),
  heightMm: v.number(),
  depthMm: v.number(),
  /** linear scale against the reference size. 0.2 .. 10 */
  multiplier: v.number(),
  /** feeds the autoOversize surcharge trigger */
  longestEdgeMm: v.optional(v.number()),
  estimatedGrams: v.number(),      // informational, shown to Shai only
  estimatedMinutes: v.number(),    // informational, shown to Shai only
  /** when Shai sliced this exact size, his number wins over the formula */
  gramsOverride: v.optional(v.number()),
  hoursOverride: v.optional(v.number()),
  sortOrder: v.number(),
  active: v.boolean(),
});

/** one row of the expandable breakdown the visitor can open */
export const priceLine = v.object({
  key: v.union(
    v.literal("unit"),
    v.literal("colors"),
    v.literal("finish"),
    v.literal("addon"),
    v.literal("qtyDiscount"),
    v.literal("setup"),
    v.literal("rush"),
    v.literal("delivery"),
    v.literal("minOrder"),
    v.literal("rounding"),
  ),
  id: v.optional(v.string()),      // rule id, on `addon` rows
  labelHe: v.string(),
  hintHe: v.optional(v.string()),
  amountAgorot: money,             // exact and signed
  displayAgorot: money,            // the same row rounded to whole shekels
});

/**
 * The full, auditable arithmetic behind one price. Written by the server only.
 *
 * This object mirrors `PriceBreakdown` in convex/lib/priceEngine.types.ts field
 * for field, on purpose. The engine is the only producer of a price, so storing
 * a reshaped copy would mean a mapping layer that can silently drop a row, and
 * the whole point of the breakdown is that Shai and the customer read the same
 * arithmetic. Ids inside are plain strings because the engine has no `Id<>`.
 */
export const priceBreakdown = v.object({
  /* --- the contract the UI reads --- */
  unitAgorot: money,
  lines: v.array(priceLine),
  subtotalAgorot: money,
  roundingAgorot: money,           // signed
  totalAgorot: money,
  grams: v.number(),
  hours: v.number(),
  configVersion: v.number(),

  /* --- the audit trail --- */
  currency: v.literal("ILS"),
  printTypeKey: v.string(),
  printTypeNameHe: v.string(),
  basePriceAgorot: money,
  sizeKey: v.string(),
  sizeMultiplier: v.number(),
  materialKey: v.string(),
  materialMultiplier: v.number(),
  materialFlatAgorot: money,
  billedGrams: v.number(),
  materialCostAgorot: money,
  machineCostAgorot: money,
  variableAgorot: money,
  complexity: v.number(),
  unitCoreAgorot: money,
  unitBaseAgorot: money,
  colorCount: v.number(),
  freeColorCount: v.number(),
  extraColorsAgorot: money,
  colorPremiumAgorot: money,
  finishKey: v.union(finishKey, v.null()),
  finishAgorot: money,
  addons: v.array(
    v.object({
      ruleId: v.string(),
      labelHe: v.string(),
      amountAgorot: money,
    }),
  ),
  quantity: v.number(),
  lineTotalAgorot: money,
  discountTierId: v.union(v.string(), v.null()),
  discountBp: bp,
  discountAgorot: money,
  setupFeeAgorot: money,
  rushApplied: v.boolean(),
  rushAgorot: money,
  deliveryMethod: deliveryMethod,
  shippingAgorot: money,
  minOrderBumpAgorot: money,       // signed
});

/** denormalised human labels, frozen at the moment a lead is created */
export const configSnapshot = v.object({
  printTypeLabelHe: v.string(),
  materialLabelHe: v.string(),
  sizeLabelHe: v.string(),
  sizeMm: v.string(),                        // "120 × 80 × 3 מ״מ"
  colors: v.array(v.object({ nameHe: v.string(), hex: v.string() })),
  quantity: v.number(),
  addonLabelsHe: v.array(v.string()),
  deliveryLabelHe: v.string(),
  neededByHe: v.optional(v.string()),
  noteHe: v.optional(v.string()),
});

export const leadStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("quoted"),
  v.literal("printing"),
  v.literal("done"),
  v.literal("lost"),
);

export const contactStatus = v.union(
  v.literal("new"),
  v.literal("read"),
  v.literal("replied"),
  v.literal("spam"),
);

export const draftStatus = v.union(
  v.literal("building"),
  v.literal("previewed"),
  v.literal("submitted"),
  v.literal("abandoned"),
);

/* ==================================================================== */

export default defineSchema({
  /* ---------- auth ---------- */
  // users, authAccounts, authSessions, authRefreshTokens,
  // authVerificationCodes, authRateLimits
  ...authTables,

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
    adminId: v.optional(v.id("admins")),   // absent for cron jobs
    actorLabelHe: v.string(),              // "שי" | "המערכת"
    action: v.string(),                    // "pricing.publish" | "products.softDelete"
    tableName: v.string(),
    docId: v.optional(v.string()),
    summaryHe: v.string(),
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

    /** RESOLUTIONS §7. The site promises 3 working days everywhere */
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
    /** RESOLUTIONS §6, locked to seven values */
    key: printTypeKey,
    nameHe: v.string(),
    shortHe: v.string(),                      // one line under the tile in the generator
    descriptionHe: v.string(),
    basePriceAgorot: money,

    /**
     * RESOLUTIONS §8. `מתחיל מ-{n} ש״ח` reads THIS, never basePriceAgorot.
     * Written server side by running the real engine on the cheapest active
     * configuration. Whole shekels, because that is what the chip prints.
     */
    fromPriceIls: v.number(),

    sizes: v.array(sizeOption),

    maxColors: v.number(),                    // hard cap the UI enforces
    requiresPhoto: v.boolean(),
    allowedMaterialIds: v.array(v.id("materials")),

    /* --- 04 §C1 cost model, ported per RESOLUTIONS §א. Required, because the
       engine that landed prices cost-up: two numbers Shai copies straight out of
       the slicer for one reference size, and the scale does the rest. --- */
    refGrams: v.number(),                     // slicer grams at the reference size
    refHours: v.number(),                     // slicer hours at the reference size
    complexity: v.number(),                   // 1.00 .. 1.45, multiplies the variable part
    volumeExponent: v.number(),               // 2.0 flat panels, 2.4 keychain, 2.6 standee
    /** `glow` prints in glow filament whatever colour was picked */
    forcedFinish: v.optional(finishKey),

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
    /** RESOLUTIONS §5: false for `glow`, which is a relief in glow filament */
    backlitPreview: v.boolean(),

    /**
     * 05 §B.3 kernel parameters, merged in as an optional block so the viewer
     * reads geometry from data instead of a hard-coded table.
     */
    geometry: v.optional(
      v.object({
        kernel: v.union(
          v.literal("panel"),
          v.literal("panelHole"),
          v.literal("panelFrame"),
          v.literal("panelStand"),
          v.literal("panelPocket"),
          v.literal("panelFrameStand"),
        ),
        gridLong: v.number(),
        invertLuminance: v.boolean(),
        backlit: v.boolean(),
        quantizeToLayer: v.boolean(),
        thicknessMinMm: v.number(),
        thicknessMaxMm: v.number(),
        backPlateMm: v.number(),
        borderMm: v.number(),
        maxLongEdgeMm: v.number(),
        defaultFinish: v.union(v.literal("matte"), v.literal("silk"), v.literal("glow")),
        ringHoleMm: v.optional(v.number()),
        ringBossMm: v.optional(v.number()),
        magnetPocketMm: v.optional(v.object({ dia: v.number(), depth: v.number() })),
        frameWidthMm: v.optional(v.number()),
        frameDepthMm: v.optional(v.number()),
        standAngleDeg: v.optional(v.number()),
        standThicknessMm: v.optional(v.number()),
      }),
    ),

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
    /** participates in the finish MAX inside the engine */
    finish: v.optional(finishKey),

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
    hex: v.string(),                          // "#D6202B"
    familyHe: v.string(),                     // "אדומים"
    /** 09c §6.5 tabs: רגיל · משי · זוהר · עץ · שקוף */
    finish: finishKey,
    isMetallic: v.boolean(),
    isGlow: v.boolean(),
    isTranslucent: v.boolean(),

    /* r3f swatch hints, 01 §12.2. Optional so admin can add a spool in one tap */
    emissiveHex: v.optional(v.string()),
    roughness: v.optional(v.number()),
    metalness: v.optional(v.number()),
    clearcoat: v.optional(v.number()),
    transmission: v.optional(v.number()),

    extraCostAgorot: money,                   // per unit, 0 for a normal spool
    stock: stock,
    spoolNoteHe: v.optional(v.string()),      // admin only, "נשאר חצי גליל"
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

  /**
   * Exactly two rows. "live" is what the site charges, "draft" is what Shai
   * edits. Every field between `filamentCostPerGramAgorot` and
   * `maxPlausibleTotalAgorot` mirrors `PricingKnobs` in priceEngine.types.ts, so
   * `pricing.publicConfig` hands the engine the row without a translation layer.
   */
  pricingConfig: defineTable({
    channel: v.union(v.literal("live"), v.literal("draft")),
    version: v.number(),

    /* --- cost basis, 04 §C2 ported into agorot --- */
    filamentCostPerGramAgorot: money,         // 12 === 0.12 ש״ח לגרם
    filamentWasteBp: bp,                      // 800 === 8% purge, supports, failures
    machineRatePerHourAgorot: money,          // 600 === 6 ש״ח לשעה
    setupFeeAgorot: money,                    // per order, not per unit
    marginMultiplierBp: bp,                   // 13500 === ×1.35

    /* --- colours --- */
    freeColorCount: v.number(),               // 4
    extraColorAgorot: money,                  // per colour beyond the free count
    /** taken as a MAX across the selection, never a sum */
    finishSurchargeAgorot: v.object({
      matte: money,
      glossy: money,
      silk: money,
      glow: money,
      wood: money,
      transparent: money,
    }),

    /* --- quantity --- */
    maxQuantity: v.number(),                  // the stepper tops out here

    /* --- RESOLUTIONS §7. The site promises 3 working days, so rush exists only
       BELOW that promise, it is opted into, and it is capped. --- */
    leadTimeDays: v.number(),                 // 3
    rushEnabled: v.boolean(),
    rushPercentBp: bp,
    rushFeeMinAgorot: money,
    rushFeeMaxAgorot: money,                  // 6000 === 60 ש״ח
    rushLabelHe: v.string(),

    /* --- delivery --- */
    pickupEnabled: v.boolean(),
    pickupLabelHe: v.string(),
    shippingFlatAgorot: money,
    freeShippingThresholdAgorot: money,

    /* --- floor, rounding, guard ceiling --- */
    minOrderAgorot: money,
    roundToAgorot: v.number(),                // 1 | 10 | 50 | 100 | 500 | 1000
    roundingMode: v.union(v.literal("up"), v.literal("nearest")),
    charmEnding: v.boolean(),                 // take 10 agorot off after rounding
    maxPlausibleTotalAgorot: money,           // guard ceiling, default 300000

    /* --- copy, not a knob --- */
    priceDisclaimerHe: v.string(),            // shown under the price tag

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
    snapshot: v.any(),
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

  /** configurations Shai keeps as reference points in the pricing lab */
  pricingSamples: defineTable({
    labelHe: v.string(),                      // "ליתופן בינוני, 2 צבעים"
    printTypeId: v.id("printTypes"),
    materialId: v.id("materials"),
    sizeKey: v.string(),
    colorCount: v.number(),
    quantity: v.number(),
    deliveryMethod: deliveryMethod,
    rush: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  }).index("by_sort", ["sortOrder"]),

  /* ---------- visitor data ---------- */

  generatorDrafts: defineTable({
    /** uuid v4 the browser stores in localStorage. the only identity a visitor has */
    sessionKey: v.string(),
    status: draftStatus,
    /** RESOLUTIONS §2. Six steps: סוג · תמונה · צבעים · גודל · דגם · מחיר */
    step: v.number(),
    furthestStep: v.number(),

    /**
     * RESOLUTIONS §4. The photo uploads the moment it is chosen, and the copy
     * says so. Draft plus photo are deleted after 7 days by crons.ts.
     */
    photoId: v.optional(v.id("_storage")),
    photoMeta: v.optional(
      v.object({
        width: v.number(),
        height: v.number(),
        bytes: v.number(),
        mime: v.string(),
      }),
    ),
    photoShareConsent: v.boolean(),

    /** PNG the client captures off the r3f canvas after the preview renders */
    previewSnapshotId: v.optional(v.id("_storage")),

    /**
     * The mesh the browser built, written out so the order carries a printable file.
     *
     * Without this the generator ends at a picture: Shai receives a description and a
     * photograph and rebuilds the model himself, which is the one part of this a
     * computer should be doing. `stl` is what he prints from; `ply` keeps the
     * per-vertex colour the STL format cannot hold.
     */
    modelFiles: v.optional(
      v.array(
        v.object({
          format: v.union(v.literal("stl"), v.literal("ply")),
          storageId: v.id("_storage"),
          bytes: v.number(),
          triangles: v.number(),
          boundingMm: v.object({ x: v.number(), y: v.number(), z: v.number() }),
          builtAt: v.number(),
        }),
      ),
    ),

    printTypeId: v.optional(v.id("printTypes")),
    materialId: v.optional(v.id("materials")),
    sizeKey: v.optional(v.string()),
    colorIds: v.array(v.id("filamentColors")),
    quantity: v.number(),
    addonRuleIds: v.array(v.id("surchargeRules")),
    /** opt in only. never set by a date picker on its own */
    rush: v.boolean(),
    neededByDate: v.optional(v.number()),
    deliveryMethod: deliveryMethod,
    noteHe: v.optional(v.string()),

    /** server computed, rewritten on every save. never accepted from the client */
    priceAgorot: v.optional(money),
    breakdown: v.optional(priceBreakdown),

    /**
     * RESOLUTIONS §3. No form stands between the price and WhatsApp. These two
     * are never written by a public mutation; they exist only for the case where
     * a visitor volunteers a number in conversation and Shai types it in.
     */
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),

    leadId: v.optional(v.id("leads")),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    utm: v.optional(
      v.object({
        source: v.optional(v.string()),
        medium: v.optional(v.string()),
        campaign: v.optional(v.string()),
      }),
    ),

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

    /**
     * RESOLUTIONS §3. WhatsApp is the identity. Both are optional, and no public
     * mutation asks for either. Storing customers' phone numbers on a minor's
     * system without a reason is the thing this decision avoids.
     */
    name: v.optional(v.string()),
    phone: v.optional(v.string()),            // E.164 when Shai types one in
    email: v.optional(v.string()),

    /** short random code that identifies the order in the WhatsApp thread */
    publicCode: v.string(),

    productId: v.optional(v.id("products")),
    configSnapshot: v.optional(configSnapshot),
    breakdown: v.optional(priceBreakdown),
    priceAgorot: money,
    priceOverrideAgorot: v.optional(money),   // what Shai actually charged
    overrideReasonHe: v.optional(v.string()),

    photoId: v.optional(v.id("_storage")),
    previewSnapshotId: v.optional(v.id("_storage")),
    photoShareConsent: v.boolean(),

    /**
     * The mesh the browser built, written out so the order carries a printable file.
     *
     * Without this the generator ends at a picture: Shai receives a description and a
     * photograph and rebuilds the model himself, which is the one part of this a
     * computer should be doing. `stl` is what he prints from; `ply` keeps the
     * per-vertex colour the STL format cannot hold.
     */
    modelFiles: v.optional(
      v.array(
        v.object({
          format: v.union(v.literal("stl"), v.literal("ply")),
          storageId: v.id("_storage"),
          bytes: v.number(),
          triangles: v.number(),
          boundingMm: v.object({ x: v.number(), y: v.number(), z: v.number() }),
          builtAt: v.number(),
        }),
      ),
    ),

    /** exact text handed to WhatsApp, generated server side */
    whatsappMessage: v.string(),
    whatsappOpenedAt: v.optional(v.number()),

    status: leadStatus,
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
    .index("by_code", ["publicCode"])
    .index("by_archived", ["archivedAt"])
    .index("by_pinned_created", ["pinned", "createdAt"]),

  contactMessages: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    subjectHe: v.optional(v.string()),
    bodyHe: v.string(),
    sessionKey: v.optional(v.string()),
    status: contactStatus,
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
    purpose: v.union(
      v.literal("generatorPhoto"),
      v.literal("previewSnapshot"),
      v.literal("modelFile"),
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
  })
    .index("by_token", ["token"])
    .index("by_session", ["sessionKey", "createdAt"]),
});
