import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildWaMessage,
  buildWaMessageDetailed,
  buildWaUrl,
  isMobileUserAgent,
  iso,
  MAX_MESSAGE_CHARS,
  MAX_URL_CHARS,
  visibleLength,
  waNumberDigits,
  waNumberDisplay,
  waNumberE164,
  type WaGeneratorConfig,
} from "./whatsapp";

const RLM_CHAR = "\u200F";
const FSI_CHAR = "\u2068";
const PDI_CHAR = "\u2069";
const BIDI = /[\u200E\u200F\u2066-\u2069]/g;

/** What a person reads in the composer, with the invisible direction marks removed. */
const plain = (text: string) => text.replace(BIDI, "");

const SITE = "https://shai-print.vercel.app";

const FULL: WaGeneratorConfig = {
  kind: "generator",
  printTypeNameHe: "דמות עומדת למדף",
  sizeLabelHe: "12 ס״מ גובה",
  colorNames: ["אדום סוכריה", "טורקיז", "צהוב", "שחור", "לבן חלבי", "אפור"],
  quantity: 3,
  delivery: "pickup",
  rush: true,
  neededByHe: "20.09",
  totalIls: 405,
  code: "8QT4M2K7XW",
  noteHe: "זה למסיבת סיום של הכיתה, אם אפשר בלי הרקע",
  siteBaseUrl: SITE,
};

const MINIMAL: WaGeneratorConfig = {
  kind: "generator",
  printTypeNameHe: "ליתופן",
  sizeLabelHe: "10x15 ס״מ",
  colorNames: ["לבן חלבי"],
  quantity: 1,
  delivery: "shipping",
  totalIls: 150,
  code: "K7M2QW9XT4",
  siteBaseUrl: SITE,
};

describe("the number", () => {
  it("assembles the three forms it is allowed to produce", () => {
    expect(waNumberDigits()).toBe(["972", "58", "584", "5083"].join(""));
    expect(waNumberE164()).toBe("+" + waNumberDigits());
    expect(waNumberDisplay()).toBe(["058", "584", "5083"].join("-"));
  });

  it("never sits in the module source as a contiguous literal", () => {
    // DECISIONS.md: harvesters lift a phone number out of served HTML and out of a public
    // repository just as cheaply. If this assertion ever fails, somebody pasted the
    // number back in and the assembly is decoration.
    const source = readFileSync(fileURLToPath(new URL("./whatsapp.ts", import.meta.url)), "utf8");
    const digits = waNumberDigits();
    const forms = [digits, "+" + digits, waNumberDisplay(), "0" + digits.slice(3)];
    for (const form of forms) {
      expect(source).not.toContain(form);
    }
  });
});

describe("buildWaMessage · the generator handoff", () => {
  it("writes every field of a full configuration, in the order 09c §7.2 fixes", () => {
    expect(plain(buildWaMessage(FULL))).toBe(
      [
        "היי שי, בניתי הזמנה באתר.",
        "",
        "מה: דמות עומדת למדף",
        "גודל: 12 ס״מ גובה",
        "צבעים: אדום סוכריה, טורקיז, צהוב, שחור, לבן חלבי, אפור",
        "כמות: 3",
        "מסירה: איסוף עצמי",
        "עד מתי: 20.09",
        "מחיר באתר: 405 שקל",
        "",
        "הקישור עם התמונה והדגם:",
        SITE + "/o/8QT4M2K7XW",
        "קוד: 8QT4M2K7XW",
        "",
        "הערה: זה למסיבת סיום של הכיתה, אם אפשר בלי הרקע",
        "",
        "אשמח לדעת אם זה מסתדר ומתי אפשר לקבל.",
      ].join("\n"),
    );
  });

  it("drops the rush line and the note line from a minimal configuration", () => {
    expect(plain(buildWaMessage(MINIMAL))).toBe(
      [
        "היי שי, בניתי הזמנה באתר.",
        "",
        "מה: ליתופן",
        "גודל: 10x15 ס״מ",
        "צבעים: לבן חלבי",
        "כמות: 1",
        "מסירה: משלוח",
        "מחיר באתר: 150 שקל",
        "",
        "הקישור עם התמונה והדגם:",
        SITE + "/o/K7M2QW9XT4",
        "קוד: K7M2QW9XT4",
        "",
        "אשמח לדעת אם זה מסתדר ומתי אפשר לקבל.",
      ].join("\n"),
    );
  });

  it("writes the price as a bare number followed by שקל, never a shekel sign", () => {
    const text = plain(buildWaMessage(MINIMAL));
    expect(text).toContain("מחיר באתר: 150 שקל");
    expect(text).not.toContain("₪");
  });

  it("carries the short offer link, which is what makes the handoff work", () => {
    expect(plain(buildWaMessage(MINIMAL))).toContain(SITE + "/o/K7M2QW9XT4");
  });

  it("leaves the rush line out when rush was never opted into", () => {
    const text = plain(buildWaMessage({ ...MINIMAL, neededByHe: "20.09" }));
    expect(text).not.toContain("עד מתי");
  });
});

describe("buildWaMessage · the other surfaces", () => {
  it("writes one price line for a single unit and two for more", () => {
    const one = plain(
      buildWaMessage({
        kind: "product",
        nameHe: "מחזיק מפתחות בהתאמה אישית",
        slug: "custom-keychain",
        quantity: 1,
        unitIls: 45,
        totalIls: 45,
        siteBaseUrl: SITE,
      }),
    );
    expect(one).toContain("מחיר באתר: 45 שקל");
    expect(one).not.toContain("ליחידה");

    const many = plain(
      buildWaMessage({
        kind: "product",
        nameHe: "מחזיק מפתחות בהתאמה אישית",
        slug: "custom-keychain",
        colorNameHe: "אדום סוכריה",
        quantity: 2,
        dimensionsMm: { w: 60, h: 22, d: 4 },
        unitIls: 45,
        totalIls: 90,
        siteBaseUrl: SITE,
      }),
    );
    expect(many).toBe(
      [
        "היי שי, הגעתי מהאתר.",
        "",
        "מעניין אותי: מחזיק מפתחות בהתאמה אישית",
        "קוד דגם: custom-keychain",
        "צבע: אדום סוכריה",
        "כמות: 2",
        "מידות: 60x22x4 מ״מ",
        "מחיר באתר: 45 שקל ליחידה, 90 שקל בסך הכול",
        "",
        "קישור: " + SITE + "/products/custom-keychain",
        "",
        "אשמח לדעת מתי אפשר לקבל.",
      ].join("\n"),
    );
    // Ascii separator: the multiplication sign flips in some WhatsApp builds.
    expect(many).not.toContain("×");
  });

  it("writes the four short surfaces exactly as 09c §7.3 and 09b §13 fix them", () => {
    expect(plain(buildWaMessage({ kind: "generic" }))).toBe(
      "היי שי, הגעתי מהאתר.\nרציתי לשאול על הדפסה.",
    );
    expect(plain(buildWaMessage({ kind: "closing_home" }))).toBe(
      "היי שי, הגעתי מהאתר.\nיש לי רעיון להדפסה ואשמח לשמוע אם אפשר.",
    );
    expect(plain(buildWaMessage({ kind: "about_closing" }))).toBe(
      "היי שי, קראתי את הסיפור שלך באתר.\nיש לי רעיון להדפסה ואשמח לשמוע אם אפשר.",
    );
    expect(plain(buildWaMessage({ kind: "catalog_empty", categoryHe: "משחקים" }))).toBe(
      "היי שי, חיפשתי באתר בקטגוריה משחקים ולא מצאתי.\nאשמח לדעת אם אפשר להדפיס משהו כזה.",
    );
  });
});

describe("bidi", () => {
  it("opens every Hebrew line with an RLM and leaves a bare URL line alone", () => {
    const lines = buildWaMessage(MINIMAL).split("\n");
    for (const line of lines) {
      if (line.length === 0) continue;
      const isHebrewLine = /[\u0590-\u05FF]/.test(line);
      expect(line.startsWith(RLM_CHAR)).toBe(isHebrewLine);
    }
    expect(lines).toContain(SITE + "/o/K7M2QW9XT4");
  });

  it("isolates Latin and numeric runs but leaves Hebrew values alone", () => {
    expect(iso(150)).toBe(FSI_CHAR + "150" + PDI_CHAR);
    expect(iso("K7M2QW9XT4")).toBe(FSI_CHAR + "K7M2QW9XT4" + PDI_CHAR);
    // `10x15 ס״מ` opens on a Latin `x`, so isolating the whole run would flip it.
    expect(iso("10x15 ס״מ")).toBe("10x15 ס״מ");
  });

  it("gives every physical line of a multi line Hebrew note its own RLM", () => {
    const noteHe = "זה מתנה לאמא שלי\nאם אפשר בלי הרקע\nותודה";
    const text = buildWaMessage({ ...MINIMAL, noteHe });
    expect(plain(text)).toContain("הערה: זה מתנה לאמא שלי\nאם אפשר בלי הרקע\nותודה");
    for (const line of ["אם אפשר בלי הרקע", "ותודה"]) {
      expect(text).toContain(RLM_CHAR + line);
    }
  });
});

describe("the length rule", () => {
  it("drops the note first and keeps everything the reply depends on", () => {
    const noteHe = "ל".repeat(700);
    const result = buildWaMessageDetailed({ ...MINIMAL, noteHe });

    expect(result.droppedFields).toEqual(["note"]);
    expect(result.overLimit).toBe(false);
    expect(result.visibleLength).toBeLessThanOrEqual(MAX_MESSAGE_CHARS);
    expect(result.urlLength).toBeLessThanOrEqual(MAX_URL_CHARS);

    const text = plain(result.text);
    expect(text).not.toContain("הערה:");
    expect(text).toContain("מה: ליתופן");
    expect(text).toContain("גודל: 10x15 ס״מ");
    expect(text).toContain("צבעים: לבן חלבי");
    expect(text).toContain("כמות: 1");
    expect(text).toContain("מחיר באתר: 150 שקל");
    expect(text).toContain(SITE + "/o/K7M2QW9XT4");
    expect(text).toContain("קוד: K7M2QW9XT4");
  });

  it("gives up delivery and then rush before it touches anything else", () => {
    const filler = "ל".repeat(520);
    const result = buildWaMessageDetailed({
      ...FULL,
      printTypeNameHe: filler,
      noteHe: "הערה קצרה",
    });

    expect(result.droppedFields).toEqual(["note", "delivery", "rush"]);
    expect(result.overLimit).toBe(true);
    const text = plain(result.text);
    expect(text).not.toContain("הערה:");
    expect(text).not.toContain("מסירה:");
    expect(text).not.toContain("עד מתי:");
    expect(text).toContain("מחיר באתר: 405 שקל");
    expect(text).toContain("קוד: 8QT4M2K7XW");
  });

  it("keeps a normal message far inside both ceilings", () => {
    const result = buildWaMessageDetailed(FULL);
    expect(result.droppedFields).toEqual([]);
    expect(result.visibleLength).toBeLessThanOrEqual(MAX_MESSAGE_CHARS);
    expect(result.urlLength).toBeLessThanOrEqual(MAX_URL_CHARS);
  });

  it("counts the message the way a person counts it", () => {
    expect(visibleLength(RLM_CHAR + "אבג" + FSI_CHAR + "123" + PDI_CHAR)).toBe(6);
  });
});

describe("buildWaUrl", () => {
  const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  const MAC =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

  it("recognises a phone and a desktop", () => {
    expect(isMobileUserAgent(IPHONE)).toBe(true);
    expect(isMobileUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe(true);
    expect(isMobileUserAgent(MAC)).toBe(false);
  });

  it("sends a phone to the app and a desktop to web.whatsapp.com", () => {
    expect(buildWaUrl(MINIMAL, { userAgent: IPHONE })).toContain(
      "https://wa.me/" + waNumberDigits() + "?text=",
    );
    expect(buildWaUrl(MINIMAL, { userAgent: MAC })).toContain(
      "https://web.whatsapp.com/send?phone=" + waNumberDigits() + "&text=",
    );
  });

  it("falls back to the universal wa.me link when no user agent is known", () => {
    // Node 21 and up define `globalThis.navigator` with a `Node.js/22` user agent. If the
    // builder trusted that, every server rendered href would point at web.whatsapp.com.
    expect(typeof navigator).not.toBe("undefined");
    expect(typeof globalThis.window).toBe("undefined");
    expect(buildWaUrl(MINIMAL).startsWith("https://wa.me/")).toBe(true);
  });

  it("encodes with encodeURIComponent, so a space is never a plus", () => {
    const url = buildWaUrl(MINIMAL, { target: "app" });
    const text = decodeURIComponent(url.slice(url.indexOf("?text=") + "?text=".length));
    expect(text).toBe(buildWaMessage(MINIMAL));
    expect(url).not.toContain("+");
  });

  it("produces the same message on the server and on the client", () => {
    // One builder, two callers. This is the assertion that stops the two from drifting.
    expect(
      decodeURIComponent(buildWaUrl(FULL, { target: "web" }).split("&text=")[1]),
    ).toBe(buildWaMessage(FULL));
  });
});
