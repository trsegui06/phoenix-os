export const locales = ["en", "fr", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "phoenix-locale";

const messageLoaders = {
  en: () => import("./messages/en.json").then((module) => module.default),
  fr: () => import("./messages/fr.json").then((module) => module.default),
  es: () => import("./messages/es.json").then((module) => module.default),
} satisfies Record<Locale, () => Promise<AbstractIntlMessages>>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function mergeWithEnglishFallback(
  english: AbstractIntlMessages,
  localized: AbstractIntlMessages,
): AbstractIntlMessages {
  return Object.fromEntries(
    Object.entries(english).map(([key, englishValue]) => {
      const localizedValue = localized[key];
      if (
        englishValue &&
        localizedValue &&
        typeof englishValue === "object" &&
        typeof localizedValue === "object" &&
        !Array.isArray(englishValue) &&
        !Array.isArray(localizedValue)
      ) {
        return [key, mergeWithEnglishFallback(englishValue, localizedValue)];
      }
      return [key, localizedValue ?? englishValue];
    }),
  );
}

export async function loadMessages(locale: Locale) {
  const english = await messageLoaders.en();
  if (locale === defaultLocale) return english;
  return mergeWithEnglishFallback(english, await messageLoaders[locale]());
}
import type { AbstractIntlMessages } from "next-intl";
