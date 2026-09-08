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

export function loadMessages(locale: Locale) {
  return messageLoaders[locale]();
}
import type { AbstractIntlMessages } from "next-intl";
