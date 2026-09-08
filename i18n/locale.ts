import { defaultLocale, isLocale, type Locale } from "./config";

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const language = value.trim().toLowerCase().split(/[-_]/, 1)[0];
  return isLocale(language) ? language : null;
}

export function localeFromAcceptLanguage(value: string | null | undefined): Locale | null {
  if (!value) return null;

  const candidates = value
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters.reduce((result, parameter) => {
        const match = /^q=(0(?:\.\d+)?|1(?:\.0+)?)$/i.exec(parameter.trim());
        return match ? Number(match[1]) : result;
      }, 1);
      return { locale: normalizeLocale(tag), quality, index };
    })
    .filter((candidate): candidate is { locale: Locale; quality: number; index: number } =>
      Boolean(candidate.locale && candidate.quality > 0),
    )
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  return candidates[0]?.locale ?? null;
}

export function resolveLocalePreference({
  traderLocale,
  cookieLocale,
  acceptLanguage,
}: {
  traderLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  return (
    normalizeLocale(traderLocale) ??
    normalizeLocale(cookieLocale) ??
    localeFromAcceptLanguage(acceptLanguage) ??
    defaultLocale
  );
}
