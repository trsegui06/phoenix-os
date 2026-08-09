import type { HTMLAttributes, ReactNode } from "react";

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Surface({ children, className = "", ...props }: SurfaceProps) {
  return (
    <section
      className={`rounded-2xl border border-phoenix-border bg-phoenix-surface p-8 shadow-2xl shadow-slate-950/30 sm:p-12 ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
