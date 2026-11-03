"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { Banknote } from "lucide-react";
import { House } from "lucide-react";
import { UserRound } from "lucide-react";

const TABS = [
  { href: "/overview", label: "Overview", Icon: House },
  { href: "/operations", label: "Operations", Icon: ArrowLeftRight },
  { href: "/withdraw", label: "Withdraw", Icon: Banknote },
  { href: "/settings", label: "Account", Icon: UserRound },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      data-print-hide
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-scrim pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-fg"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2 : 1.6} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
