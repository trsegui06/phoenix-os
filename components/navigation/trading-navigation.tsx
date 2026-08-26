"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/trading", desktop: "Dashboard", mobile: "Dashboard", mark: "D" },
  { href: "/trading/new", desktop: "New Trade", mobile: "Trade", mark: "+" },
  { href: "/trading/reviews", desktop: "Reviews", mobile: "Reviews", mark: "R" },
  { href: "/trading/settings", desktop: "Trading Setup", mobile: "Setup", mark: "S" },
] as const;

function isActive(pathname: string, href: (typeof items)[number]["href"]) {
  if (href === "/trading") return pathname === href;
  if (href === "/trading/reviews") return pathname.startsWith(href);
  return pathname === href;
}

export function TradingNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label={mobile ? "Mobile trading navigation" : "Primary trading navigation"}>
      <ul className={mobile ? "grid grid-cols-4 gap-1" : "space-y-1"}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const emphasized = item.href === "/trading/new";
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  mobile
                    ? `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange ${
                        active
                          ? "border-orange-500/70 bg-orange-500/12 text-orange-100"
                          : emphasized
                            ? "border-slate-700 bg-slate-800/80 text-white"
                            : "border-transparent text-slate-400 hover:text-white"
                      }`
                    : `flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange ${
                        active
                          ? "border-orange-500/50 bg-orange-500/10 text-orange-100"
                          : emphasized
                            ? "border-slate-700 bg-slate-800/70 text-white hover:border-slate-600"
                            : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
                      }`
                }
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${active ? "bg-phoenix-orange text-slate-950" : "bg-slate-800 text-slate-300"}`}
                >
                  {item.mark}
                </span>
                <span>{mobile ? item.mobile : item.desktop}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
