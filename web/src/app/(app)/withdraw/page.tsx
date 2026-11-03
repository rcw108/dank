import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { DEMO_CODE, DEMO_MODE } from "@/lib/auth/demo";
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
  const { summary, rules, profile } = await getAccount();
  // Pass only what the form needs to the client.
  return (
    <WithdrawFlow
      capital={summary.currentCapital}
      minimumBalance={rules.minimumBalance}
      cardDailyLimit={rules.cardDailyLimit}
      email={profile.email}
      demoCode={DEMO_MODE ? DEMO_CODE : null}
    />
  );
}
