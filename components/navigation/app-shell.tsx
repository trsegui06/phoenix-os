import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { logout } from "@/app/actions/auth";
import { TradingNavigation } from "@/components/navigation/trading-navigation";
import { BrandLockup } from "@/components/ui/phoenix-mark";
import type { ShellIdentity } from "@/services/trading/current-trader";

function LogoutButton({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={`rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange ${compact ? "min-h-11 px-3 py-2" : "w-full px-3 py-2.5"}`}
      >
        {label}
      </button>
    </form>
  );
}

export async function AppShell({
  children,
  identity,
}: {
  children: ReactNode;
  identity: ShellIdentity;
}) {
  const t = await getTranslations("shell");
  const primary = identity.primary === "Trader" ? t("traderFallback") : identity.primary;
  const secondary =
    identity.secondary === "Trading workspace" ? t("identityFallback") : identity.secondary;
  return (
    <div className="min-h-screen bg-slate-950/20 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-800/90 bg-slate-950/80 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-6">
        <div className="px-2">
          <BrandLockup />
          <p className="mt-2 pl-[3.75rem] text-xs tracking-[0.16em] text-slate-500 uppercase">
            {t("workspace")}
          </p>
        </div>
        <div className="mt-9">
          <p className="mb-3 px-3 text-[0.68rem] font-semibold tracking-[0.2em] text-slate-600 uppercase">
            {t("section")}
          </p>
          <TradingNavigation />
        </div>
        <div className="mt-auto border-t border-slate-800 pt-5">
          <div aria-label={t("currentIdentity")} className="mb-3 min-w-0 px-2">
            <p className="truncate text-sm font-medium text-slate-200">{primary}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{secondary}</p>
          </div>
          <LogoutButton label={t("logout")} />
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur lg:hidden">
          <BrandLockup compact />
          <LogoutButton label={t("logout")} compact />
        </header>
        {children}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700/80 bg-slate-950/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <TradingNavigation mobile />
      </div>
    </div>
  );
}
