/**
 * The panel's navigation, 06 §C.3, in the order and the wording that section
 * fixes. The sidebar, the phone tab bar and the "עוד" sheet all read this list,
 * so a screen cannot exist in one and be missing from another.
 */

export type NavBadge = "leads" | "messages" | null;

export type NavItem = {
  href: string;
  labelHe: string;
  /** the glyph on the phone tab bar. no emoji: these are typographic marks */
  glyph: string;
  badge?: NavBadge;
  /** indented under a group heading in the sidebar */
  sub?: boolean;
};

export type NavGroup = {
  labelHe?: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    items: [
      { href: "/admin", labelHe: "לוח בקרה", glyph: "◧" },
      { href: "/admin/leads", labelHe: "פניות והזמנות", glyph: "◆", badge: "leads" },
      { href: "/admin/drafts", labelHe: "תצורות שנעזבו", glyph: "◇" },
      { href: "/admin/messages", labelHe: "הודעות", glyph: "✉︎", badge: "messages" },
    ],
  },
  {
    items: [
      { href: "/admin/products", labelHe: "מוצרים", glyph: "▣" },
      { href: "/admin/gallery", labelHe: "גלריה", glyph: "▦" },
    ],
  },
  {
    labelHe: "המחולל",
    items: [
      { href: "/admin/print-types", labelHe: "סוגי הדפסה", glyph: "▤", sub: true },
      { href: "/admin/colors", labelHe: "צבעי חוט", glyph: "●", sub: true },
      { href: "/admin/pricing", labelHe: "מחירים", glyph: "₪" },
    ],
  },
  {
    items: [
      { href: "/admin/home", labelHe: "דף הבית", glyph: "⌂" },
      { href: "/admin/about", labelHe: "הסיפור שלי", glyph: "❝︎" },
    ],
  },
  {
    items: [{ href: "/admin/settings", labelHe: "הגדרות", glyph: "⚙︎" }],
  },
];

/** The five that fit a thumb. The fifth opens the rest as a sheet. */
export const TAB_ITEMS: NavItem[] = [
  { href: "/admin", labelHe: "לוח בקרה", glyph: "◧" },
  { href: "/admin/leads", labelHe: "פניות", glyph: "◆", badge: "leads" },
  { href: "/admin/products", labelHe: "מוצרים", glyph: "▣" },
  { href: "/admin/pricing", labelHe: "מחירים", glyph: "₪" },
];

export function isCurrent(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
