/**
 * src/components/generator/session.ts
 *
 * The visitor's only identity, per doc 06 §1003 and RESOLUTIONS §ב.3: a uuid v4 in
 * `localStorage`. It is a capability, not a login. Knowing it grants access to one
 * draft, which holds a photo that browser uploaded and a price it already saw.
 *
 * **It has to be a real uuid v4.** `convex/drafts.ts` runs every session key through
 * `assertSessionKey`, which is a strict uuid regex, and rejects anything else with
 * `BAD_SESSION`. `src/components/contact/sessionKey.ts` falls back to a `s-…` string
 * when `crypto.randomUUID` is missing, which the contact mutation accepts and the
 * generator's mutations do not. So the same storage key is read here, validated, and
 * replaced with a conforming value when what is stored cannot be used. The contact
 * form accepts any string, so upgrading the value costs it nothing.
 */

/** The same key `src/components/contact/sessionKey.ts` uses. One visitor, one id. */
const STORAGE_KEY = "shai.session.v1";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isSessionKey(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * A uuid v4, from `crypto.randomUUID` where it exists and from `getRandomValues`
 * where it does not. Safari before 15.4 and a few Android webviews ship the second
 * without the first, and both are common in an Instagram in-app browser.
 */
export function randomSessionKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  // version 4, variant 10xx
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) hex.push(bytes[i].toString(16).padStart(2, "0"));
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

/**
 * Reads the stored key, creating or upgrading it when needed.
 *
 * Every access is wrapped. An in-app webview with site data blocked throws on
 * `localStorage` itself, and a generator that refuses to run because storage is
 * disabled is a far worse failure than one whose draft does not survive a reload.
 */
export function readSessionKey(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (isSessionKey(existing)) return existing;
    const created = randomSessionKey();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return randomSessionKey();
  }
}
