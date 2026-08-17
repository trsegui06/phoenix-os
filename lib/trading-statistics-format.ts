const decimal = /^(-?)(\d+)(?:\.(\d+))?$/;

function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat("en-US", { style: "currency", currency })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

export function formatCurrencyCents(currency: string, value: string): string {
  const match = decimal.exec(value);
  if (!match) return "—";
  const [, negative, digits, fraction = ""] = match;
  const centsDigits = `${digits}${fraction}`.replace(/^0+(?=\d)/, "");
  const scale = 2 + fraction.length;
  const padded = centsDigits.padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale);
  const minor = padded.slice(-scale).padEnd(2, "0");
  const grouped = new Intl.NumberFormat("en-US").format(BigInt(whole));
  const amount = `${currencySymbol(currency)}${grouped}.${minor}`;
  if (/^0+$/.test(centsDigits)) return amount;
  return negative ? `−${amount}` : `+${amount}`;
}

export function formatRate(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBasisPoints(value: string | null): string {
  if (value === null) return "—";
  const match = decimal.exec(value);
  if (!match) return "—";
  const negative = match[1] === "-";
  const raw = `${match[2]}${match[3] ?? ""}`;
  const scale = (match[3]?.length ?? 0) + 2;
  const padded = raw.padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale);
  const fraction = padded.slice(-scale).padEnd(2, "0").slice(0, 2);
  return `${negative ? "−" : ""}${BigInt(whole).toString()}.${fraction}%`;
}
