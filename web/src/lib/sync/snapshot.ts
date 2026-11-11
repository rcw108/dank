import { z } from "zod";

// What the dank-sync WordPress plugin sends for one user (see snapshot() in
// wordpress/dank-sync/dank-sync.php).

// PHP encodes an empty array as [], not {}.
const objectish = z.preprocess(
  (value) => (Array.isArray(value) && value.length === 0 ? {} : value),
  z.record(z.string(), z.unknown()),
);

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
  meta: objectish.default({}),
  acf: objectish.default({}),
  sent_at: z.coerce.number().int(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

export const syncRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({
    type: z.literal("snapshots"),
    snapshots: z.array(snapshotSchema).min(1).max(50),
  }),
]);
