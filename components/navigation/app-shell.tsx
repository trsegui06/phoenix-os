import type { ReactNode } from "react";

import { logout } from "@/app/actions/auth";
import { TradingNavigation } from "@/components/navigation/trading-navigation";
import { PhoenixMark } from "@/components/ui/phoenix-mark";

function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={`rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange ${compact ? "min-h-11 px-3 py-2" : "w-full px-3 py-2.5"}`}
      >
        Logout
      </button>
    </form>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950/20 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-800/90 bg-slate-950/80 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-6">
        <div className="flex items-center gap-3 px-2">
          <PhoenixMark />
          <div className="min-w-0">
            <p className="font-semibold tracking-tight text-white">Phoenix OS</p>
            <p className="text-xs tracking-[0.16em] text-slate-500 uppercase">Trading</p>
          </div>
        </div>
        <div className="mt-9">
          <p className="mb-3 px-3 text-[0.68rem] font-semibold tracking-[0.2em] text-slate-600 uppercase">
            Trading
          </p>
          <TradingNavigation />
        </div>
        <div className="mt-auto border-t border-slate-800 pt-5">
          <p className="mb-3 px-2 text-xs text-slate-500">Trading workspace</p>
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <PhoenixMark />
            <div>
              <p className="font-semibold text-white">Phoenix OS</p>
              <p className="text-xs text-slate-500">Trading</p>
            </div>
          </div>
          <LogoutButton compact />
        </header>
        {children}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700/80 bg-slate-950/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <TradingNavigation mobile />
      </div>
    </div>
  );
}
