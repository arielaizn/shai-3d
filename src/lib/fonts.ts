import { Rubik, Assistant } from "next/font/google";

// variable fonts: weight is omitted on purpose so the whole wght range ships in one file
export const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  style: ["normal"],          // never italic: Hebrew has no true italic
  variable: "--font-rubik",
  display: "swap",
  preload: true,
  adjustFontFallback: false,  // auto metrics are computed from Latin and squash the Hebrew
  fallback: ["Rubik Fallback"],
});

export const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  style: ["normal"],
  variable: "--font-assistant",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
  fallback: ["Assistant Fallback"],
});
