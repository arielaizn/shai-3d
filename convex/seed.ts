/**
 * One run, and the site has something real to render.
 *
 *   npx convex run seed:run
 *
 * Safe to re-run: it no-ops the moment `printTypes` is non-empty, so nobody can
 * wipe Shai's edited prices by pasting the command twice.
 *
 * Every number here comes from a document. Print type costs are 04 §A2, the
 * eighteen spools are 01 §12.2, the pricing knobs are 06 §C.24 reconciled with
 * RESOLUTIONS §7, and the copy is 09c verbatim.
 */
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { agorotToIls, fromPrice } from "./lib/priceEngine";
import { loadPriceEngineConfig } from "./lib/pricingConfig";

type FinishKeyValue = "matte" | "glossy" | "silk" | "glow" | "wood" | "transparent";

const MATERIALS: Array<{
  key: string;
  nameHe: string;
  shortHe: string;
  priceMultiplier: number;
  flatAddAgorot: number;
  finish: FinishKeyValue;
  roughness: number;
  metalness: number;
  clearcoat: number;
  emissiveHex?: string;
  emissiveIntensity: number;
  transmission: number;
}> = [
  {
    key: "pla",
    nameHe: "רגיל",
    shortHe: "הפילמנט שאני מדפיס בו הכי הרבה",
    priceMultiplier: 1,
    flatAddAgorot: 0,
    finish: "glossy",
    roughness: 0.35,
    metalness: 0,
    clearcoat: 0,
    emissiveIntensity: 0,
    transmission: 0,
  },
  {
    key: "matte",
    nameHe: "מט",
    shortHe: "בלי ברק, נעים ביד",
    priceMultiplier: 1,
    flatAddAgorot: 0,
    finish: "matte",
    roughness: 0.9,
    metalness: 0,
    clearcoat: 0,
    emissiveIntensity: 0,
    transmission: 0,
  },
  {
    key: "silk",
    nameHe: "משי",
    shortHe: "מבריק כמו מתכת",
    priceMultiplier: 1.15,
    flatAddAgorot: 0,
    finish: "silk",
    roughness: 0.18,
    metalness: 0.55,
    clearcoat: 0.8,
    emissiveIntensity: 0,
    transmission: 0,
  },
  {
    key: "glow",
    nameHe: "זוהר בחושך",
    shortHe: "סופג אור ביום ומאיר בלילה",
    priceMultiplier: 1.25,
    flatAddAgorot: 0,
    finish: "glow",
    roughness: 0.75,
    metalness: 0,
    clearcoat: 0,
    emissiveHex: "#A6FF7E",
    emissiveIntensity: 1.4,
    transmission: 0,
  },
];

const COLORS: Array<{
  nameHe: string;
  hex: string;
  familyHe: string;
  finish: FinishKeyValue;
  isMetallic?: boolean;
  isGlow?: boolean;
  isTranslucent?: boolean;
  emissiveHex?: string;
  roughness: number;
  metalness?: number;
  clearcoat?: number;
  transmission?: number;
}> = [
  { nameHe: "לבן ענן", hex: "#F4F2ED", familyHe: "לבנים ואפורים", finish: "matte", roughness: 0.88 },
  { nameHe: "שחור פחם", hex: "#1B191C", familyHe: "לבנים ואפורים", finish: "matte", roughness: 0.9 },
  { nameHe: "אפור סלע", hex: "#8B8E92", familyHe: "לבנים ואפורים", finish: "glossy", roughness: 0.4 },
  { nameHe: "אדום סוכריה", hex: "#D6202B", familyHe: "אדומים וורודים", finish: "glossy", roughness: 0.35 },
  { nameHe: "כתום גזר", hex: "#F2681C", familyHe: "כתומים וצהובים", finish: "glossy", roughness: 0.35 },
  { nameHe: "צהוב שמש", hex: "#FDC42B", familyHe: "כתומים וצהובים", finish: "glossy", roughness: 0.35 },
  { nameHe: "ירוק תפוח", hex: "#4FB53F", familyHe: "ירוקים", finish: "glossy", roughness: 0.35 },
  { nameHe: "טורקיז בריכה", hex: "#17BEBB", familyHe: "ירוקים", finish: "glossy", roughness: 0.35 },
  { nameHe: "כחול רויאל", hex: "#2049CE", familyHe: "כחולים וסגולים", finish: "glossy", roughness: 0.35 },
  { nameHe: "סגול ענבים", hex: "#6B3FA0", familyHe: "כחולים וסגולים", finish: "glossy", roughness: 0.38 },
  { nameHe: "ורוד בועה", hex: "#FF8FC1", familyHe: "אדומים וורודים", finish: "glossy", roughness: 0.35 },
  { nameHe: "בז' חול", hex: "#D9C5A3", familyHe: "חומים", finish: "matte", roughness: 0.85 },
  { nameHe: "חום שוקולד", hex: "#4C3423", familyHe: "חומים", finish: "matte", roughness: 0.88 },
  {
    nameHe: "זהב משי",
    hex: "#C6A02C",
    familyHe: "מיוחדים",
    finish: "silk",
    isMetallic: true,
    roughness: 0.18,
    metalness: 0.55,
    clearcoat: 0.8,
  },
  {
    nameHe: "כסף משי",
    hex: "#BFC4C9",
    familyHe: "מיוחדים",
    finish: "silk",
    isMetallic: true,
    roughness: 0.16,
    metalness: 0.6,
    clearcoat: 0.8,
  },
  {
    nameHe: "זוהר בחושך",
    hex: "#CFF3B8",
    familyHe: "מיוחדים",
    finish: "glow",
    isGlow: true,
    emissiveHex: "#A6FF7E",
    roughness: 0.75,
  },
  { nameHe: "עץ אורן", hex: "#A87B4E", familyHe: "מיוחדים", finish: "wood", roughness: 0.95 },
  {
    nameHe: "שקוף חלבי",
    hex: "#E8F0EC",
    familyHe: "מיוחדים",
    finish: "transparent",
    isTranslucent: true,
    roughness: 0.28,
    transmission: 0.55,
  },
];

type SeedSize = {
  key: string;
  labelHe: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  multiplier: number;
};

/** small · medium · large, as linear scale against the reference size */
function sizes(w: number, h: number, d: number, labels: [string, string, string]): SeedSize[] {
  const round = (n: number) => Math.round(n);
  return [
    { key: "s", labelHe: labels[0], widthMm: round(w * 0.8), heightMm: round(h * 0.8), depthMm: d, multiplier: 0.8 },
    { key: "m", labelHe: labels[1], widthMm: w, heightMm: h, depthMm: d, multiplier: 1 },
    { key: "l", labelHe: labels[2], widthMm: round(w * 1.3), heightMm: round(h * 1.3), depthMm: d, multiplier: 1.3 },
  ];
}

type SeedPrintType = {
  key: "lithophane" | "relief" | "glow" | "standee" | "keychain" | "magnet" | "framed";
  nameHe: string;
  shortHe: string;
  descriptionHe: string;
  basePriceAgorot: number;
  refGrams: number;
  refHours: number;
  complexity: number;
  volumeExponent: number;
  maxColors: number;
  forcedFinish?: FinishKeyValue;
  previewGeometry: "plane" | "cylinder" | "keychain" | "magnet" | "framed" | "standee";
  displacementScale: number;
  invertHeight: boolean;
  planeSegments: number;
  backlitPreview: boolean;
  accent: "red" | "turquoise" | "yellow" | "ink" | "none";
  sizes: SeedSize[];
  geometry: {
    kernel: "panel" | "panelHole" | "panelFrame" | "panelStand" | "panelPocket" | "panelFrameStand";
    gridLong: number;
    invertLuminance: boolean;
    backlit: boolean;
    quantizeToLayer: boolean;
    thicknessMinMm: number;
    thicknessMaxMm: number;
    backPlateMm: number;
    borderMm: number;
    maxLongEdgeMm: number;
    defaultFinish: "matte" | "silk" | "glow";
    ringHoleMm?: number;
    ringBossMm?: number;
    magnetPocketMm?: { dia: number; depth: number };
    frameWidthMm?: number;
    frameDepthMm?: number;
    standAngleDeg?: number;
    standThicknessMm?: number;
  };
};

const PRINT_TYPES: SeedPrintType[] = [
  {
    key: "lithophane",
    nameHe: "ליתופן",
    shortHe: "נדלק כשיש אור מאחור",
    descriptionHe:
      "לוח דק בצבע אחד. איפה שהתמונה כהה אני מדפיס עבה, ואיפה שהיא בהירה אני מדפיס דק, ואז האור שעובר דרכו מצייר את התמונה. בלי אור מאחור הוא נראה כמו לוח לבן חלק. מגיע עם מעמד קטן.",
    basePriceAgorot: 4500,
    refGrams: 60,
    refHours: 4.5,
    complexity: 1.15,
    volumeExponent: 2,
    maxColors: 1,
    previewGeometry: "plane",
    displacementScale: 0.24,
    invertHeight: true,
    planeSegments: 288,
    backlitPreview: true,
    accent: "turquoise",
    sizes: sizes(100, 150, 3, ["קטן 8×12 ס״מ", "בינוני 10×15 ס״מ", "גדול 13×20 ס״מ"]),
    geometry: {
      kernel: "panel",
      gridLong: 288,
      invertLuminance: true,
      backlit: true,
      quantizeToLayer: false,
      thicknessMinMm: 0.8,
      thicknessMaxMm: 3,
      backPlateMm: 0,
      borderMm: 3,
      maxLongEdgeMm: 200,
      defaultFinish: "matte",
    },
  },
  {
    key: "relief",
    nameHe: "תבליט מהתמונה",
    shortHe: "בולט מהלוח, נוגעים בו",
    descriptionHe:
      "לוח שטוח שהתמונה עולה ממנו החוצה, כמו מטבע. אפשר להעביר עליו יד ולהרגיש את הקווים. עובד הכי טוב על פנים גדולות ורקע פשוט.",
    basePriceAgorot: 5500,
    refGrams: 85,
    refHours: 6,
    complexity: 1.25,
    volumeExponent: 2,
    /* four are included in the price; five and six open the upsell sheet in
       09c §6.6 at 9 ש״ח each, which needs headroom above freeColorCount */
    maxColors: 6,
    previewGeometry: "plane",
    displacementScale: 0.3,
    invertHeight: false,
    planeSegments: 256,
    backlitPreview: false,
    accent: "red",
    sizes: sizes(120, 170, 6, ["קטן 10×14 ס״מ", "בינוני 12×17 ס״מ", "גדול 16×22 ס״מ"]),
    geometry: {
      kernel: "panel",
      gridLong: 256,
      invertLuminance: false,
      backlit: false,
      quantizeToLayer: true,
      thicknessMinMm: 1.6,
      thicknessMaxMm: 5.6,
      backPlateMm: 1.6,
      borderMm: 2.5,
      maxLongEdgeMm: 200,
      defaultFinish: "matte",
    },
  },
  {
    /* RESOLUTIONS §5: a relief in glow filament. Not a backlit lithophane, four
       colours rather than one, and the panel is opaque. */
    key: "glow",
    nameHe: "זוהר בחושך",
    shortHe: "אותה הדפסה, בחומר שסופג אור ביום ומאיר בלילה",
    descriptionHe:
      "אותו תבליט, בפילמנט שסופג אור ומחזיר אותו בחושך. משאירים אותו כמה דקות ליד מנורה והוא זוהר בערך שעה ואז נחלש. הפילמנט הזוהר ירקרק, ושאר הצבעים נבחרים כרגיל.",
    basePriceAgorot: 6200,
    refGrams: 70,
    refHours: 5,
    complexity: 1.2,
    volumeExponent: 2,
    maxColors: 4,
    forcedFinish: "glow",
    previewGeometry: "plane",
    displacementScale: 0.3,
    invertHeight: false,
    planeSegments: 256,
    backlitPreview: false,
    accent: "yellow",
    sizes: sizes(120, 170, 6, ["קטן 10×14 ס״מ", "בינוני 12×17 ס״מ", "גדול 16×22 ס״מ"]),
    geometry: {
      kernel: "panel",
      gridLong: 256,
      invertLuminance: false,
      backlit: false,
      quantizeToLayer: true,
      thicknessMinMm: 1.6,
      thicknessMaxMm: 5.6,
      backPlateMm: 1.6,
      borderMm: 2.5,
      maxLongEdgeMm: 200,
      defaultFinish: "glow",
    },
  },
  {
    key: "standee",
    nameHe: "דמות עומדת למדף",
    shortHe: "עומדת לבד על המדף",
    descriptionHe:
      "גזרה של התמונה שעומדת על בסיס משלה. אני מנקה את הרקע, משאיר את מה שחשוב, ומדפיס בעובי של סנטימטר עם רגל מאחור.",
    basePriceAgorot: 6800,
    refGrams: 120,
    refHours: 8,
    complexity: 1.35,
    volumeExponent: 2.6,
    maxColors: 6,
    previewGeometry: "standee",
    displacementScale: 0.26,
    invertHeight: false,
    planeSegments: 256,
    backlitPreview: false,
    accent: "red",
    sizes: sizes(90, 120, 10, ["קטן 10 ס״מ", "בינוני 12 ס״מ", "גדול 16 ס״מ"]),
    geometry: {
      kernel: "panelStand",
      gridLong: 256,
      invertLuminance: false,
      backlit: false,
      quantizeToLayer: true,
      thicknessMinMm: 1.6,
      thicknessMaxMm: 5.6,
      backPlateMm: 1.6,
      borderMm: 2.5,
      maxLongEdgeMm: 160,
      defaultFinish: "matte",
      standAngleDeg: 12,
      standThicknessMm: 8,
    },
  },
  {
    key: "keychain",
    nameHe: "מחזיק מפתחות",
    shortHe: "התמונה נוסעת איתכם",
    descriptionHe:
      "קטן, חזק, עם חור לטבעת. אני מדפיס אותו במילוי גבוה כדי שלא יישבר בכיס. שם או תאריך אפשר להוסיף, כותבים לי על זה בוואטסאפ.",
    basePriceAgorot: 2200,
    refGrams: 12,
    refHours: 0.8,
    complexity: 1,
    volumeExponent: 2.4,
    maxColors: 4,
    previewGeometry: "keychain",
    displacementScale: 0.16,
    invertHeight: false,
    planeSegments: 200,
    backlitPreview: false,
    accent: "turquoise",
    sizes: sizes(50, 50, 5, ["קטן 4 ס״מ", "בינוני 5 ס״מ", "גדול 6.5 ס״מ"]),
    geometry: {
      kernel: "panelHole",
      gridLong: 200,
      invertLuminance: false,
      backlit: false,
      quantizeToLayer: true,
      thicknessMinMm: 2.4,
      thicknessMaxMm: 4,
      backPlateMm: 2.4,
      borderMm: 1.5,
      maxLongEdgeMm: 60,
      defaultFinish: "matte",
      ringHoleMm: 5,
      ringBossMm: 2,
    },
  },
  {
    key: "magnet",
    nameHe: "מגנט למקרר",
    shortHe: "מחזיק על המקרר באמת",
    descriptionHe:
      "לוח קטן עם שקע מאחור למגנט עגול שאני מדביק בעצמי. נשאר על המקרר גם כשסוגרים חזק.",
    basePriceAgorot: 2600,
    refGrams: 18,
    refHours: 1.3,
    complexity: 1,
    volumeExponent: 2,
    maxColors: 4,
    previewGeometry: "magnet",
    displacementScale: 0.18,
    invertHeight: false,
    planeSegments: 200,
    backlitPreview: false,
    accent: "yellow",
    sizes: sizes(60, 60, 5, ["קטן 5 ס״מ", "בינוני 6 ס״מ", "גדול 8 ס״מ"]),
    geometry: {
      kernel: "panelPocket",
      gridLong: 200,
      invertLuminance: false,
      backlit: false,
      quantizeToLayer: true,
      thicknessMinMm: 3,
      thicknessMaxMm: 4.6,
      backPlateMm: 3,
      borderMm: 1.5,
      maxLongEdgeMm: 70,
      defaultFinish: "matte",
      magnetPocketMm: { dia: 10, depth: 2.2 },
    },
  },
  {
    key: "framed",
    nameHe: "תמונה במסגרת לקיר",
    shortHe: "נתלית כמו תמונה",
    descriptionHe:
      "הלוח הכי גדול שאני מדפיס, עם מסגרת שמודפסת יחד איתו ווו לתלייה מאחור. צבע אחד ללוח וצבע שני למסגרת.",
    basePriceAgorot: 9500,
    refGrams: 180,
    refHours: 11,
    complexity: 1.45,
    volumeExponent: 2,
    maxColors: 6,
    previewGeometry: "framed",
    displacementScale: 0.32,
    invertHeight: false,
    planeSegments: 288,
    backlitPreview: false,
    accent: "ink",
    sizes: sizes(200, 250, 12, ["קטן 16×20 ס״מ", "בינוני 20×25 ס״מ", "גדול 26×33 ס״מ"]),
    geometry: {
      kernel: "panelFrame",
      gridLong: 288,
      invertLuminance: false,
      backlit: false,
      quantizeToLayer: true,
      thicknessMinMm: 1.6,
      thicknessMaxMm: 5.6,
      backPlateMm: 1.6,
      borderMm: 0,
      maxLongEdgeMm: 240,
      defaultFinish: "matte",
      frameWidthMm: 14,
      frameDepthMm: 8,
    },
  },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const already = await ctx.db.query("printTypes").take(1);
    if (already.length > 0) {
      return { seeded: false, reason: "כבר יש נתונים. הזריעה לא עשתה כלום" };
    }

    const now = Date.now();

    /* ---- settings ---- */
    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique();
    if (!settings) {
      await ctx.db.insert("siteSettings", {
        key: "main",
        businessNameHe: "שי איזנשטט",
        taglineHe: "הופך רעיונות לדברים אמיתיים",
        whatsappNumberE164: "972585845083",
        whatsappGreetingHe: "היי שי, בניתי הזמנה באתר.",
        announcementEnabled: false,
        /* RESOLUTIONS §7. The site promises three working days in the hero, on
           every product page and in the FAQ, so it says three here too. */
        turnaroundDaysMin: 3,
        turnaroundDaysMax: 3,
        pickupCityHe: "בתיאום מראש",
        maintenanceMode: false,
        updatedAt: now,
      });
    }

    /* ---- materials ---- */
    const materialIds: Id<"materials">[] = [];
    let materialSort = 100;
    for (const material of MATERIALS) {
      materialIds.push(
        await ctx.db.insert("materials", {
          ...material,
          sortOrder: materialSort,
          active: true,
          createdAt: now,
          updatedAt: now,
        }),
      );
      materialSort += 100;
    }

    /* ---- filament colours ---- */
    let colorSort = 100;
    for (const color of COLORS) {
      await ctx.db.insert("filamentColors", {
        nameHe: color.nameHe,
        hex: color.hex,
        familyHe: color.familyHe,
        finish: color.finish,
        isMetallic: color.isMetallic ?? false,
        isGlow: color.isGlow ?? false,
        isTranslucent: color.isTranslucent ?? false,
        emissiveHex: color.emissiveHex,
        roughness: color.roughness,
        metalness: color.metalness,
        clearcoat: color.clearcoat,
        transmission: color.transmission,
        extraCostAgorot: 0,
        stock: "in",
        sortOrder: colorSort,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      colorSort += 100;
    }

    /* ---- print types ---- */
    const printTypeIds: Id<"printTypes">[] = [];
    let printTypeSort = 100;
    for (const printType of PRINT_TYPES) {
      const scaled = (base: number, size: SeedSize) =>
        base * Math.pow(size.multiplier, printType.volumeExponent);
      printTypeIds.push(
        await ctx.db.insert("printTypes", {
          key: printType.key,
          nameHe: printType.nameHe,
          shortHe: printType.shortHe,
          descriptionHe: printType.descriptionHe,
          basePriceAgorot: printType.basePriceAgorot,
          /* written for real a few lines below, by running the engine */
          fromPriceIls: 0,
          sizes: printType.sizes.map((size, index) => ({
            key: size.key,
            labelHe: size.labelHe,
            widthMm: size.widthMm,
            heightMm: size.heightMm,
            depthMm: size.depthMm,
            multiplier: size.multiplier,
            longestEdgeMm: Math.max(size.widthMm, size.heightMm, size.depthMm),
            estimatedGrams: Math.round(scaled(printType.refGrams, size)),
            estimatedMinutes: Math.round(scaled(printType.refHours, size) * 60),
            sortOrder: (index + 1) * 100,
            active: true,
          })),
          maxColors: printType.maxColors,
          requiresPhoto: true,
          allowedMaterialIds: printType.key === "glow" ? [materialIds[3]] : materialIds.slice(0, 3),
          refGrams: printType.refGrams,
          refHours: printType.refHours,
          complexity: printType.complexity,
          volumeExponent: printType.volumeExponent,
          forcedFinish: printType.forcedFinish,
          previewGeometry: printType.previewGeometry,
          displacementScale: printType.displacementScale,
          invertHeight: printType.invertHeight,
          planeSegments: printType.planeSegments,
          backlitPreview: printType.backlitPreview,
          geometry: printType.geometry,
          accent: printType.accent,
          sortOrder: printTypeSort,
          active: true,
          createdAt: now,
          updatedAt: now,
        }),
      );
      printTypeSort += 100;
    }

    /* ---- quantity tiers ---- */
    for (const tier of [
      { minQty: 3, discountBp: 1000, labelHe: "3 יחידות ומעלה" },
      { minQty: 5, discountBp: 1500, labelHe: "5 יחידות ומעלה" },
      { minQty: 10, discountBp: 2200, labelHe: "10 יחידות ומעלה" },
    ]) {
      await ctx.db.insert("quantityDiscountTiers", {
        ...tier,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    /* ---- pricing, both channels identical at version 1 ---- */
    const knobs = {
      filamentCostPerGramAgorot: 12,
      filamentWasteBp: 800,
      machineRatePerHourAgorot: 600,
      setupFeeAgorot: 800,
      marginMultiplierBp: 13500,

      freeColorCount: 4,
      extraColorAgorot: 900,
      finishSurchargeAgorot: {
        matte: 0,
        glossy: 0,
        silk: 600,
        glow: 1200,
        wood: 800,
        transparent: 400,
      },

      maxQuantity: 25,

      /* RESOLUTIONS §7. Three days is the public promise, so the rush fee can
         only fire below it, it is opted into, and it is capped at 60 ש״ח. */
      leadTimeDays: 3,
      rushEnabled: true,
      rushPercentBp: 2500,
      rushFeeMinAgorot: 1500,
      rushFeeMaxAgorot: 6000,
      rushLabelHe: "דחוף",

      pickupEnabled: true,
      pickupLabelHe: "איסוף עצמי בתיאום",
      shippingFlatAgorot: 2500,
      freeShippingThresholdAgorot: 25000,

      minOrderAgorot: 3500,
      roundToAgorot: 500,
      roundingMode: "up" as const,
      charmEnding: false,
      maxPlausibleTotalAgorot: 300000,

      priceDisclaimerHe: "הצעת מחיר לפי מה שבחרתם. סוגרים סופית בוואטסאפ.",
    };

    await ctx.db.insert("pricingConfig", {
      channel: "live",
      version: 1,
      ...knobs,
      updatedAt: now,
      publishedAt: now,
    });
    await ctx.db.insert("pricingConfig", {
      channel: "draft",
      version: 1,
      ...knobs,
      updatedAt: now,
    });

    /* ---- three reference configurations for the pricing lab ---- */
    const samples = [
      { labelHe: "ליתופן בינוני, צבע אחד", printTypeId: printTypeIds[0], sizeKey: "m", colorCount: 1, quantity: 1 },
      { labelHe: "מחזיק מפתחות קטן, 5 יחידות", printTypeId: printTypeIds[4], sizeKey: "s", colorCount: 2, quantity: 5 },
      { labelHe: "תמונה במסגרת גדולה", printTypeId: printTypeIds[6], sizeKey: "l", colorCount: 2, quantity: 1 },
    ];
    let sampleSort = 100;
    for (const sample of samples) {
      await ctx.db.insert("pricingSamples", {
        ...sample,
        materialId: materialIds[0],
        deliveryMethod: "pickup",
        rush: false,
        sortOrder: sampleSort,
        createdAt: now,
      });
      sampleSort += 100;
    }

    /* ---- RESOLUTIONS §8: the chip on every card, computed by the engine ---- */
    const cfg = await loadPriceEngineConfig(ctx, "live");
    for (const id of printTypeIds) {
      const row = await ctx.db.get(id);
      if (!row) continue;
      const result = fromPrice(row.key, cfg);
      await ctx.db.patch(id, {
        fromPriceIls: result ? result.ils : agorotToIls(row.basePriceAgorot),
      });
    }

    return {
      seeded: true,
      printTypes: printTypeIds.length,
      materials: materialIds.length,
      colors: COLORS.length,
    };
  },
});
