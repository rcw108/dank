"use client";

import { useState } from "react";
import { OperationRow } from "@/components/app/operation-row";
import { Card } from "@/components/ui/section";
import type { Operation } from "@/lib/data/types";
import { yearOf } from "@/lib/format";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export function OperationsList({ operations }: { operations: Operation[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible =
    filter === "all"
      ? operations
      : operations.filter((op) => op.type === filter);

  // Operations arrive newest first, so years come out in descending order.
  const byYear = new Map<string, Operation[]>();
  for (const operation of visible) {
    const year = yearOf(operation.date);
    const list = byYear.get(year);
    if (list) list.push(operation);
    else byYear.set(year, [operation]);
  }

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Show"
        className="mb-6 grid grid-cols-3 rounded-pill border border-line bg-surface p-1"
      >
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-10 rounded-pill text-sm font-medium transition-colors ${
              filter === value
                ? "bg-accent text-on-accent"
                : "text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {byYear.size === 0 ? (
        <p className="py-12 text-center text-muted">
          No operations of this type yet.
        </p>
      ) : (
        <div className="space-y-8">
          {[...byYear].map(([year, items]) => (
            <section key={year} aria-label={year}>
              <h2 className="mb-3 font-display text-sm font-semibold text-muted">
                {year}
              </h2>
              <Card className="px-5">
                <ul className="divide-y divide-line">
                  {items.map((operation) => (
                    <OperationRow key={operation.id} operation={operation} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
