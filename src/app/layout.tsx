import type { Metadata, Viewport } from "next";
import { rubik, assistant } from "@/lib/fonts";
import { META_SITE } from "@/content/meta";
import { siteUrl } from "@/lib/whatsapp";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  /**
   * One origin for the whole site. `src/lib/whatsapp.ts` already owns
   * `NEXT_PUBLIC_SITE_URL` and its fallback for the offer links it writes into every
   * WhatsApp message, so the canonical reads the same value instead of carrying a
   * second, different placeholder. The real domain is still an env var away.
   */
  metadataBase: new URL(siteUrl("/")),
  /**
   * 09d §A.0: the brand suffix sits last after a `|`, and `·` is for OG titles only,
   * never for a title tag. Both strings come from `src/content/meta.ts` so the rule is
   * enforced in the one place the copy lives.
   */
  title: { default: META_SITE.defaultTitle, template: META_SITE.titleTemplate },
  description: "שולחים לי תמונה, ואני מדפיס אותה. הדפסות תלת ממד בהזמנה אישית.",
};

export const viewport: Viewport = {
  themeColor: "#FFF7EC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${assistant.variable}`}>
      {/* The chrome of doc 03 §2 lives in the layout so every route gets it. Each page
          owns its own <main id="main-content">, which is the skip link's target and the
          element MobileNav marks inert while the sheet is open. */}
      <body className="bg-cream-100 text-ink-900 antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
