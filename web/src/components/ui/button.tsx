import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pill px-6 text-sm font-medium tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-45";

// Pill shapes come straight from dank.capital (outlined pills in the header).
const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110 active:brightness-95",
  outline: "border border-fg/35 text-fg hover:border-fg/70 hover:bg-fg/5",
  ghost: "text-accent hover:bg-accent/10",
  danger: "text-negative hover:bg-negative/10",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
