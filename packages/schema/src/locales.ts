import { z } from "zod";

export const LOCALES = [
  "en",
  "es",
  "de",
  "ru",
  "zh-TW",
  "zh-CN",
  "ja",
  "ko",
] as const;

export const LocaleSchema = z.enum(LOCALES).catch("en");

export type Locale = z.infer<typeof LocaleSchema>;
