import type { Appeal } from "@/lib/data/types";
import type { AccountSnapshot, Snapshot } from "./snapshot";

const APPEALS: readonly Appeal[] = ["Mr.", "Ms.", "Mrs.", "Org."];

function toAppeal(value: string | undefined): Appeal | null {
  return APPEALS.find((appeal) => appeal === value?.trim()) ?? null;
}

function toOperations(rows: AccountSnapshot["rows"]) {
  // Kept in the order the account page prints them.
  return rows.map((row) => {
    switch (row.type) {
      case "deposit":
        return {
          date: row.date,
          type: row.type,
          amount: row.amount,
          present_capital: row.present_capital,
          muted: row.muted,
          note: row.note,
        };
      case "withdrawal":
        return {
          date: row.date,
          type: row.type,
          amount: row.amount,
          note: row.note,
        };
      case "terms":
        return {
          date: row.date,
          type: row.type,
          rate: row.rate,
          direction: row.direction,
        };
    }
  });
}

/** Builds the argument of public.sync_investor() from a WordPress snapshot. */
export function toInvestorPayload(snapshot: Snapshot, userId: string) {
  const { profile, account } = snapshot;

  return {
    user_id: userId,
    wp_user_id: snapshot.wp_user_id,
    email: snapshot.email.toLowerCase(),
    first_name: snapshot.first_name,
    last_name: snapshot.last_name,
    appeal: toAppeal(profile?.appeal),
    phone: profile?.phone || null,
    company_name: profile?.company_name || null,
    theme: profile?.theme ?? null,
    // Diagnostics only: nothing an investor shouldn't see.
    wp_meta: {
      roles: snapshot.roles,
      sent_at: snapshot.sent_at,
      account_error: snapshot.account_error,
    },
    // Without it the last good figures stay (see sync_investor()).
    ...(account && {
      account: {
        capital_as_of: account.as_of,
        current_capital: account.current_capital,
        net_annualized_return: account.net_annualized_return,
        return_note: account.return_note,
        interest_received: account.interest_received,
        total_invested: account.total_invested,
        total_withdrawn: account.total_withdrawn,
        referral: account.referral,
        operations: toOperations(account.rows),
      },
    }),
  };
}
