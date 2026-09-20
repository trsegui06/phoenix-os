const decimal = /^(-?)(\d+)(?:\.(\d+))?$/;

const displayLocales: Record<string, string> = { en: "en-US", fr: "fr-FR", es: "es-ES" };
const displayLocale = (locale: string) => displayLocales[locale] ?? displayLocales.en;

export function formatCount(value: number, locale = "en"): string {
  return new Intl.NumberFormat(displayLocale(locale)).format(value);
}

function currencyParts(currency: string, whole: bigint, locale: string) {
  try {
    return new Intl.NumberFormat(displayLocale(locale), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).formatToParts(whole);
  } catch {
    return [
      { type: "currency", value: currency },
      ...new Intl.NumberFormat(displayLocale(locale), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).formatToParts(whole),
    ];
  }
}

export function formatCurrencyCents(currency: string, value: string, locale = "en"): string {
  const match = decimal.exec(value);
  if (!match) return "—";
  const [, negative, digits, fraction = ""] = match;
  const roundedCents = BigInt(digits) + (fraction[0] >= "5" ? 1n : 0n);
  const whole = roundedCents / 100n;
  const minor = (roundedCents % 100n).toString().padStart(2, "0");
  // Keep exact cents in BigInt. Intl supplies presentation parts, never rounding money.
  const amount = currencyParts(currency, whole, locale)
    .map((part) => (part.type === "fraction" ? minor : part.value))
    .join("");
  if (roundedCents === 0n) return amount;
  return negative ? `−${amount}` : `+${amount}`;
}

export function formatRate(value: number | null, locale = "en"): string {
  if (value === null) return "—";
  return new Intl.NumberFormat(displayLocale(locale), {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBasisPoints(value: string | null, locale = "en"): string {
  if (value === null) return "—";
  const match = decimal.exec(value);
  if (!match) return "—";
  const negative = match[1] === "-";
  const raw = `${match[2]}${match[3] ?? ""}`;
  const scale = (match[3]?.length ?? 0) + 2;
  const padded = raw.padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale);
  const fraction = padded.slice(-scale).padEnd(2, "0").slice(0, 2);
  const grouped = new Intl.NumberFormat(displayLocale(locale)).format(BigInt(whole));
  const amount = new Intl.NumberFormat(displayLocale(locale), {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .formatToParts(0)
    .map((part) => {
      if (part.type === "integer") return grouped;
      if (part.type === "fraction") return fraction;
      return part.value;
    })
    .join("");
  return `${negative ? "−" : ""}${amount}`;
}
