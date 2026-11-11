import { ArrowDown, ArrowUp } from "lucide-react";
import type { Operation } from "@/lib/data/types";
import { formatDate, formatUsd } from "@/lib/format";

/** One row of the site's operations table, readable on a phone. */
export function OperationRow({ operation }: { operation: Operation }) {
  if (operation.type === "terms") {
    const Arrow = operation.direction === "downgrade" ? ArrowDown : ArrowUp;
    return (
      <li className="py-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium">Your terms changed to</p>
            <p className="text-sm text-muted">{formatDate(operation.date)}</p>
          </div>
          <p
            className={`flex items-center gap-1 font-medium tabular-nums ${
              operation.direction === "downgrade"
                ? "text-negative"
                : "text-accent"
            }`}
          >
            {operation.rate}%
            <Arrow size={16} aria-label={operation.direction ?? undefined} />
          </p>
        </div>
      </li>
    );
  }

  const isWithdrawal = operation.type === "withdrawal";
  const muted = operation.type === "deposit" && operation.muted;

  return (
    <li className={`py-4 ${muted ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">
            {isWithdrawal ? "Withdrawal" : "Deposit"}
          </p>
          <p className="text-sm text-muted">{formatDate(operation.date)}</p>
        </div>
        <div className="text-right tabular-nums">
          {operation.type === "withdrawal" ? (
            <p className="font-medium text-negative">
              −{formatUsd(operation.amount)}
            </p>
          ) : (
            <>
              <p className="font-medium">
                {formatUsd(operation.presentCapital)}
              </p>
              <p className="text-sm text-muted">
                from {formatUsd(operation.amount)}
              </p>
            </>
          )}
        </div>
      </div>
      {operation.note ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-muted">
          <span
            aria-hidden
            className="mt-[7px] size-1.5 shrink-0 rounded-full bg-negative"
          />
          {operation.note}
        </p>
      ) : null}
    </li>
  );
}

/**
 * Newest first: the site's table order, reversed. The site lists rows
 * oldest first and puts what is left of a deposit right after the
 * withdrawal that split it; reversing keeps those rows together.
 */
export function sortNewestFirst(operations: Operation[]): Operation[] {
  return operations.toReversed();
}
