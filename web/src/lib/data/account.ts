import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import type { Account, Appeal, Operation, Referral } from "./types";

type InvestorRow = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  appeal: Appeal | null;
  company_name: string | null;
  phone: string | null;
  current_capital: number | null;
  capital_as_of: string | null;
  net_annualized_return: string | null;
  return_note: string | null;
  interest_received: number | null;
  total_invested: number | null;
  total_withdrawn: number | null;
  referral: ReferralJson | null;
  min_withdraw_balance: number;
  card_daily_limit: number;
  synced_at: string | null;
};

type ReferralJson = {
  has_referrals: boolean;
  with_returns: boolean;
  investors: {
    name: string;
    bonuses: { amount: number; date: string; returned: number | null }[];
  }[];
  total_bonus: number;
  total_returned: number | null;
};

type OperationRow = {
  id: number;
  op_date: string;
  type: Operation["type"];
  amount: number | null;
  present_capital: number | null;
  muted: boolean;
  note: string | null;
  rate: string | null;
  direction: "upgrade" | "downgrade" | null;
};

const INVESTOR_COLUMNS =
  "user_id, email, first_name, last_name, appeal, company_name, phone, current_capital, capital_as_of, net_annualized_return, return_note, interest_received, total_invested, total_withdrawn, referral, min_withdraw_balance, card_daily_limit, synced_at";
const OPERATION_COLUMNS =
  "id, op_date, type, amount, present_capital, muted, note, rate, direction";
// PostgREST / Postgres codes for a table or column that doesn't exist yet
// (app deployed before its migration was applied).
const MISSING_SCHEMA = new Set(["PGRST205", "42P01", "42703"]);

/**
 * The signed-in investor's account, mirrored from WordPress into Supabase.
 * Returns null until the first sync has created the investor's row.
 * RLS limits both queries to the investor's own rows; the explicit filter
 * keeps the intent obvious. React.cache: one read per request per screen.
 */
export const getAccount = cache(async (): Promise<Account | null> => {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Independent reads: run them together.
  const [investorResult, operationsResult] = await Promise.all([
    supabase
      .from("investors")
      .select(INVESTOR_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle<InvestorRow>(),
    supabase
      .from("operations")
      .select(OPERATION_COLUMNS)
      .eq("user_id", user.id)
      .order("position")
      .returns<OperationRow[]>(),
  ]);

  for (const { error } of [investorResult, operationsResult]) {
    // Migration not applied yet: treat as "not synced yet".
    if (error && MISSING_SCHEMA.has(error.code)) return null;
    if (error) throw error;
  }

  const row = investorResult.data;
  // No row yet, or the site's figures haven't arrived yet: show "being set
  // up" rather than $0.00.
  if (!row || row.current_capital === null) return null;

  const num = (value: number | null) => Number(value ?? 0);

  return {
    profile: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      appeal: row.appeal,
      companyName: row.company_name,
      email: row.email || user.email,
      phone: row.phone,
    },
    summary: {
      currentCapital: num(row.current_capital),
      capitalAsOf:
        row.capital_as_of ??
        (row.synced_at ?? new Date().toISOString()).slice(0, 10),
      netAnnualizedReturn: row.net_annualized_return ?? "",
      returnNote: row.return_note,
      interestReceived: num(row.interest_received),
      totalInvested: num(row.total_invested),
      totalWithdrawn: num(row.total_withdrawn),
    },
    operations: (operationsResult.data ?? []).map(toOperation),
    referral: row.referral ? toReferral(row.referral) : null,
    rules: {
      minimumBalance: Number(row.min_withdraw_balance),
      cardDailyLimit: Number(row.card_daily_limit),
    },
  };
});

function toOperation(op: OperationRow): Operation {
  const base = { id: String(op.id), date: op.op_date };
  switch (op.type) {
    case "deposit":
      return {
        ...base,
        type: "deposit",
        amount: Number(op.amount),
        presentCapital: Number(op.present_capital),
        muted: op.muted,
        note: op.note,
      };
    case "withdrawal":
      return {
        ...base,
        type: "withdrawal",
        amount: Number(op.amount),
        note: op.note,
      };
    case "terms":
      return {
        ...base,
        type: "terms",
        rate: op.rate ?? "",
        direction: op.direction,
      };
  }
}

function toReferral(json: ReferralJson): Referral {
  return {
    hasReferrals: json.has_referrals,
    withReturns: json.with_returns,
    investors: json.investors,
    totalBonus: json.total_bonus,
    totalReturned: json.total_returned,
  };
}
