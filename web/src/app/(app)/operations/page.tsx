import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { AccountPending } from "@/components/app/account-pending";
import { sortNewestFirst } from "@/components/app/operation-row";
import { PageHeader } from "@/components/app/page-header";
import { getAccount } from "@/lib/data/account";
import { formatUsd } from "@/lib/format";
import { OperationsList } from "./operations-list";

export const metadata: Metadata = { title: "Operations" };

export default function OperationsPage() {
  return (
    <>
      <PageHeader
        title="Operations"
        action={
          <Link
            href="/statement"
            aria-label="Account statement"
            className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            <FileText size={20} aria-hidden />
          </Link>
        }
      />
      <Suspense
        fallback={
          <div
            aria-hidden
            className="h-96 animate-pulse rounded-card bg-surface"
          />
        }
      >
        <Operations />
      </Suspense>
    </>
  );
}

async function Operations() {
  const account = await getAccount();
  if (!account) return <AccountPending />;
  const { operations, summary } = account;

  return (
    <>
      <dl className="mb-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Total invested</dt>
          <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
            {formatUsd(summary.totalInvested)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Total withdrawn</dt>
          <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
            {formatUsd(summary.totalWithdrawn)}
          </dd>
        </div>
      </dl>
      <OperationsList operations={sortNewestFirst(operations)} />
      <p className="mt-6 text-xs text-faint">
        For deposits, the large figure is the present capital of that deposit;
        the smaller one is the amount you deposited.
      </p>
    </>
  );
}
