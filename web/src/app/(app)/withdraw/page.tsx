import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountPending } from "@/components/app/account-pending";
import { PageHeader } from "@/components/app/page-header";
import { getAccount } from "@/lib/data/account";
import { WithdrawFlow } from "./withdraw-flow";

export const metadata: Metadata = { title: "Withdraw" };

export default function WithdrawPage() {
  return (
    <>
      <PageHeader title="Withdraw" />
      <Suspense
        fallback={
          <div
            aria-hidden
            className="h-80 animate-pulse rounded-card bg-surface"
          />
        }
      >
        <Withdraw />
      </Suspense>
    </>
  );
}

async function Withdraw() {
  const account = await getAccount();
  if (!account) return <AccountPending />;
  const { summary, rules, profile } = account;
  // Pass only what the form needs to the client.
  return (
    <WithdrawFlow
      capital={summary.currentCapital}
      minimumBalance={rules.minimumBalance}
      cardDailyLimit={rules.cardDailyLimit}
      email={profile.email}
    />
  );
}
