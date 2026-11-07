/**
 * src/components/contact/sessionKey.ts
 *
 * The only identity a visitor has, per doc 06 §1003: a uuid v4 in `localStorage`.
 *
 * `contact.send` is rate limited to three messages per hour per session and sixty
 * globally, and without a key every browser is the same "anonymous" bucket, which
 * would let one bored person lock the form for the whole country. Sending a stable
 * key keeps the limit on the person who is actually sending.
 *
 * It is written from a client effect, never during render: `localStorage` does not
 * exist on the server, and a value read during render would differ between the
 * server HTML and the first client paint.
 *
 * [The generator will need the same key for `drafts.*`. When it lands, this belongs
 * in `src/lib/session.ts` and both callers read it from there. It is kept local for
 * now so two agents do not create the same module twice with two different keys.]
 */

const STORAGE_KEY = "shai.session.v1";

function randomKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  // Safari before 15.4 and every webview that blocks the crypto API. The value only
  // has to be unlikely to collide, not unguessable: it buys a rate limit bucket.
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Reads the stored key, creating one on first use. Every access is wrapped: an
 * in-app webview with site data blocked throws on `localStorage` itself, and a form
 * that cannot be submitted because storage is disabled is a worse failure than a
 * visitor who shares the anonymous rate limit bucket.
 */
export function readSessionKey(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (typeof existing === "string" && existing.length > 0) return existing;
    const created = randomKey();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return randomKey();
  }
}
