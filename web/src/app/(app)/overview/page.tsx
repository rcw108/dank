import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { AccountPending } from "@/components/app/account-pending";
import { CompoundInterestInfo } from "@/components/app/compound-interest";
import { Greeting } from "@/components/app/greeting";
import { LegalFooter } from "@/components/app/legal-footer";
import { OperationRow, sortNewestFirst } from "@/components/app/operation-row";
import { PageHeader } from "@/components/app/page-header";
import { MarketStrip } from "@/components/market/market-strip";
import { LinkButton } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/section";
import { getAccount } from "@/lib/data/account";
import { formatDate, formatUsd, investorName } from "@/lib/format";
import type { Referral } from "@/lib/data/types";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
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

      <Suspense fallback={<CapitalSkeleton />}>
        <Capital />
      </Suspense>

      <section aria-label="Markets" className="mt-8">
        <SectionTitle>Markets</SectionTitle>
        <MarketStrip />
      </section>

      <Suspense fallback={<SummarySkeleton />}>
        <SummaryAndRecent />
      </Suspense>

      <LegalFooter />
    </>
  );
}

async function Capital() {
  const account = await getAccount();
  if (!account) return <AccountPending />;
  const { profile, summary } = account;
  const name = investorName(profile);

  return (
    <>
      <Greeting
        title={name.title}
        subtitle={name.subtitle}
        company={profile.companyName}
      />

      {/* The one bold element: capital figure on the site's wireframe texture. */}
      <section
        aria-label="Current capital"
        className="relative overflow-hidden rounded-card border border-line bg-surface bg-[url('/brand/grid.jpg')] bg-cover bg-center p-6 light:bg-none animate-rise"
      >
        <p className="text-sm text-muted">Current capital</p>
        <p className="mt-2 font-display text-[2.6rem] leading-none font-bold tabular-nums">
          {formatUsd(summary.currentCapital)}
        </p>
        <span aria-hidden className="mt-4 block h-[3px] w-[34px] bg-accent" />
        <div className="mt-4 flex items-center gap-1 text-sm">
          <span className="font-medium text-accent tabular-nums">
            {summary.netAnnualizedReturn || "—"}
          </span>
          <span className="text-muted">net annualized return</span>
          <CompoundInterestInfo />
        </div>
        {summary.returnNote ? (
          <p className="mb-1 text-xs text-muted">{summary.returnNote}</p>
        ) : null}
        <p className="text-xs text-faint">
          As of {formatDate(summary.capitalAsOf)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <LinkButton href="/withdraw" className="uppercase">
            Withdraw
          </LinkButton>
          <LinkButton href="/statement" variant="outline" className="uppercase">
            Statement
          </LinkButton>
        </div>
      </section>
    </>
  );
}

async function SummaryAndRecent() {
  const account = await getAccount();
  if (!account) return null;
  const { summary, operations, referral } = account;
  const recent = sortNewestFirst(operations).slice(0, 3);

  return (
    <>
      <section aria-label="Summary" className="mt-8">
        <SectionTitle>Summary</SectionTitle>
        <dl className="grid grid-cols-2 gap-3">
          <Card className="col-span-2 p-5">
            <dt className="text-sm text-muted">Interest received</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-accent tabular-nums">
              {formatUsd(summary.interestReceived)}
            </dd>
          </Card>
          <Card className="p-5">
            <dt className="text-sm text-muted">Total invested</dt>
            <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
              {formatUsd(summary.totalInvested)}
            </dd>
          </Card>
          <Card className="p-5">
            <dt className="text-sm text-muted">Total withdrawn</dt>
            <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
              {formatUsd(summary.totalWithdrawn)}
            </dd>
          </Card>
        </dl>
      </section>

      <section aria-label="Recent operations" className="mt-8">
        <SectionTitle
          action={
            <Link href="/operations" className="text-sm text-accent">
              See all
            </Link>
          }
        >
          Recent operations
        </SectionTitle>
        {recent.length ? (
          <Card className="px-5">
            <ul className="divide-y divide-line">
              {recent.map((operation) => (
                <OperationRow key={operation.id} operation={operation} />
              ))}
            </ul>
          </Card>
        ) : (
          <p className="text-sm text-muted">No operations yet.</p>
        )}
      </section>

      {referral ? <ReferralBonus referral={referral} /> : null}
    </>
  );
}

/** The site's Referral Bonus table (only some accounts have it). */
function ReferralBonus({ referral }: { referral: Referral }) {
  return (
    <section aria-label="Referral bonus" className="mt-8">
      <SectionTitle>Referral bonus</SectionTitle>
      <Card className="px-5">
        {referral.hasReferrals ? (
          <>
            <ul className="divide-y divide-line">
              {referral.investors.map((investor, index) => (
                <li key={index} className="py-4">
                  <p className="font-medium">{investor.name || "—"}</p>
                  <ul className="mt-1 space-y-1 text-sm tabular-nums">
                    {investor.bonuses.map((bonus, b) => (
                      <li key={b} className="flex justify-between gap-4">
                        <span>
                          {formatUsd(bonus.amount)}
                          <span className="text-muted">
                            {" "}
                            / {formatDate(bonus.date)}
                          </span>
                        </span>
                        {bonus.returned !== null ? (
                          <span>{formatUsd(bonus.returned)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="flex justify-between gap-4 border-t border-line py-4 font-medium tabular-nums">
              <span>Total bonus</span>
              <span className="flex gap-4">
                <span>{formatUsd(referral.totalBonus)}</span>
                {referral.totalReturned !== null ? (
                  <span>{formatUsd(referral.totalReturned)}</span>
                ) : null}
              </span>
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            You do not have any referrals yet.
          </p>
        )}
      </Card>
    </section>
  );
}

function CapitalSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-5 h-14 w-2/3 animate-pulse rounded-lg bg-surface" />
      <div className="h-64 animate-pulse rounded-card bg-surface" />
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div aria-hidden className="mt-8 space-y-3">
      <div className="h-24 animate-pulse rounded-card bg-surface" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-card bg-surface" />
        <div className="h-20 animate-pulse rounded-card bg-surface" />
      </div>
    </div>
  );
}
