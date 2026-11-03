import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-field border border-line bg-surface px-4 py-3 text-base text-fg placeholder:text-faint transition-colors focus:border-accent focus:outline-none aria-invalid:border-negative";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  children?: ReactNode;
};

export function Field({ label, name, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-negative">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  error,
  className = "",
  ...props
}: ComponentProps<"input"> & { error?: string }) {
  return (
    <input
      id={props.name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${props.name}-error` : undefined}
      className={`${control} ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      id={props.name}
      rows={3}
      className={`${control} ${className}`}
      {...props}
    />
  );
}
