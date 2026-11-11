import { Card } from "@/components/ui/section";

/** Shown while an investor's account has not been synced from dank.capital yet. */
export function AccountPending() {
  return (
    <Card className="p-6 animate-rise">
      <h2 className="text-lg">Your account is being set up</h2>
      <span
        aria-hidden
        className="mt-3 mb-4 block h-[3px] w-[26px] bg-accent"
      />
      <p className="leading-relaxed text-muted">
        We&apos;re bringing your figures over from dank.capital. They&apos;ll
        appear here on their own as soon as they arrive — you don&apos;t need to
        refresh.
      </p>
      <p className="mt-3 text-sm text-faint">
        If this takes longer than a day, contact DANK Capital support.
      </p>
    </Card>
  );
}
