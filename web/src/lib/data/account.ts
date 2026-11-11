import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import type { Account, Appeal, Operation } from "./types";

type InvestorRow = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  appeal: Appeal | null;
  phone: string | null;
  current_capital: number | null;
  capital_as_of: string | null;
  net_annualized_return: number | null;
  interest_received: number | null;
  total_invested: number | null;
  total_withdrawn: number | null;
  min_withdraw_balance: number;
  card_daily_limit: number;
  synced_at: string | null;
};

type OperationRow = {
  id: number;
  op_date: string;
  type: "deposit" | "withdrawal";
  amount: number;
  present_capital: number | null;
  muted: boolean;
  note: string | null;
};

const INVESTOR_COLUMNS =
  "user_id, email, first_name, last_name, appeal, phone, current_capital, capital_as_of, net_annualized_return, interest_received, total_invested, total_withdrawn, min_withdraw_balance, card_daily_limit, synced_at";
const OPERATION_COLUMNS =
  "id, op_date, type, amount, present_capital, muted, note";
// PostgREST / Postgres codes for a table that doesn't exist yet.
const MISSING_TABLE = new Set(["PGRST205", "42P01"]);

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
    // Tables not created yet (migration pending): treat as "not synced yet".
    if (error && MISSING_TABLE.has(error.code)) return null;
    if (error) throw error;
  }

  const row = investorResult.data;
  if (!row) return null;

  const num = (value: number | null) => Number(value ?? 0);

  return {
    profile: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      appeal: row.appeal,
      email: row.email || user.email,
      phone: row.phone,
    },
    summary: {
      currentCapital: num(row.current_capital),
      capitalAsOf:
        row.capital_as_of ??
        (row.synced_at ?? new Date().toISOString()).slice(0, 10),
      netAnnualizedReturn: num(row.net_annualized_return),
      interestReceived: num(row.interest_received),
      totalInvested: num(row.total_invested),
      totalWithdrawn: num(row.total_withdrawn),
    },
    operations: (operationsResult.data ?? []).map((op): Operation => ({
      id: String(op.id),
      date: op.op_date,
      type: op.type,
      amount: Number(op.amount),
      presentCapital:
        op.present_capital === null ? null : Number(op.present_capital),
      muted: op.muted,
      note: op.note,
    })),
    rules: {
      minimumBalance: Number(row.min_withdraw_balance),
      cardDailyLimit: Number(row.card_daily_limit),
    },
  };
});
