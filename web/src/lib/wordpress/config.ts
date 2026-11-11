import "server-only";

/** Shared with the dank-sync plugin (Settings → DANK Sync → Secret). */
export const WP_SYNC_SECRET = process.env.WP_SYNC_SECRET ?? "";

/** The WordPress site that owns investor accounts. */
export const WORDPRESS_URL = (
  process.env.WORDPRESS_URL ?? "https://dank.capital"
).replace(/\/$/, "");
