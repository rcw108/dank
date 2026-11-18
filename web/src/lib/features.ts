/**
 * Features that stay hidden until they are connected and tested.
 *
 * withdrawals — the Withdraw tab, button and screen, and the actions behind
 * them. Hidden until requests reach the site's withdrawal form (Gravity
 * Forms 10) through dank-sync. Turn on with FEATURE_WITHDRAWALS=on in
 * Vercel, e.g. for Preview deployments only while testing.
 *
 * Read on the server only (proxy, Server Components, Server Actions) and
 * passed down as props, so the client never disagrees with the server.
 */
export const features = {
  withdrawals: process.env.FEATURE_WITHDRAWALS === "on",
} as const;
