import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import logo from "../../../public/brand/logo.png";

/** Top bar of every signed-in screen: crest-logo, title, optional action. */
export function PageHeader({
  title,
  action,
  back,
}: {
  title: string;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header
      data-print-hide
      className="sticky top-0 z-30 -mx-5 mb-6 flex items-center gap-3 border-b border-transparent bg-scrim px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl"
    >
      {back ? (
        <Link href={back.href} className="text-sm text-accent">
          ← {back.label}
        </Link>
      ) : (
        <Link href="/overview" aria-label="Overview" className="shrink-0">
          <Image src={logo} alt="" width={36} height={36} />
        </Link>
      )}
      <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
      {action}
    </header>
  );
}
