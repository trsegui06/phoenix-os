export default function TradingLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-10 w-64 rounded bg-slate-800" />
      <div className="mt-3 h-5 w-48 rounded bg-slate-900" />
      <div className="mt-8 h-28 rounded-2xl border border-slate-800 bg-slate-900/70" />
      <div className="mt-8 h-16 w-80 max-w-full rounded bg-slate-900" />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900" />
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-20 rounded-2xl bg-slate-900" />
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-24 rounded-xl bg-slate-900/70" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-2xl border border-slate-800 bg-slate-900" />
    </main>
  );
}
