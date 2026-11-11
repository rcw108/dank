"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Same rule as dank.capital/account: greeting follows the device's local time.
function greetingNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayNow(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

/**
 * Header of the account page: greeting, then the investor's name as the site
 * prints it ("Mrs. Ana Lopez"), and the company name when there is one.
 */
export function Greeting({
  title,
  subtitle,
  company,
}: {
  title: string;
  subtitle?: string | null;
  company?: string | null;
}) {
  const greeting = useSyncExternalStore(
    noopSubscribe,
    greetingNow,
    () => "Welcome",
  );
  const today = useSyncExternalStore(noopSubscribe, todayNow, () => "");

  return (
    <div className="mb-5">
      <p className="text-sm text-muted">
        {today ? `${today} · ${greeting}` : " "}
      </p>
      <h2 className="mt-1 font-display text-2xl font-semibold">{title}</h2>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}
      {company ? <p className="text-sm text-muted">{company}</p> : null}
    </div>
  );
}
