import type { Locale } from "@pond/schema";
import { createCopyTranslator } from "../shared/localization";

let locale: Locale = "en";

export function setMainLocale(next: Locale): void {
  locale = next;
}

export function localizeMainCopy(copy: string): string {
  return createCopyTranslator(locale)(copy);
}

export function localizeMainError(error: Error): Error {
  error.message = localizeMainCopy(error.message);
  return error;
}
