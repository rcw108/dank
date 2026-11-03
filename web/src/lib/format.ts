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

/** 9.38% */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** Nov 3, 2026 — dates are stored as ISO yyyy-mm-dd, rendered in UTC. */
export function formatDate(isoDate: string): string {
  return dateFmt.format(new Date(`${isoDate}T00:00:00Z`));
}

export function yearOf(isoDate: string): string {
  return isoDate.slice(0, 4);
}
