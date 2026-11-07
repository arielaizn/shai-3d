import * as React from "react";

import { CONTACT } from "@/content/contact";

/**
 * The top of the page, 09c §9.1.
 *
 * `כותבים לי` replaced `בואו נדבר` because `בואו` is a direct imperative, which the
 * copy law bans outright. What is left is the plainest sentence on the site and it
 * is doing the whole job: it says what happens here in two words, and the line under
 * it ranks the two options before the visitor has to choose between them.
 *
 * No mark, no eyebrow, no image. Doc 03 §8 puts the LCP element on the `h1` for
 * mobile, and this page's job is to be usable in the second after it paints, on a
 * phone, in a webview, over 4G.
 */

export function ContactHero() {
  return (
    <div className="flex flex-col gap-4 [min-inline-size:0]">
      <h1
        className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "clamp(2.25rem, 1.37rem + 3.6vw, 4.25rem)",
          fontWeight: 800,
          lineHeight: 0.96,
          color: "var(--color-text-primary)",
          maxInlineSize: "16ch",
        }}
      >
        {CONTACT.hero.heading}
      </h1>

      <p
        className="text-balance [min-inline-size:0]"
        style={{
          fontFamily: "var(--font-assistant), system-ui, sans-serif",
          fontSize: "1.125rem",
          lineHeight: 1.7,
          color: "var(--color-text-secondary)",
          maxInlineSize: "40ch",
        }}
      >
        {CONTACT.hero.sub}
      </p>
    </div>
  );
}
