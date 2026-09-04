import Image from "next/image";

const sizeClasses = {
  compact: "h-9 w-9",
  default: "h-12 w-12",
  large: "h-16 w-16",
} as const;

export function PhoenixMark({
  size = "default",
  className = "",
}: {
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const pixels = size === "compact" ? 36 : size === "large" ? 64 : 48;

  return (
    <span
      aria-hidden="true"
      data-brand-mark="phoenix-v1"
      className={`inline-flex shrink-0 items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      <Image
        src="/brand/phoenix-mark-v1.png"
        alt=""
        width={pixels}
        height={pixels}
        className="h-full w-full object-contain"
        loading="eager"
        unoptimized
      />
    </span>
  );
}

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-label="Phoenix OS"
      className={`${compact ? "text-sm" : "text-base"} font-semibold tracking-[0.14em] whitespace-nowrap uppercase`}
    >
      <span className="text-white">Phoenix</span> <span className="text-phoenix-orange">OS</span>
    </span>
  );
}

export function BrandLockup({
  compact = false,
  tagline = false,
}: {
  compact?: boolean;
  tagline?: boolean;
}) {
  return (
    <div className="inline-flex min-w-0 items-center gap-3">
      <PhoenixMark size={compact ? "compact" : "default"} />
      <span className="min-w-0">
        <BrandWordmark compact={compact} />
        {tagline && (
          <span className="mt-1 block text-[0.62rem] tracking-[0.18em] text-slate-500 uppercase">
            Process. Discipline. Evolve.
          </span>
        )}
      </span>
    </div>
  );
}
