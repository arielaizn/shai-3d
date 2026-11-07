#!/usr/bin/env node
/**
 * scripts/check-copy.mjs
 *
 * The delivery checks from docs/design/09c-site-copy.md §12, made runnable.
 *
 * 09c writes them as `grep -rn` one liners. A raw grep over a TypeScript file cannot tell
 * a shipping Hebrew string from a key, an import path or a comment, so `grep -rn "!"`
 * fires on `!==` and `grep "בחר "` fires on `נבחרו`. This script does the same checks
 * against the two things that actually reach a reader:
 *
 *   1. every string literal in src/content/ and src/lib/whatsapp.ts, which is the copy
 *   2. the raw file text, for the two rules that must hold everywhere (emoji, em dash)
 *
 * Comments are excluded from the copy rules on purpose: a comment is a note to the next
 * developer, and several of them carry `[אריאל: ...]` questions that are meant to read
 * like questions.
 *
 * Hebrew word boundaries are enforced with lookarounds, so `נבחרו` does not trip the
 * imperative rule and `אמלא` does not trip the `אלא` rule.
 *
 * Usage:  node scripts/check-copy.mjs
 * Exit 0 when every check passes, 1 otherwise.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const COPY_TARGETS = ["src/content", "src/lib/whatsapp.ts"];
const WIDE_TARGETS = ["src", "convex"];

/* ------------------------------------------------------------------ *
 * file walking
 * ------------------------------------------------------------------ */

function walk(target) {
  const abs = join(ROOT, target);
  let stat;
  try {
    stat = statSync(abs);
  } catch {
    return [];
  }
  if (stat.isFile()) return [abs];
  const out = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const next = join(abs, entry.name);
    if (entry.isDirectory()) out.push(...walk(relative(ROOT, next)));
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry.name)) out.push(next);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * a small TypeScript string-literal reader
 *
 * Good enough for content modules: it tracks line and block comments, the three quote
 * kinds, and backslash escapes. It does not try to parse regex literals, which do not
 * appear in a content module.
 * ------------------------------------------------------------------ */

function extractStrings(source) {
  const found = [];
  let line = 1;
  let i = 0;
  const n = source.length;

  const push = (value, startLine) => {
    if (value.length > 0) found.push({ value, line: startLine });
  };

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    if (c === "\n") {
      line += 1;
      i += 1;
      continue;
    }

    if (c === "/" && next === "/") {
      while (i < n && source[i] !== "\n") i += 1;
      continue;
    }

    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") line += 1;
        i += 1;
      }
      i += 2;
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      const startLine = line;
      let value = "";
      i += 1;
      while (i < n) {
        const ch = source[i];
        if (ch === "\\") {
          const escaped = source[i + 1];
          // Keep a written `\n` as a real newline so a multi line body reads as one.
          value += escaped === "n" ? "\n" : escaped;
          i += 2;
          continue;
        }
        if (ch === quote) {
          i += 1;
          break;
        }
        if (ch === "\n") line += 1;
        value += ch;
        i += 1;
      }
      push(value, startLine);
      continue;
    }

    i += 1;
  }

  return found;
}

/* ------------------------------------------------------------------ *
 * the rules
 * ------------------------------------------------------------------ */

const HEB = "\\u0590-\\u05FF";
/** Standalone Hebrew word: no Hebrew letter immediately before or after. */
const word = (w) => new RegExp(`(?<![${HEB}])${w}(?![${HEB}])`, "gu");
const anyOf = (words) => word(`(?:${words.join("|")})`);

const IMPERATIVES = [
  "שלח",
  "שלחו",
  "תשלח",
  "תשלחו",
  "לחץ",
  "לחצו",
  "בחר",
  "בחרו",
  "תבחר",
  "תבחרו",
  "כבו",
  "כבה",
  "הדלק",
  "גרור",
  "גררו",
  "סובב",
  "סובבו",
  "תעלה",
  "תעלו",
  "בואו",
  "החלף",
  "החליפו",
  "צלם",
  "צלמו",
  "תכתוב",
  "תכתבו",
];
// `מלא` is deliberately absent: it is the adjective in `אני אמלא אותה בצבע מלא`
// far more often than it is an order, and a rule that cries wolf gets switched off.

const INFLATED = ["חוויה", "חוויות", "מסע", "מסעות", "פתרונות"];

const RULES = [
  {
    // Was `ela-once`, expecting the single occurrence in the film quote at the foot of
    // `/about`. RESOLUTIONS.md ruling 20 deletes that quote and names this exact check
    // as the consequence to verify: the count is 0 now, and 1 is the failure.
    id: "ela-none",
    title: 'תקבולת שלילית: אפס מופעים של "אלא"',
    scope: "copy",
    pattern: word("אלא"),
    expected: 0,
  },
  {
    id: "no-spaced-dash",
    title: "אין מקף ארוך או קצר מוקף ברווחים",
    scope: "raw",
    pattern: /[ \u00A0][\u2014\u2013][ \u00A0]/gu,
    expected: 0,
  },
  {
    id: "no-imperative",
    title: "אין ציווי ישיר",
    scope: "copy",
    pattern: anyOf(IMPERATIVES),
    expected: 0,
  },
  {
    id: "no-business-plural",
    title: 'אין "אנחנו" ואין "אנו" על העסק',
    scope: "copy",
    pattern: anyOf(["אנחנו", "אנו"]),
    expected: 0,
  },
  {
    id: "no-inflated-nouns",
    title: "אין שמות עצם מנופחים",
    scope: "copy",
    pattern: anyOf(INFLATED),
    expected: 0,
  },
  {
    id: "no-inflated-phrases",
    title: "אין ביטויים מנופחים",
    scope: "copy",
    pattern: /שירות מקצה לקצה|התאמה אישית מלאה/gu,
    expected: 0,
  },
  {
    id: "no-emoji",
    title: "אין אימוג'י",
    scope: "raw",
    pattern: /\p{Extended_Pictographic}/gu,
    expected: 0,
  },
  {
    id: "no-exclamation",
    title: "אין סימן קריאה בקופי",
    scope: "copy",
    pattern: /!/gu,
    expected: 0,
  },
  {
    id: "no-ellipsis",
    title: "אין שלוש נקודות",
    scope: "copy",
    pattern: /\u2026|\.\.\./gu,
    expected: 0,
  },
  {
    id: "no-shekel-sign",
    title: "אין סימן שקל בקופי",
    scope: "copy",
    pattern: /\u20AA/gu,
    expected: 0,
  },
  {
    id: "gershayim",
    title: "קיצורים בגרשיים עבריים U+05F4",
    scope: "copy",
    pattern: /מ"מ|ס"מ|סה"כ|מע"מ|ק"ג/gu,
    expected: 0,
  },
  {
    id: "locked-spelling",
    title: "כתיב נעול: תלת ממד, ליתופן",
    scope: "copy",
    pattern: /תלת מימד|ליטופן/gu,
    expected: 0,
  },
  {
    id: "seven-days",
    title: "מחיקת טיוטות אחרי 7 ימים, לא 45",
    scope: "wide",
    pattern: /45 (?:יום|ימים)/gu,
    expected: 0,
  },
];

/* ------------------------------------------------------------------ *
 * running
 * ------------------------------------------------------------------ */

const copyFiles = COPY_TARGETS.flatMap(walk);
const wideFiles = [...new Set(WIDE_TARGETS.flatMap(walk))];

const sources = new Map();
const read = (file) => {
  if (!sources.has(file)) sources.set(file, readFileSync(file, "utf8"));
  return sources.get(file);
};

const literals = new Map(copyFiles.map((file) => [file, extractStrings(read(file))]));

function hitsInCopy(pattern) {
  const hits = [];
  for (const [file, strings] of literals) {
    for (const { value, line } of strings) {
      pattern.lastIndex = 0;
      for (const match of value.matchAll(pattern)) {
        hits.push({ file, line, text: match[0], context: value.slice(0, 90) });
      }
    }
  }
  return hits;
}

function hitsInRaw(files, pattern) {
  const hits = [];
  for (const file of files) {
    const lines = read(file).split("\n");
    lines.forEach((text, index) => {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        hits.push({ file, line: index + 1, text: match[0], context: text.trim().slice(0, 90) });
      }
    });
  }
  return hits;
}

let failed = 0;
const lines = [];

for (const rule of RULES) {
  const hits =
    rule.scope === "copy"
      ? hitsInCopy(rule.pattern)
      : hitsInRaw(rule.scope === "wide" ? wideFiles : copyFiles, rule.pattern);

  let ok = hits.length === rule.expected;
  if (ok && rule.where) {
    ok = hits.every((hit) => relative(ROOT, hit.file).split("\\").join("/") === rule.where);
  }

  lines.push(
    `${ok ? "PASS" : "FAIL"}  ${rule.id.padEnd(22)} ${String(hits.length).padStart(3)} / ${rule.expected}   ${rule.title}`,
  );

  if (!ok) {
    failed += 1;
    for (const hit of hits.slice(0, 12)) {
      lines.push(`        ${relative(ROOT, hit.file)}:${hit.line}  ${hit.text}   ${hit.context}`);
    }
    if (hits.length > 12) lines.push(`        ... ${hits.length - 12} more`);
  } else if (rule.where && hits.length > 0) {
    for (const hit of hits) {
      lines.push(`        ${relative(ROOT, hit.file)}:${hit.line}  ${hit.context}`);
    }
  }
}

const totalStrings = [...literals.values()].reduce((sum, list) => sum + list.length, 0);

console.log("");
console.log(`check-copy · ${copyFiles.length} copy files, ${totalStrings} string literals`);
console.log("");
console.log(lines.join("\n"));
console.log("");
console.log(failed === 0 ? "all checks passed" : `${failed} checks failed`);

process.exit(failed === 0 ? 0 : 1);
