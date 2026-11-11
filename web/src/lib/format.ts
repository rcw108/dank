const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** $89,384.16 */
export function formatUsd(value: number): string {
  return usd.format(value);
}

/**
 * The investor's name as the account page header prints it:
 * "Mrs. Ana Lopez"; for an organisation (appeal "Org."), the first name as
 * the title and the last name on a line below.
 */
export function investorName(profile: {
  appeal: string | null;
  firstName: string;
  lastName: string;
}): { title: string; subtitle: string | null } {
  if (profile.appeal === "Org.") {
    return { title: profile.firstName, subtitle: profile.lastName || null };
  }
  const title = [profile.appeal, profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");
  return { title, subtitle: null };
}

/** Nov 3, 2026 — dates are stored as ISO yyyy-mm-dd, rendered in UTC. */
export function formatDate(isoDate: string): string {
  return dateFmt.format(new Date(`${isoDate}T00:00:00Z`));
}

export function yearOf(isoDate: string): string {
  return isoDate.slice(0, 4);
}
