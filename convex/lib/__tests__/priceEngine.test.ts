/**
 * The golden tests for the one pricing engine.
 *
 * The three worked examples of 04 §C5 are here in agorot, and they are the reason
 * this file exists: a change to the order of operations fails CI instead of
 * failing a customer.
 *
 * One number moved on purpose. Example 3 in 04 prints 570 ש״ח with a rush fee of
 * 113.94 ש״ח. RESOLUTIONS §7 caps the rush fee at `rushFeeMax`, 60 ש״ח, so the
 * same order now totals 520 ש״ח. The cap is the ruling; the printed 570 is the
 * spec before the ruling.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRICING_KNOBS,
  PriceConfigError,
  PriceInputError,
  SAMPLE_INPUTS,
  agorotToIls,
  assertConfigOrThrow,
  assertConfigSane,
  computePrice,
  fromPrice,
} from "../priceEngine";
import type {
  ColorLite,
  FinishKey,
  MaterialLite,
  PriceEngineConfig,
  PriceInput,
  PricingKnobs,
  PrintTypeLite,
  RuleLite,
  SizeLite,
  TierLite,
} from "../priceEngine.types";

/* ------------------------------------------------------------------ */
/* fixtures. the seven locked print types with 04 §A2 numbers          */
/* ------------------------------------------------------------------ */

function sizes(longestEdgeMm?: [number, number, number]): SizeLite[] {
  return [
    {
      key: "s",
      labelHe: "קטן",
      multiplier: 0.8,
      sortOrder: 1,
      active: true,
      longestEdgeMm: longestEdgeMm ? longestEdgeMm[0] : undefined,
    },
    {
      key: "m",
      labelHe: "בינוני",
      multiplier: 1.0,
      sortOrder: 2,
      active: true,
      longestEdgeMm: longestEdgeMm ? longestEdgeMm[1] : undefined,
    },
    {
      key: "l",
      labelHe: "גדול",
      multiplier: 1.3,
      sortOrder: 3,
      active: true,
      longestEdgeMm: longestEdgeMm ? longestEdgeMm[2] : undefined,
    },
  ];
}

const PRINT_TYPES: PrintTypeLite[] = [
  {
    key: "lithophane",
    nameHe: "ליתופן",
    basePriceAgorot: 4500,
    sizes: sizes(),
    maxColors: 1,
    refGrams: 60,
    refHours: 4.5,
    complexity: 1.15,
    volumeExponent: 2.0,
    active: true,
  },
  {
    key: "relief",
    nameHe: "תבליט מהתמונה",
    basePriceAgorot: 5500,
    sizes: sizes(),
    maxColors: 4,
    refGrams: 85,
    refHours: 6.0,
    complexity: 1.25,
    volumeExponent: 2.0,
    active: true,
  },
  {
    /* RESOLUTIONS §5: a relief printed in glow filament. four colours, no backlight */
    key: "glow",
    nameHe: "ליתופן זוהר בחושך",
    basePriceAgorot: 6200,
    sizes: sizes(),
    maxColors: 4,
    refGrams: 70,
    refHours: 5.0,
    complexity: 1.2,
    volumeExponent: 2.0,
    forcedFinish: "glow",
    active: true,
  },
  {
    key: "standee",
    nameHe: "דמות עומדת למדף",
    basePriceAgorot: 6800,
    sizes: sizes(),
    maxColors: 4,
    refGrams: 120,
    refHours: 8.0,
    complexity: 1.35,
    volumeExponent: 2.6,
    active: true,
  },
  {
    key: "keychain",
    nameHe: "מחזיק מפתחות",
    basePriceAgorot: 2200,
    sizes: sizes(),
    maxColors: 4,
    refGrams: 12,
    refHours: 0.8,
    complexity: 1.0,
    volumeExponent: 2.4,
    active: true,
  },
  {
    key: "magnet",
    nameHe: "מגנט למקרר",
    basePriceAgorot: 2600,
    sizes: sizes(),
    maxColors: 4,
    refGrams: 18,
    refHours: 1.3,
    complexity: 1.0,
    volumeExponent: 2.0,
    active: true,
  },
  {
    /* six, not four: 04 §C5 example 3 prices this type with six colours */
    key: "framed",
    nameHe: "תמונה במסגרת לקיר",
    basePriceAgorot: 9500,
    sizes: sizes([200, 250, 325]),
    maxColors: 6,
    refGrams: 180,
    refHours: 11.0,
    complexity: 1.45,
    volumeExponent: 2.0,
    active: true,
  },
];

const MATERIALS: MaterialLite[] = [
  { key: "pla", nameHe: "PLA רגיל", priceMultiplier: 1.0, flatAddAgorot: 0, active: true },
  {
    key: "premium",
    nameHe: "משי",
    priceMultiplier: 1.5,
    flatAddAgorot: 500,
    finish: "silk",
    active: true,
  },
];

const COLORS: ColorLite[] = [
  { id: "c-red", nameHe: "אדום סוכריה", finish: "matte", extraCostAgorot: 0, active: true },
  { id: "c-turq", nameHe: "טורקיז", finish: "matte", extraCostAgorot: 0, active: true },
  { id: "c-yellow", nameHe: "צהוב", finish: "matte", extraCostAgorot: 0, active: true },
  { id: "c-white", nameHe: "לבן", finish: "matte", extraCostAgorot: 0, active: true },
  { id: "c-blue", nameHe: "כחול", finish: "matte", extraCostAgorot: 0, active: true },
  { id: "c-gloss", nameHe: "מבריק", finish: "glossy", extraCostAgorot: 0, active: true },
  { id: "c-silk", nameHe: "זהב משי", finish: "silk", extraCostAgorot: 0, active: true },
  { id: "c-glow", nameHe: "זוהר", finish: "glow", extraCostAgorot: 0, active: true },
  { id: "c-wood", nameHe: "עץ", finish: "wood", extraCostAgorot: 0, active: true },
  { id: "c-clear", nameHe: "שקוף", finish: "transparent", extraCostAgorot: 0, active: true },
  {
    id: "c-metal",
    nameHe: "כרום",
    finish: "matte",
    extraCostAgorot: 300,
    active: true,
  },
];

const TIERS: TierLite[] = [
  { id: "t2", minQty: 2, discountBp: 500, labelHe: "2 יחידות ומעלה", active: true },
  { id: "t3", minQty: 3, discountBp: 1000, labelHe: "3 יחידות ומעלה", active: true },
  { id: "t5", minQty: 5, discountBp: 1500, labelHe: "5 יחידות ומעלה", active: true },
  { id: "t10", minQty: 10, discountBp: 2200, labelHe: "10 יחידות ומעלה", active: true },
];

function makeConfig(
  knobs: Partial<PricingKnobs> = {},
  parts: Partial<Omit<PriceEngineConfig, "config">> = {},
): PriceEngineConfig {
  return {
    version: 7,
    config: { ...DEFAULT_PRICING_KNOBS, ...knobs },
    printTypes: parts.printTypes ?? PRINT_TYPES,
    materials: parts.materials ?? MATERIALS,
    colors: parts.colors ?? COLORS,
    rules: parts.rules ?? [],
    tiers: parts.tiers ?? TIERS,
  };
}

function input(patch: Partial<PriceInput> = {}): PriceInput {
  return {
    printTypeKey: "keychain",
    materialKey: "pla",
    sizeKey: "m",
    colorIds: ["c-red"],
    quantity: 1,
    addonRuleIds: [],
    rush: false,
    deliveryMethod: "pickup",
    ...patch,
  };
}

/** every money value the engine returns has to be a whole number of agorot */
function expectAllIntegerMoney(breakdown: ReturnType<typeof computePrice>): void {
  const money = [
    breakdown.unitAgorot,
    breakdown.subtotalAgorot,
    breakdown.roundingAgorot,
    breakdown.totalAgorot,
    breakdown.lineTotalAgorot,
    breakdown.discountAgorot,
    breakdown.rushAgorot,
    breakdown.shippingAgorot,
    breakdown.minOrderBumpAgorot,
    breakdown.extraColorsAgorot,
    breakdown.colorPremiumAgorot,
    breakdown.finishAgorot,
    breakdown.unitBaseAgorot,
    breakdown.unitCoreAgorot,
    ...breakdown.lines.map((l) => l.amountAgorot),
    ...breakdown.lines.map((l) => l.displayAgorot),
  ];
  for (const value of money) expect(Number.isInteger(value)).toBe(true);
}

/* ------------------------------------------------------------------ */

describe("04 §C5 · the three worked examples", () => {
  it("example 1: keychain, small, 2 colours, 3 units, collection, totals 105 ש״ח", () => {
    const b = computePrice(
      input({
        printTypeKey: "keychain",
        sizeKey: "s",
        colorIds: ["c-red", "c-turq"],
        quantity: 3,
        deliveryMethod: "pickup",
      }),
      makeConfig(),
    );

    expect(b.grams).toBeCloseTo(7.02, 2);
    expect(b.hours).toBeCloseTo(0.468, 3);
    expect(b.variableAgorot).toBe(372);
    expect(b.unitCoreAgorot).toBe(2572);
    expect(b.unitBaseAgorot).toBe(3472);
    expect(b.unitAgorot).toBe(3472);
    expect(b.lineTotalAgorot).toBe(10416);
    expect(b.discountBp).toBe(1000);
    expect(b.discountAgorot).toBe(1042);
    expect(b.shippingAgorot).toBe(0);
    expect(b.subtotalAgorot).toBe(10174);
    expect(b.roundingAgorot).toBe(326);
    expect(b.totalAgorot).toBe(10500);
    expect(agorotToIls(b.totalAgorot)).toBe(105);
  });

  it("example 1: prints the breakdown 04 §C5 prints, in whole shekels", () => {
    const b = computePrice(
      input({
        printTypeKey: "keychain",
        sizeKey: "s",
        colorIds: ["c-red", "c-turq"],
        quantity: 3,
      }),
      makeConfig(),
    );
    expect(
      b.lines.map((l) => [l.labelHe, agorotToIls(l.displayAgorot)] as const),
    ).toEqual([
      ["מחזיק מפתחות ×3", 104],
      ["הנחת כמות 10%", -10],
      ["הכנה וחיתוך", 8],
      ["עיגול", 3],
    ]);
  });

  it("example 2: lithophane, reference size, 1 colour, 1 unit, shipping, totals 150 ש״ח", () => {
    const b = computePrice(
      input({
        printTypeKey: "lithophane",
        sizeKey: "m",
        colorIds: ["c-red"],
        quantity: 1,
        deliveryMethod: "shipping",
      }),
      makeConfig(),
    );

    expect(b.grams).toBe(60);
    expect(b.hours).toBe(4.5);
    expect(b.variableAgorot).toBe(3999);
    expect(b.unitCoreAgorot).toBe(8499);
    expect(b.unitAgorot).toBe(11474);
    expect(b.discountAgorot).toBe(0);
    expect(b.shippingAgorot).toBe(2500);
    expect(b.subtotalAgorot).toBe(14774);
    expect(b.roundingAgorot).toBe(226);
    expect(b.totalAgorot).toBe(15000);
    expect(agorotToIls(b.totalAgorot)).toBe(150);
  });

  it("example 2: prints the breakdown 04 §C5 prints, in whole shekels", () => {
    const b = computePrice(
      input({
        printTypeKey: "lithophane",
        sizeKey: "m",
        deliveryMethod: "shipping",
      }),
      makeConfig(),
    );
    expect(
      b.lines.map((l) => [l.labelHe, agorotToIls(l.displayAgorot)] as const),
    ).toEqual([
      ["ליתופן ×1", 115],
      ["הכנה וחיתוך", 8],
      ["משלוח", 25],
      ["עיגול", 2],
    ]);
  });

  it("example 3: framed, large, 6 colours with one silk, rush, shipping, totals 520 ש״ח once the rush cap applies", () => {
    const b = computePrice(
      input({
        printTypeKey: "framed",
        sizeKey: "l",
        colorIds: ["c-red", "c-turq", "c-yellow", "c-white", "c-blue", "c-silk"],
        quantity: 1,
        rush: true,
        requestedInDays: 1,
        deliveryMethod: "shipping",
      }),
      makeConfig(),
    );

    expect(b.grams).toBeCloseTo(304.2, 1);
    expect(b.hours).toBeCloseTo(18.59, 2);
    expect(b.variableAgorot).toBe(21890);
    expect(b.unitCoreAgorot).toBe(31390);
    expect(b.colorCount).toBe(6);
    expect(b.extraColorsAgorot).toBe(1800);
    expect(b.finishKey).toBe("silk");
    expect(b.finishAgorot).toBe(600);
    expect(b.unitAgorot).toBe(44777);
    expect(b.rushApplied).toBe(true);
    expect(b.rushAgorot).toBe(6000);
    expect(b.shippingAgorot).toBe(0);
    expect(b.totalAgorot).toBe(52000);
    expect(agorotToIls(b.totalAgorot)).toBe(520);
  });

  it("example 3: the rush fee would have been 113.94 ש״ח without the cap", () => {
    const b = computePrice(
      input({
        printTypeKey: "framed",
        sizeKey: "l",
        colorIds: ["c-red", "c-turq", "c-yellow", "c-white", "c-blue", "c-silk"],
        rush: true,
        requestedInDays: 1,
        deliveryMethod: "shipping",
      }),
      makeConfig({ rushFeeMaxAgorot: 100000 }),
    );
    expect(b.rushAgorot).toBe(11394);
    expect(b.totalAgorot).toBe(57000);
  });
});

/* ------------------------------------------------------------------ */

describe("invariants that hold for every price", () => {
  const cases: [string, PriceInput][] = [
    ["keychain ×3 collection", input({ sizeKey: "s", quantity: 3 })],
    ["lithophane shipping", input({ printTypeKey: "lithophane", deliveryMethod: "shipping" })],
    [
      "framed rush",
      input({
        printTypeKey: "framed",
        sizeKey: "l",
        colorIds: ["c-red", "c-turq", "c-yellow", "c-white", "c-blue", "c-silk"],
        rush: true,
        deliveryMethod: "shipping",
      }),
    ],
    ["magnet ×12", input({ printTypeKey: "magnet", quantity: 12 })],
    ["glow forced finish", input({ printTypeKey: "glow" })],
    [
      "standee premium material",
      input({ printTypeKey: "standee", materialKey: "premium", deliveryMethod: "shipping" }),
    ],
  ];

  for (const [name, payload] of cases) {
    it(`${name}: the exact lines add up to the total`, () => {
      const b = computePrice(payload, makeConfig());
      const sum = b.lines.reduce((acc, l) => acc + l.amountAgorot, 0);
      expect(sum).toBe(b.totalAgorot);
    });

    it(`${name}: the printed whole shekel lines add up to the total`, () => {
      const b = computePrice(payload, makeConfig());
      const sum = b.lines.reduce((acc, l) => acc + l.displayAgorot, 0);
      expect(sum).toBe(b.totalAgorot);
    });

    it(`${name}: subtotal plus rounding is the total, and every amount is whole agorot`, () => {
      const b = computePrice(payload, makeConfig());
      expect(b.subtotalAgorot + b.roundingAgorot).toBe(b.totalAgorot);
      expectAllIntegerMoney(b);
    });
  }

  it("carries the config version onto the quote", () => {
    const b = computePrice(input(), makeConfig());
    expect(b.configVersion).toBe(7);
  });

  it("rounds to a number a person would say", () => {
    for (const [, payload] of cases) {
      const b = computePrice(payload, makeConfig());
      expect(b.totalAgorot % 500).toBe(0);
    }
  });
});

/* ------------------------------------------------------------------ */

describe("quantity", () => {
  it("rejects a quantity of zero", () => {
    expect(() => computePrice(input({ quantity: 0 }), makeConfig())).toThrow(PriceInputError);
    expect(() => computePrice(input({ quantity: 0 }), makeConfig())).toThrow(
      "כמות חייבת להיות לפחות יחידה אחת",
    );
  });

  it("rejects a negative and a fractional quantity", () => {
    expect(() => computePrice(input({ quantity: -3 }), makeConfig())).toThrow(PriceInputError);
    expect(() => computePrice(input({ quantity: 2.5 }), makeConfig())).toThrow(PriceInputError);
  });

  it("rejects a quantity above the stepper cap", () => {
    expect(() => computePrice(input({ quantity: 26 }), makeConfig())).toThrow(
      "אפשר להזמין עד 25 יחידות בהזמנה אחת",
    );
  });

  it("takes no tier below the first one", () => {
    const b = computePrice(input({ quantity: 1 }), makeConfig());
    expect(b.discountTierId).toBeNull();
    expect(b.discountBp).toBe(0);
    expect(b.discountAgorot).toBe(0);
  });

  it("takes the highest matching tier, not the first", () => {
    const b = computePrice(input({ quantity: 5 }), makeConfig());
    expect(b.discountTierId).toBe("t5");
    expect(b.discountBp).toBe(1500);
  });

  it("holds at the top tier above the top tier", () => {
    const top = computePrice(input({ printTypeKey: "magnet", quantity: 10 }), makeConfig());
    const above = computePrice(input({ printTypeKey: "magnet", quantity: 25 }), makeConfig());
    expect(top.discountTierId).toBe("t10");
    expect(above.discountTierId).toBe("t10");
    expect(above.discountBp).toBe(2200);
  });

  it("never makes a larger order cheaper than a smaller one", () => {
    let previous = 0;
    for (let q = 1; q <= 25; q += 1) {
      const b = computePrice(input({ printTypeKey: "magnet", quantity: q }), makeConfig());
      expect(b.totalAgorot).toBeGreaterThanOrEqual(previous);
      previous = b.totalAgorot;
    }
  });
});

/* ------------------------------------------------------------------ */

describe("colours", () => {
  it("charges nothing below the included count", () => {
    const b = computePrice(input({ colorIds: ["c-red", "c-turq"] }), makeConfig());
    expect(b.colorCount).toBe(2);
    expect(b.extraColorsAgorot).toBe(0);
    expect(b.lines.some((l) => l.key === "colors")).toBe(false);
  });

  it("charges nothing exactly at the included count", () => {
    const b = computePrice(
      input({ colorIds: ["c-red", "c-turq", "c-yellow", "c-white"] }),
      makeConfig(),
    );
    expect(b.colorCount).toBe(4);
    expect(b.extraColorsAgorot).toBe(0);
  });

  it("charges per colour above the included count, per unit", () => {
    const b = computePrice(
      input({
        colorIds: ["c-red", "c-turq", "c-yellow", "c-white", "c-blue", "c-gloss"],
        quantity: 2,
      }),
      makeConfig(),
    );
    expect(b.extraColorsAgorot).toBe(1800);
    const line = b.lines.find((l) => l.key === "colors");
    expect(line?.labelHe).toBe("2 צבעים נוספים");
    expect(line?.hintHe).toBe("החלפת פילמנט באמצע");
    expect(line?.amountAgorot).toBe(3600);
  });

  it("adds what an expensive spool itself costs, on top of the extra colour charge", () => {
    const b = computePrice(input({ colorIds: ["c-metal"] }), makeConfig());
    expect(b.colorPremiumAgorot).toBe(300);
    expect(b.extraColorsAgorot).toBe(0);
    expect(b.lines.find((l) => l.key === "finish")?.amountAgorot).toBe(300);
  });

  it("counts a colour that no longer exists without crashing or charging for it", () => {
    const b = computePrice(input({ colorIds: ["c-red", "deleted-spool"] }), makeConfig());
    expect(b.colorCount).toBe(2);
    expect(b.colorPremiumAgorot).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

describe("finish surcharge", () => {
  const table: [FinishKey, string, number][] = [
    ["matte", "c-red", 0],
    ["glossy", "c-gloss", 0],
    ["silk", "c-silk", 600],
    ["glow", "c-glow", 1200],
    ["wood", "c-wood", 800],
    ["transparent", "c-clear", 400],
  ];

  for (const [finish, colorId, expected] of table) {
    it(`${finish} adds ${expected} agorot per unit`, () => {
      const b = computePrice(input({ colorIds: [colorId] }), makeConfig());
      expect(b.finishAgorot).toBe(expected);
      if (expected > 0) expect(b.finishKey).toBe(finish);
      else expect(b.finishKey).toBeNull();
    });
  }

  it("takes the maximum and never the sum, because he changes to one expensive material once", () => {
    const b = computePrice(
      input({ colorIds: ["c-glow", "c-glow", "c-glow"] }),
      makeConfig(),
    );
    expect(b.finishAgorot).toBe(1200);
  });

  it("takes the maximum across mixed finishes", () => {
    const b = computePrice(
      input({ colorIds: ["c-silk", "c-glow", "c-wood", "c-clear"] }),
      makeConfig(),
    );
    expect(b.finishAgorot).toBe(1200);
    expect(b.finishKey).toBe("glow");
  });

  it("applies the finish a print type forces even when the colour is plain", () => {
    const b = computePrice(input({ printTypeKey: "glow", colorIds: ["c-red"] }), makeConfig());
    expect(b.finishKey).toBe("glow");
    expect(b.finishAgorot).toBe(1200);
  });

  it("lets the material carry a finish too", () => {
    const b = computePrice(input({ materialKey: "premium" }), makeConfig());
    expect(b.finishKey).toBe("silk");
    expect(b.finishAgorot).toBe(600);
    expect(b.materialMultiplier).toBe(1.5);
    expect(b.materialFlatAgorot).toBe(500);
  });
});

/* ------------------------------------------------------------------ */

describe("rush is opt in, gated by the promised lead time, and capped", () => {
  it("adds nothing when the visitor did not opt in", () => {
    const b = computePrice(input({ rush: false, requestedInDays: 1 }), makeConfig());
    expect(b.rushApplied).toBe(false);
    expect(b.rushAgorot).toBe(0);
  });

  it("adds nothing for a date outside the three day promise, even when the flag is on", () => {
    const b = computePrice(input({ rush: true, requestedInDays: 5 }), makeConfig());
    expect(b.rushApplied).toBe(false);
    expect(b.rushAgorot).toBe(0);
  });

  it("adds nothing on the third day, which is the day the site already promises", () => {
    const b = computePrice(input({ rush: true, requestedInDays: 3 }), makeConfig());
    expect(b.rushApplied).toBe(false);
  });

  it("applies inside the promise", () => {
    const b = computePrice(input({ rush: true, requestedInDays: 2 }), makeConfig());
    expect(b.rushApplied).toBe(true);
    expect(b.rushAgorot).toBeGreaterThan(0);
  });

  it("applies when no date was chosen at all", () => {
    const b = computePrice(input({ rush: true }), makeConfig());
    expect(b.rushApplied).toBe(true);
  });

  it("never charges below the floor", () => {
    const b = computePrice(
      input({ printTypeKey: "keychain", sizeKey: "s", rush: true }),
      makeConfig(),
    );
    expect(b.rushAgorot).toBe(1500);
  });

  it("never charges above the ceiling", () => {
    const b = computePrice(
      input({ printTypeKey: "framed", sizeKey: "l", quantity: 4, rush: true }),
      makeConfig(),
    );
    expect(b.rushAgorot).toBe(6000);
  });

  it("adds nothing when rush is switched off in the admin", () => {
    const b = computePrice(input({ rush: true }), makeConfig({ rushEnabled: false }));
    expect(b.rushApplied).toBe(false);
    expect(b.rushAgorot).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

describe("delivery and the minimum order", () => {
  it("charges nothing for collection", () => {
    const b = computePrice(input({ deliveryMethod: "pickup" }), makeConfig());
    expect(b.shippingAgorot).toBe(0);
  });

  it("charges the flat rate under the free threshold", () => {
    const b = computePrice(input({ deliveryMethod: "shipping" }), makeConfig());
    expect(b.shippingAgorot).toBe(2500);
  });

  it("charges nothing above the free threshold", () => {
    const b = computePrice(
      input({ printTypeKey: "framed", sizeKey: "l", deliveryMethod: "shipping" }),
      makeConfig(),
    );
    expect(b.shippingAgorot).toBe(0);
  });

  it("refuses collection when the admin switched it off", () => {
    expect(() =>
      computePrice(input({ deliveryMethod: "pickup" }), makeConfig({ pickupEnabled: false })),
    ).toThrow("איסוף עצמי לא זמין כרגע");
  });

  it("lifts a small order to the minimum and records the lift as its own line", () => {
    const cfg = makeConfig({ minOrderAgorot: 20000 });
    const b = computePrice(input({ printTypeKey: "keychain", sizeKey: "s" }), cfg);
    expect(b.minOrderBumpAgorot).toBe(20000 - 4272);
    expect(b.lines.find((l) => l.key === "minOrder")?.labelHe).toBe("הזמנה מינימלית");
    expect(b.totalAgorot).toBe(20000);
  });

  it("lifts before delivery, so the free shipping threshold sees the lifted number", () => {
    const cfg = makeConfig({ minOrderAgorot: 26000 });
    const b = computePrice(
      input({ printTypeKey: "keychain", sizeKey: "s", deliveryMethod: "shipping" }),
      cfg,
    );
    expect(b.minOrderBumpAgorot).toBeGreaterThan(0);
    expect(b.shippingAgorot).toBe(0);
  });

  it("adds no lift when the order already clears the minimum", () => {
    const b = computePrice(input({ printTypeKey: "lithophane" }), makeConfig());
    expect(b.minOrderBumpAgorot).toBe(0);
    expect(b.lines.some((l) => l.key === "minOrder")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe("rounding", () => {
  it("rounds up to five shekels by default, so 187.43 never reaches a screen", () => {
    const b = computePrice(input({ printTypeKey: "relief", deliveryMethod: "shipping" }), makeConfig());
    expect(b.totalAgorot % 500).toBe(0);
    expect(b.roundingAgorot).toBeGreaterThanOrEqual(0);
  });

  it("rounds to the nearest step when told to", () => {
    const up = computePrice(input({ printTypeKey: "lithophane" }), makeConfig());
    const near = computePrice(
      input({ printTypeKey: "lithophane" }),
      makeConfig({ roundingMode: "nearest" }),
    );
    expect(up.totalAgorot).toBe(12500);
    expect(near.totalAgorot).toBe(12500);
    expect(near.subtotalAgorot).toBe(12274);
  });

  it("leaves an exact multiple alone", () => {
    const b = computePrice(input(), makeConfig({ roundToAgorot: 1 }));
    expect(b.roundingAgorot).toBe(0);
    expect(b.totalAgorot).toBe(b.subtotalAgorot);
  });

  it("takes ten agorot off when the charm ending is switched on", () => {
    const plain = computePrice(input({ printTypeKey: "lithophane" }), makeConfig());
    const charm = computePrice(
      input({ printTypeKey: "lithophane" }),
      makeConfig({ charmEnding: true }),
    );
    expect(charm.totalAgorot).toBe(plain.totalAgorot - 10);
  });

  it("never lets the charm ending drop an order under the minimum", () => {
    const cfg = makeConfig({ charmEnding: true, minOrderAgorot: 20000 });
    const b = computePrice(input({ printTypeKey: "keychain", sizeKey: "s" }), cfg);
    expect(b.totalAgorot).toBeGreaterThanOrEqual(20000);
  });
});

/* ------------------------------------------------------------------ */

describe("surcharge rules", () => {
  const rules: RuleLite[] = [
    {
      id: "r-oversize",
      labelHe: "לוח גדול במיוחד",
      trigger: { kind: "autoOversize", minLongestEdgeMm: 250, amountAgorot: 1500 },
      appliesToAll: true,
      printTypeKeys: [],
      sortOrder: 1,
      active: true,
    },
    {
      id: "r-colorcount",
      labelHe: "הרבה החלפות צבע",
      trigger: { kind: "autoColorCount", minColors: 5, amountAgorot: 400 },
      appliesToAll: true,
      printTypeKeys: [],
      sortOrder: 2,
      active: true,
    },
    {
      id: "r-gift",
      labelHe: "אריזת מתנה",
      trigger: { kind: "optionalAddon", mode: "flat", amountAgorot: 1200, percentBp: 0 },
      appliesToAll: true,
      printTypeKeys: [],
      sortOrder: 3,
      active: true,
    },
    {
      id: "r-stand",
      labelHe: "מעמד",
      trigger: { kind: "optionalAddon", mode: "perUnit", amountAgorot: 500, percentBp: 0 },
      appliesToAll: true,
      printTypeKeys: [],
      sortOrder: 4,
      active: true,
    },
    {
      id: "r-polish",
      labelHe: "ליטוש ידני",
      trigger: { kind: "optionalAddon", mode: "percent", amountAgorot: 0, percentBp: 1000 },
      appliesToAll: false,
      printTypeKeys: ["standee"],
      sortOrder: 5,
      active: true,
    },
  ];

  it("fires an oversize rule on the large framed panel and not on the small one", () => {
    const cfg = makeConfig({}, { rules });
    const big = computePrice(input({ printTypeKey: "framed", sizeKey: "l" }), cfg);
    const small = computePrice(input({ printTypeKey: "framed", sizeKey: "s" }), cfg);
    expect(big.addons.some((a) => a.ruleId === "r-oversize")).toBe(true);
    expect(small.addons.some((a) => a.ruleId === "r-oversize")).toBe(false);
  });

  it("fires a colour count rule from the fifth colour", () => {
    const cfg = makeConfig({}, { rules });
    const five = computePrice(
      input({
        printTypeKey: "framed",
        sizeKey: "s",
        colorIds: ["c-red", "c-turq", "c-yellow", "c-white", "c-blue"],
      }),
      cfg,
    );
    expect(five.addons.find((a) => a.ruleId === "r-colorcount")?.amountAgorot).toBe(400);
  });

  it("adds a flat addon once per order and a per unit addon per unit", () => {
    const cfg = makeConfig({}, { rules });
    const b = computePrice(
      input({ printTypeKey: "magnet", quantity: 4, addonRuleIds: ["r-gift", "r-stand"] }),
      cfg,
    );
    expect(b.lines.find((l) => l.id === "r-gift")?.amountAgorot).toBe(1200);
    expect(b.lines.find((l) => l.id === "r-stand")?.amountAgorot).toBe(2000);
  });

  it("ignores an addon that does not apply to this print type", () => {
    const cfg = makeConfig({}, { rules });
    const b = computePrice(input({ printTypeKey: "magnet", addonRuleIds: ["r-polish"] }), cfg);
    expect(b.addons.some((a) => a.ruleId === "r-polish")).toBe(false);
  });

  it("takes a percentage addon off the unit before addons", () => {
    const cfg = makeConfig({}, { rules });
    const plain = computePrice(input({ printTypeKey: "standee" }), cfg);
    const polished = computePrice(
      input({ printTypeKey: "standee", addonRuleIds: ["r-polish"] }),
      cfg,
    );
    expect(polished.unitAgorot - plain.unitAgorot).toBe(Math.round(plain.unitAgorot / 10));
  });

  it("ignores an addon rule the visitor did not tick", () => {
    const cfg = makeConfig({}, { rules });
    const b = computePrice(input({ printTypeKey: "magnet" }), cfg);
    expect(b.addons.some((a) => a.ruleId === "r-gift")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe("unknown catalogue entries", () => {
  it("refuses an unknown print type", () => {
    expect(() => computePrice(input({ printTypeKey: "hologram" }), makeConfig())).toThrow(
      "לא מצאתי את סוג ההדפסה הזה",
    );
  });

  it("refuses an unknown size", () => {
    expect(() => computePrice(input({ sizeKey: "xxl" }), makeConfig())).toThrow(
      "לא מצאתי את הגודל הזה",
    );
  });

  it("refuses an unknown material", () => {
    expect(() => computePrice(input({ materialKey: "titanium" }), makeConfig())).toThrow(
      "לא מצאתי את החומר הזה",
    );
  });

  it("prices a draft that has not chosen a material yet", () => {
    const b = computePrice(input({ materialKey: "" }), makeConfig());
    expect(b.materialMultiplier).toBe(1);
    expect(b.totalAgorot).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */

describe("measured grams and slicer overrides", () => {
  it("lets the slicer number beat the formula", () => {
    const printTypes = PRINT_TYPES.map((p) =>
      p.key !== "lithophane"
        ? p
        : {
            ...p,
            sizes: p.sizes.map((s) =>
              s.key === "m" ? { ...s, gramsOverride: 100, hoursOverride: 6 } : s,
            ),
          },
    );
    const b = computePrice(
      input({ printTypeKey: "lithophane", sizeKey: "m" }),
      makeConfig({}, { printTypes }),
    );
    expect(b.grams).toBe(100);
    expect(b.hours).toBe(6);
  });

  it("lets the real mesh weight from the preview beat both", () => {
    const cfg = makeConfig();
    const estimated = computePrice(input({ printTypeKey: "lithophane", sizeKey: "m" }), cfg);
    const measured = computePrice(
      input({ printTypeKey: "lithophane", sizeKey: "m", measuredGrams: 90 }),
      cfg,
    );
    expect(estimated.grams).toBe(60);
    expect(measured.grams).toBe(90);
    expect(measured.totalAgorot).toBeGreaterThan(estimated.totalAgorot);
    expect(measured.totalAgorot).toBe(13000);
  });
});

/* ------------------------------------------------------------------ */

describe("fromPrice, the number on the print type card", () => {
  it("returns 105 ש״ח for the lithophane, not the 45 of its base price", () => {
    const cfg = makeConfig();
    const result = fromPrice("lithophane", cfg);
    expect(result).not.toBeNull();
    expect(result?.ils).toBe(105);
    expect(result?.sizeKey).toBe("s");
    expect(result?.ils).not.toBe(agorotToIls(4500));
  });

  it("returns 45 ש״ח for the keychain", () => {
    expect(fromPrice("keychain", makeConfig())?.ils).toBe(45);
  });

  it("accepts the record as well as the key", () => {
    const cfg = makeConfig();
    const byKey = fromPrice("framed", cfg);
    const byRecord = fromPrice(PRINT_TYPES[6], cfg);
    expect(byRecord?.agorot).toBe(byKey?.agorot);
  });

  it("prices every one of the seven types above the minimum order", () => {
    const cfg = makeConfig();
    for (const pt of PRINT_TYPES) {
      const result = fromPrice(pt.key, cfg);
      expect(result).not.toBeNull();
      expect(result!.agorot).toBeGreaterThanOrEqual(cfg.config.minOrderAgorot);
    }
  });

  it("is the cheapest configuration, never dearer than a real quote of the same type", () => {
    const cfg = makeConfig();
    for (const pt of PRINT_TYPES) {
      const from = fromPrice(pt.key, cfg)!;
      const mid = computePrice(input({ printTypeKey: pt.key, sizeKey: "m" }), cfg);
      expect(from.agorot).toBeLessThanOrEqual(mid.totalAgorot);
    }
  });

  it("skips a size that is switched off", () => {
    const printTypes = PRINT_TYPES.map((p) =>
      p.key !== "lithophane"
        ? p
        : { ...p, sizes: p.sizes.map((s) => (s.key === "s" ? { ...s, active: false } : s)) },
    );
    const result = fromPrice("lithophane", makeConfig({}, { printTypes }));
    expect(result?.sizeKey).toBe("m");
    expect(result?.ils).toBe(125);
  });

  it("returns nothing for a type that has no active size or does not exist", () => {
    const printTypes = PRINT_TYPES.map((p) =>
      p.key !== "magnet" ? p : { ...p, sizes: p.sizes.map((s) => ({ ...s, active: false })) },
    );
    expect(fromPrice("magnet", makeConfig({}, { printTypes }))).toBeNull();
    expect(fromPrice("hologram", makeConfig())).toBeNull();
  });

  it("falls back to shipping when collection is switched off", () => {
    const result = fromPrice("keychain", makeConfig({ pickupEnabled: false }));
    expect(result?.breakdown.deliveryMethod).toBe("shipping");
  });
});

/* ------------------------------------------------------------------ */

describe("guards", () => {
  it("passes the settings the site ships with", () => {
    const report = assertConfigSane(makeConfig());
    expect(report.errors).toEqual([]);
    expect(() => assertConfigOrThrow(makeConfig())).not.toThrow();
  });

  it("prices all six canonical samples with the shipped settings", () => {
    const cfg = makeConfig();
    for (const sample of SAMPLE_INPUTS) {
      const b = computePrice(sample, cfg);
      expect(b.totalAgorot).toBeGreaterThan(0);
      expect(b.minOrderBumpAgorot).toBe(0);
    }
    expect(SAMPLE_INPUTS).toHaveLength(6);
  });

  const rejects: [string, () => PriceEngineConfig, string][] = [
    [
      "a base price under five shekels",
      () =>
        makeConfig({}, {
          printTypes: PRINT_TYPES.map((p) =>
            p.key === "magnet" ? { ...p, basePriceAgorot: 400 } : p,
          ),
        }),
      "מחיר בסיס חייב להיות לפחות 5 ש״ח",
    ],
    [
      "a base price over five thousand shekels",
      () =>
        makeConfig({}, {
          printTypes: PRINT_TYPES.map((p) =>
            p.key === "magnet" ? { ...p, basePriceAgorot: 600000 } : p,
          ),
        }),
      "מחיר בסיס עד 5,000 ש״ח",
    ],
    [
      "a size multiplier outside the range",
      () =>
        makeConfig({}, {
          printTypes: PRINT_TYPES.map((p) =>
            p.key === "magnet"
              ? { ...p, sizes: p.sizes.map((s) => ({ ...s, multiplier: 12 })) }
              : p,
          ),
        }),
      "מכפיל גודל חייב להיות בין 0.2 ל-10",
    ],
    [
      "a print type with no active size",
      () =>
        makeConfig({}, {
          printTypes: PRINT_TYPES.map((p) =>
            p.key === "magnet"
              ? { ...p, sizes: p.sizes.map((s) => ({ ...s, active: false })) }
              : p,
          ),
        }),
      "צריך לפחות גודל אחד פעיל",
    ],
    [
      "a material multiplier outside the range",
      () =>
        makeConfig({}, {
          materials: MATERIALS.map((m) =>
            m.key === "premium" ? { ...m, priceMultiplier: 4 } : m,
          ),
        }),
      "תוספת חומר חייבת להיות בין -50% ל-200%",
    ],
    [
      "a discount over forty percent",
      () =>
        makeConfig({}, {
          tiers: TIERS.map((t) => (t.id === "t10" ? { ...t, discountBp: 5000 } : t)),
        }),
      "הנחה מקסימלית 40%",
    ],
    [
      "two tiers starting at the same quantity",
      () =>
        makeConfig({}, {
          tiers: TIERS.map((t) => (t.id === "t5" ? { ...t, minQty: 3 } : t)),
        }),
      "כל מדרגה חייבת להתחיל בכמות גדולה יותר",
    ],
    [
      "a discount that falls as the quantity rises",
      () =>
        makeConfig({}, {
          tiers: TIERS.map((t) => (t.id === "t10" ? { ...t, discountBp: 300 } : t)),
        }),
      "הנחה לא יכולה לרדת כשהכמות עולה",
    ],
    [
      "a minimum order under ten shekels",
      () => makeConfig({ minOrderAgorot: 500 }),
      "הזמנה מינימלית לפחות 10 ש״ח",
    ],
    [
      "a rounding step that is not one of the options",
      () => makeConfig({ roundToAgorot: 37 }),
      "אפשרות העיגול חייבת להיות אחת מהאפשרויות הקיימות",
    ],
    [
      "a rush fee over one hundred percent",
      () => makeConfig({ rushPercentBp: 12000 }),
      "תוספת דחוף עד 100%",
    ],
    [
      "a rush ceiling under the rush floor",
      () => makeConfig({ rushFeeMinAgorot: 8000, rushFeeMaxAgorot: 2000 }),
      "תקרת הדחיפות חייבת להיות גבוהה מהמינימום",
    ],
    [
      "a free shipping threshold under the shipping price",
      () => makeConfig({ freeShippingThresholdAgorot: 1000 }),
      "סף משלוח חינם חייב להיות גבוה ממחיר המשלוח",
    ],
    [
      "an extra colour over two hundred shekels",
      () => makeConfig({ extraColorAgorot: 25000 }),
      "תוספת לצבע עד 200 ש״ח",
    ],
    [
      "a margin under one, which sells under cost",
      () => makeConfig({ marginMultiplierBp: 9000 }),
      "מכפיל הרווח לא יכול לרדת מתחת ל-1",
    ],
    [
      "filament that costs nothing per gram",
      () => makeConfig({ filamentCostPerGramAgorot: 0 }),
      "עלות הפילמנט לגרם חייבת להיות גדולה מאפס",
    ],
    [
      "a machine hour that costs nothing",
      () => makeConfig({ machineRatePerHourAgorot: 0 }),
      "עלות שעת המכונה חייבת להיות גדולה מאפס",
    ],
    [
      "a lead time of zero days",
      () => makeConfig({ leadTimeDays: 0 }),
      "זמן האספקה חייב להיות לפחות יום אחד",
    ],
    [
      "money that is not whole agorot",
      () => makeConfig({ shippingFlatAgorot: 25.5 }),
      "כל סכום חייב להיות מספר שלם באגורות",
    ],
    [
      "a complexity outside the range",
      () =>
        makeConfig({}, {
          printTypes: PRINT_TYPES.map((p) =>
            p.key === "magnet" ? { ...p, complexity: 9 } : p,
          ),
        }),
      "מקדם המורכבות חייב להיות בין 0.5 ל-3",
    ],
    [
      "a volume exponent outside the range",
      () =>
        makeConfig({}, {
          printTypes: PRINT_TYPES.map((p) =>
            p.key === "magnet" ? { ...p, volumeExponent: 9 } : p,
          ),
        }),
      "מעריך הנפח חייב להיות בין 1 ל-4",
    ],
    [
      "a reference weight of zero",
      () =>
        makeConfig({}, {
          printTypes: PRINT_TYPES.map((p) => (p.key === "magnet" ? { ...p, refGrams: 0 } : p)),
        }),
      "משקל הייחוס חייב להיות גדול מאפס",
    ],
  ];

  for (const [name, build, message] of rejects) {
    it(`rejects ${name}`, () => {
      const cfg = build();
      const report = assertConfigSane(cfg);
      expect(report.errors.map((e) => e.messageHe)).toContain(message);
      expect(() => assertConfigOrThrow(cfg)).toThrow(PriceConfigError);
    });
  }

  it("names the offending field in Hebrew when it throws", () => {
    try {
      assertConfigOrThrow(makeConfig({ minOrderAgorot: 500 }));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PriceConfigError);
      const error = e as PriceConfigError;
      expect(error.message).toContain("הזמנה מינימלית");
      expect(error.issues[0].field).toBe("config.minOrderAgorot");
      expect(error.issues[0].severity).toBe("error");
    }
  });

  it("catches a minimum order that quietly props up every sample", () => {
    const report = assertConfigSane(makeConfig({ minOrderAgorot: 60000 }));
    expect(
      report.errors.some((e) => e.messageHe.includes("יוצאת מתחת למינימום")),
    ).toBe(true);
  });

  it("catches settings that turn a keychain into a four thousand shekel order", () => {
    const report = assertConfigSane(makeConfig({ maxPlausibleTotalAgorot: 20000 }));
    expect(report.errors.some((e) => e.messageHe.includes("משהו כאן לא נכון"))).toBe(true);
  });

  it("warns rather than blocks when rush is on and adds nothing", () => {
    const report = assertConfigSane(makeConfig({ rushPercentBp: 0 }));
    expect(report.errors).toEqual([]);
    expect(report.warnings.map((w) => w.messageHe)).toContain(
      "דחוף מופעל אבל לא מוסיף כלום.",
    );
  });

  it("warns when nobody could ever pay for an extra colour", () => {
    const report = assertConfigSane(makeConfig({ freeColorCount: 12 }));
    expect(report.warnings.map((w) => w.messageHe)).toContain(
      "אף אחד לא ישלם על צבעים נוספים בהגדרה הזאת.",
    );
  });

  it("collects every failure rather than stopping at the first", () => {
    const report = assertConfigSane(
      makeConfig({ minOrderAgorot: 500, roundToAgorot: 37, rushPercentBp: 12000 }),
    );
    expect(report.errors.length).toBeGreaterThanOrEqual(3);
  });
});
