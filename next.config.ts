import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // HOME is itself a git repo with its own package-lock.json; pin the root so
  // Turbopack never walks up and adopts it.
  turbopack: { root: __dirname },
  // Next 16 blocks chunk requests when dev is browsed over the LAN IP instead of
  // localhost, so the phone gets a blank page without this.
  allowedDevOrigins: ["172.20.10.2", "*.local"],
  images: {
    formats: ["image/avif", "image/webp"],
    // Every product hero, gallery item, filament swatch and admin thumbnail is a
    // Convex _storage URL. Without these patterns next/image throws at RENDER time,
    // which is not a build error, so it would ship and then blank the catalog.
    remotePatterns: [
      { protocol: "https", hostname: "**.convex.cloud", pathname: "/api/storage/**" },
      { protocol: "https", hostname: "**.convex.site" },
    ],
  },
};

export default nextConfig;
