import type { ReactNode } from "react";

import { PhoenixMark } from "@/components/ui/phoenix-mark";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-labelledby="auth-title"
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-sm shadow-black/20 sm:p-8"
      >
        <PhoenixMark />
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-phoenix-orange uppercase">
          Phoenix OS
        </p>
        <h1 id="auth-title" className="mt-2 text-3xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
        {children}
      </section>
    </main>
  );
}
