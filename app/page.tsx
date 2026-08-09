import { PhoenixMark } from "@/components/ui/phoenix-mark";
import { Surface } from "@/components/ui/surface";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
      <Surface className="w-full max-w-xl text-center">
        <PhoenixMark />
        <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-phoenix-orange uppercase">
          Application foundation
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Phoenix OS
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-300">
          L&apos;application est initialisée et prête à accueillir ses premiers domaines métier.
        </p>
      </Surface>
    </main>
  );
}
