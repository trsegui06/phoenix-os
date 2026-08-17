export default function TradingLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-10 w-64 rounded bg-slate-800" />
      <div className="mt-8 h-28 rounded-2xl bg-slate-900" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-36 rounded-2xl bg-slate-900" />
        ))}
      </div>
    </main>
  );
}
