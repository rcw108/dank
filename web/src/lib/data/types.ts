// Shape of an investor account as the app needs it. Mirrors the sections of
// dank.capital/account (see docs/dev/account-map.md). The Supabase tables in
// step 2 are designed to produce exactly these types.

export type Appeal = "Mr." | "Ms." | "Mrs.";

export type InvestorProfile = {
  id: string;
  firstName: string;
  lastName: string;
  appeal: Appeal | null;
  email: string;
  phone: string | null;
};

export type AccountSummary = {
  currentCapital: number;
  /** Date the capital figure was calculated, ISO yyyy-mm-dd. */
  capitalAsOf: string;
  netAnnualizedReturn: number;
  interestReceived: number;
  totalInvested: number;
  totalWithdrawn: number;
};

export type Operation = {
  id: string;
  date: string;
  type: "deposit" | "withdrawal";
  /** Deposit amount, or withdrawn amount (positive number). */
  amount: number;
  /** Present capital of a deposit; null for withdrawals. */
  presentCapital: number | null;
  /** Greyed-out row on the site (e.g. a deposit closed by a withdrawal). */
  muted: boolean;
  /** Manager's note, shown as a red dot tooltip on the site. */
  note: string | null;
};

export type WithdrawalRules = {
  /** Withdrawals are allowed only above this balance (USD). */
  minimumBalance: number;
  /** Daily limit for card withdrawals (USD). */
  cardDailyLimit: number;
};

export type Account = {
  profile: InvestorProfile;
  summary: AccountSummary;
  operations: Operation[];
  rules: WithdrawalRules;
};
