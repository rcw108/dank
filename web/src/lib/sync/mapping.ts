import type { Snapshot } from "./snapshot";

/**
 * WordPress custom field names → app fields. The first key that has a value
 * wins; ACF fields are checked before plain user meta.
 * TODO(step Ж4): confirm the real keys from Settings → DANK Sync → preview
 * and add the operations mapping. Until then unknown figures stay empty and
 * the app shows "being set up" instead of wrong numbers.
 */
export const FIELD_KEYS = {
  phone: ["phone", "phone_number", "billing_phone", "mobile"],
  appeal: ["appeal", "title", "salutation"],
  currentCapital: ["current_capital", "present_capital", "capital"],
  capitalAsOf: ["capital_as_of", "capital_date"],
  netAnnualizedReturn: [
    "net_annualized_return",
    "annualized_return",
    "return_rate",
  ],
  interestReceived: ["interest_received", "total_interest"],
  totalInvested: ["total_invested", "invested"],
  totalWithdrawn: ["total_withdrawn", "total_withdraw", "withdrawn"],
  minWithdrawBalance: ["min_withdraw_balance", "withdraw_min_balance"],
  cardDailyLimit: ["card_daily_limit", "withdraw_card_limit"],
  theme: ["color_theme", "account_theme", "theme"],
} as const;

type Fields = Record<string, unknown>;

function pick(fields: Fields, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = fields[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/** "$89,384.16", "89384.16", 89384.16 → 89384.16; anything else → null. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

/** Accepts yyyy-mm-dd, yyyymmdd (ACF), dd/mm/yyyy and anything Date can read. */
export function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (/^\d{8}$/.test(v))
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy)
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

function toAppeal(value: unknown): "Mr." | "Ms." | "Mrs." | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/\.$/, "");
  return v === "mr" ? "Mr." : v === "ms" ? "Ms." : v === "mrs" ? "Mrs." : null;
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : typeof value === "number"
      ? String(value)
      : null;
}

/** Builds the argument of public.sync_investor() from a WordPress snapshot. */
export function toInvestorPayload(snapshot: Snapshot, userId: string) {
  const fields: Fields = { ...snapshot.meta, ...snapshot.acf };
  const theme = toText(pick(fields, FIELD_KEYS.theme));

  return {
    user_id: userId,
    wp_user_id: snapshot.wp_user_id,
    email: snapshot.email.toLowerCase(),
    first_name:
      snapshot.first_name || toText(fields.first_name) || snapshot.display_name,
    last_name: snapshot.last_name || toText(fields.last_name) || "",
    appeal: toAppeal(pick(fields, FIELD_KEYS.appeal)),
    phone: toText(pick(fields, FIELD_KEYS.phone)),
    current_capital: toNumber(pick(fields, FIELD_KEYS.currentCapital)),
    capital_as_of: toIsoDate(pick(fields, FIELD_KEYS.capitalAsOf)),
    net_annualized_return: toNumber(
      pick(fields, FIELD_KEYS.netAnnualizedReturn),
    ),
    interest_received: toNumber(pick(fields, FIELD_KEYS.interestReceived)),
    total_invested: toNumber(pick(fields, FIELD_KEYS.totalInvested)),
    total_withdrawn: toNumber(pick(fields, FIELD_KEYS.totalWithdrawn)),
    min_withdraw_balance: toNumber(pick(fields, FIELD_KEYS.minWithdrawBalance)),
    card_daily_limit: toNumber(pick(fields, FIELD_KEYS.cardDailyLimit)),
    theme: theme === "light" || theme === "dark" ? theme : null,
    // Raw data for mapping and diagnostics (already scrubbed by the plugin).
    wp_meta: {
      roles: snapshot.roles,
      meta: snapshot.meta,
      acf: snapshot.acf,
      sent_at: snapshot.sent_at,
    },
    // operations: added in step Ж4 once their storage in WordPress is known.
  };
}
