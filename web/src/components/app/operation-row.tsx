import type { Operation } from "@/lib/data/types";
import { formatDate, formatUsd } from "@/lib/format";

/** One line of the operations ledger, readable on a phone. */
export function OperationRow({ operation }: { operation: Operation }) {
  const isWithdrawal = operation.type === "withdrawal";

  return (
    <li className={`py-4 ${operation.muted ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">
            {isWithdrawal ? "Withdrawal" : "Deposit"}
          </p>
          <p className="text-sm text-muted">{formatDate(operation.date)}</p>
        </div>
        <div className="text-right tabular-nums">
          {isWithdrawal ? (
            <p className="font-medium text-negative">
              −{formatUsd(operation.amount)}
            </p>
          ) : (
            <>
              <p className="font-medium">
                {formatUsd(operation.presentCapital ?? 0)}
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

export function sortNewestFirst(operations: Operation[]): Operation[] {
  // Same-day withdrawal and its remainder deposit keep their ledger order.
  return operations
    .map((operation, index) => ({ operation, index }))
    .toSorted(
      (a, b) =>
        b.operation.date.localeCompare(a.operation.date) || b.index - a.index,
    )
    .map(({ operation }) => operation);
}
