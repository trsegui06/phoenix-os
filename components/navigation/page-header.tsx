import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: Props) {
  return (
    <header className="flex flex-col gap-5 border-b border-slate-800 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.18em] text-phoenix-orange uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description && (
          <div className="mt-3 max-w-2xl leading-7 text-slate-400">{description}</div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
