import { type Locale, LocaleSchema } from "@pond/schema";
import de from "./catalogs/de.json";
import en from "./catalogs/en.json";
import es from "./catalogs/es.json";
import ja from "./catalogs/ja.json";
import ko from "./catalogs/ko.json";
import ru from "./catalogs/ru.json";
import zhCN from "./catalogs/zh-CN.json";
import zhTW from "./catalogs/zh-TW.json";

export type MessageKey = keyof typeof en;
export type TranslationValues = Readonly<Record<string, string | number>>;
export type Translate = (key: MessageKey, values?: TranslationValues) => string;
export type TranslateCopy = (message: string) => string;

type Catalog = Partial<Record<MessageKey, string>>;

interface LocalizationCatalogs {
  en: Catalog;
  es: Catalog;
  de: Catalog;
  ru: Catalog;
  "zh-TW": Catalog;
  "zh-CN": Catalog;
  ja: Catalog;
  ko: Catalog;
}

const CATALOGS: LocalizationCatalogs = {
  en,
  es,
  de,
  ru,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
};

export const LOCALE_LABELS = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  ru: "Русский",
  "zh-TW": "繁體中文",
  "zh-CN": "简体中文",
  ja: "日本語",
  ko: "한국어",
} satisfies Record<Locale, string>;

export function resolveLocale(locale: string | null | undefined): Locale {
  return LocaleSchema.parse(locale);
}

export function createTranslator(locale: Locale): Translate {
  const catalog: Catalog = CATALOGS[locale];
  return (key, values) => {
    const message = catalog[key] ?? en[key];
    return values ? interpolate(message, values) : message;
  };
}

function interpolate(message: string, values: TranslationValues): string {
  return message.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (token, name) => {
    const value = values[name];
    return value === undefined ? token : String(value);
  });
}

/** SAFETY: `en` owns the `MessageKey` union, so every enumerable key is a message key. */
const MESSAGE_KEYS = Object.keys(en) as MessageKey[];
const MESSAGE_KEYS_BY_COPY = new Map<string, MessageKey>();
for (const key of MESSAGE_KEYS) {
  for (const catalog of Object.values(CATALOGS)) {
    const message = catalog[key];
    if (message) MESSAGE_KEYS_BY_COPY.set(message, key);
  }
}

export function isCatalogCopy(message: string): boolean {
  return MESSAGE_KEYS_BY_COPY.has(message);
}

export function createCopyTranslator(locale: Locale): TranslateCopy {
  const translate = createTranslator(locale);
  return (message) => {
    const key = MESSAGE_KEYS_BY_COPY.get(message);
    return key ? translate(key) : message;
  };
}
