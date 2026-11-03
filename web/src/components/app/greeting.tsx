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

export function Greeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(
    noopSubscribe,
    greetingNow,
    () => "Welcome",
  );
  const today = useSyncExternalStore(noopSubscribe, todayNow, () => "");

  return (
    <div className="mb-5">
      <p className="text-sm text-muted">{today || " "}</p>
      <p className="mt-1 font-display text-2xl font-semibold">
        {greeting}, {name}
      </p>
    </div>
  );
}
