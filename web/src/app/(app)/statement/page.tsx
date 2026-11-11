import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import logo from "../../../../public/brand/logo.png";
import { AccountPending } from "@/components/app/account-pending";
import { PageHeader } from "@/components/app/page-header";
import { sortNewestFirst } from "@/components/app/operation-row";
import { getAccount } from "@/lib/data/account";
import { formatDate, formatPercent, formatUsd } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Statement" };

export default function StatementPage() {
  return (
    <>
      <PageHeader
        title="Statement"
        back={{ href: "/overview", label: "Overview" }}
      />
      <Suspense
        fallback={
          <div
            aria-hidden
            className="h-[32rem] animate-pulse rounded-card bg-surface"
          />
        }
      >
        <Statement />
      </Suspense>
    </>
  );
}

async function Statement() {
  const account = await getAccount();
  if (!account) return <AccountPending />;
  const { profile, summary, operations } = account;
  const rows = sortNewestFirst(operations);

  return (
    <>
      <div data-print-hide className="mb-6">
        <PrintButton />
      </div>

      {/* Document styling: paper-like card on screen, plain page when printed. */}
      <article className="rounded-card border border-line bg-surface p-6 print:border-0 print:bg-white print:p-0 print:text-[#0d232b]">
        <header className="flex items-start justify-between gap-4 border-b border-gold/50 pb-5">
          <div>
            <p className="font-display text-xl font-bold">Account statement</p>
            <p className="mt-1 text-sm text-muted print:text-[#4a5a60]">
              {profile.appeal} {profile.firstName} {profile.lastName} ·{" "}
              {profile.email}
            </p>
            <p className="text-sm text-muted print:text-[#4a5a60]">
              As of {formatDate(summary.capitalAsOf)}
            </p>
          </div>
          <Image src={logo} alt="DANK Capital" width={64} height={64} />
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-line py-5 text-sm print:border-[#d3dddd]">
          {[
            ["Current capital", formatUsd(summary.currentCapital)],
            [
              "Net annualized return",
              formatPercent(summary.netAnnualizedReturn),
            ],
            ["Interest received", formatUsd(summary.interestReceived)],
            ["Total invested", formatUsd(summary.totalInvested)],
            ["Total withdrawn", formatUsd(summary.totalWithdrawn)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted print:text-[#4a5a60]">{label}</dt>
              <dd className="mt-0.5 font-display font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <table className="mt-5 w-full text-sm">
          <caption className="sr-only">Operations</caption>
          <thead>
            <tr className="text-left text-muted print:text-[#4a5a60]">
              <th scope="col" className="pb-2 font-normal">
                Date
              </th>
              <th scope="col" className="pb-2 font-normal">
                Operation
              </th>
              <th scope="col" className="pb-2 text-right font-normal">
                Present capital
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((op) => (
              <tr
                key={op.id}
                className={`border-t border-line print:border-[#d3dddd] ${op.muted ? "opacity-55" : ""}`}
              >
                <td className="py-2.5 pr-2 whitespace-nowrap">
                  {formatDate(op.date)}
                </td>
                <td className="py-2.5 pr-2">
                  {op.type === "withdrawal"
                    ? "Withdrawal"
                    : `Deposit ${formatUsd(op.amount)}`}
                  {op.note ? (
                    <span className="block text-xs text-muted print:text-[#4a5a60]">
                      {op.note}
                    </span>
                  ) : null}
                </td>
                <td
                  className={`py-2.5 text-right whitespace-nowrap ${op.type === "withdrawal" ? "text-negative" : ""}`}
                >
                  {op.type === "withdrawal"
                    ? `−${formatUsd(op.amount)}`
                    : formatUsd(op.presentCapital ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-xs text-faint print:text-[#6b7a80]">
          DANK Capital, SAPI de CV · RFC: DCA 140408EF7. This statement is for
          information purposes and reflects the figures in your account on the
          date shown.
        </p>
      </article>
    </>
  );
}
