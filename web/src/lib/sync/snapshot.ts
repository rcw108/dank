import { z } from "zod";

// What the dank-sync WordPress plugin sends for one user (see snapshot() in
// wordpress/dank-sync/dank-sync.php and run() in includes/account.php).
// The account figures are calculated by the site's own account page code, so
// the app stores and shows them as they are.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().finite();

const rowSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("deposit"),
    date: isoDate,
    amount: money,
    present_capital: money,
    muted: z.boolean(),
    note: z.string().nullable(),
  }),
  z.object({
    type: z.literal("withdrawal"),
    date: isoDate,
    amount: money,
    note: z.string().nullable(),
  }),
  z.object({
    type: z.literal("terms"),
    date: isoDate,
    rate: z.string(),
    direction: z.enum(["upgrade", "downgrade"]).nullable(),
  }),
]);

const referralSchema = z.object({
  has_referrals: z.boolean(),
  with_returns: z.boolean(),
  investors: z.array(
    z.object({
      name: z.string(),
      bonuses: z.array(
        z.object({ amount: money, date: isoDate, returned: money.nullable() }),
      ),
    }),
  ),
  total_bonus: money,
  total_returned: money.nullable(),
});

export const accountSchema = z.object({
  /** "Today" in Mexico City, the date the page calculates up to. */
  as_of: isoDate,
  current_capital: money,
  /** As printed, e.g. "9.38%"; empty when the investor has no terms yet. */
  net_annualized_return: z.string(),
  return_note: z.string().nullable(),
  interest_received: money,
  total_invested: money,
  total_withdrawn: money,
  rows: z.array(rowSchema),
  referral: referralSchema.nullable(),
});

const profileSchema = z.object({
  appeal: z.string(),
  phone: z.string(),
  company_name: z.string(),
  theme: z.enum(["dark", "light"]),
});

export const snapshotSchema = z.object({
  wp_user_id: z.coerce.number().int().positive(),
  email: z.string(),
  login: z.string().optional(),
  first_name: z.string().default(""),
  last_name: z.string().default(""),
  display_name: z.string().default(""),
  roles: z.array(z.string()).default([]),
  is_investor: z.boolean(),
  deleted: z.boolean().default(false),
  profile: profileSchema.nullable().default(null),
  /** Null when WordPress could not calculate it (see account_error). */
  account: accountSchema.nullable().default(null),
  account_error: z.string().nullable().default(null),
  sent_at: z.coerce.number().int(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;
export type AccountSnapshot = z.infer<typeof accountSchema>;

export const syncRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({
    type: z.literal("snapshots"),
    snapshots: z.array(snapshotSchema).min(1).max(50),
  }),
]);
