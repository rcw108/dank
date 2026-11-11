import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { AccountPending } from "@/components/app/account-pending";
import { LegalFooter } from "@/components/app/legal-footer";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/section";
import { getAccount } from "@/lib/data/account";
import { investorName } from "@/lib/format";
import { signOut } from "./actions";
import {
  DeleteAccount,
  EmailForm,
  ProfileForm,
  ThemeSwitch,
} from "./settings-forms";

export const metadata: Metadata = { title: "Account" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Account" />
      <Suspense
        fallback={
          <div
            aria-hidden
            className="h-96 animate-pulse rounded-card bg-surface"
          />
        }
      >
        <Settings />
      </Suspense>

      <section aria-label="Appearance" className="mt-10">
        <SectionTitle>Appearance</SectionTitle>
        <ThemeSwitch />
      </section>

      <section aria-label="Help" className="mt-10">
        <SectionTitle>Help</SectionTitle>
        <Card className="divide-y divide-line">
          <Row href="/faq">Questions and answers</Row>
          <Row href="https://dank.capital/support/">Contact support</Row>
          <Row href="https://dank.capital/privacy/">Privacy policy</Row>
        </Card>
      </section>

      <div className="mt-10 grid gap-3">
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full uppercase">
            Log out
          </Button>
        </form>
        <DeleteAccount />
      </div>

      <LegalFooter />
    </>
  );
}

async function Settings() {
  const account = await getAccount();
  if (!account) return <AccountPending />;
  const { profile } = account;
  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`;
  const name = investorName(profile);

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full border border-gold/60 font-display text-lg font-semibold text-gold">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">{name.title}</p>
          {name.subtitle ? (
            <p className="text-sm text-muted">{name.subtitle}</p>
          ) : null}
          {profile.companyName ? (
            <p className="text-sm text-muted">{profile.companyName}</p>
          ) : null}
          <p className="truncate text-sm text-muted">{profile.email}</p>
        </div>
      </div>

      <section aria-label="Personal details" className="mt-10">
        <SectionTitle>Personal details</SectionTitle>
        <p className="mb-5 text-sm text-muted">
          Changes are reviewed by our team before they appear in your account.
        </p>
        <ProfileForm profile={profile} />
      </section>

      <section aria-label="Email" className="mt-10">
        <SectionTitle>Email</SectionTitle>
        <EmailForm email={profile.email} />
      </section>
    </>
  );
}

function Row({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  const className =
    "flex min-h-14 items-center justify-between px-5 hover:bg-fg/5";
  const content = (
    <>
      <span>{children}</span>
      <ChevronRight size={18} aria-hidden className="text-muted" />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
