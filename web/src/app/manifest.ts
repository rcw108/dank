import type { MetadataRoute } from "next";

/**
 * Makes the app installable ("Add to Home Screen" / "Install app") with the
 * DANK Capital logo and the site's navy, and opens it full screen like a
 * native app. Icons come from scripts/make-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DANK Capital",
    short_name: "DANK Capital",
    description:
      "Your DANK Capital investor account: capital, returns, operations and withdrawals.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d232b",
    theme_color: "#0d232b",
    lang: "en",
    categories: ["finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
