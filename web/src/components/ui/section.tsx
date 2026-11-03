import type { ReactNode } from "react";

/** Heading with the short teal rule used under headings on dank.capital. */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg">{children}</h2>
        <span aria-hidden className="mt-2 block h-[3px] w-[26px] bg-accent" />
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card border border-line bg-surface ${className}`}>
      {children}
    </div>
  );
}
