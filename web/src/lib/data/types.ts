// Shape of an investor account as the app needs it: the same sections and
// values as dank.capital/account (see docs/dev/account-map.md). The figures
// are calculated by the site itself and synced as they are.

export type Appeal = "Mr." | "Ms." | "Mrs." | "Org.";

export type InvestorProfile = {
  id: string;
  firstName: string;
  lastName: string;
  appeal: Appeal | null;
  companyName: string | null;
  email: string;
  phone: string | null;
};

export type AccountSummary = {
  currentCapital: number;
  /** Date the figures were calculated for ("today" in Mexico City), ISO yyyy-mm-dd. */
  capitalAsOf: string;
  /** Exactly as the site prints it, e.g. "9.38%"; empty without terms. */
  netAnnualizedReturn: string;
  /** "On May 15, 2023 We have adjusted your interest rate…", if terms changed. */
  returnNote: string | null;
  interestReceived: number;
  totalInvested: number;
  totalWithdrawn: number;
};

/** One row of the site's operations table. */
export type Operation =
  | {
      id: string;
      date: string;
      type: "deposit";
      amount: number;
      /** Present capital column; for a muted row, its value at the withdrawal. */
      presentCapital: number;
      /** Greyed-out row on the site: a deposit used up by a withdrawal. */
      muted: boolean;
      /** Manager's note, shown as a red-dot tooltip on the site. */
      note: string | null;
    }
  | {
      id: string;
      date: string;
      type: "withdrawal";
      amount: number;
      note: string | null;
    }
  | {
      id: string;
      date: string;
      type: "terms";
      /** "Your terms changed to {rate}%". */
      rate: string;
      direction: "upgrade" | "downgrade" | null;
    };

/** The Referral Bonus table, shown on the site to some accounts only. */
export type Referral = {
  hasReferrals: boolean;
  withReturns: boolean;
  investors: {
    name: string;
    bonuses: { amount: number; date: string; returned: number | null }[];
  }[];
  totalBonus: number;
  totalReturned: number | null;
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
  /** In the site's table order (oldest first). */
  operations: Operation[];
  referral: Referral | null;
  rules: WithdrawalRules;
};
