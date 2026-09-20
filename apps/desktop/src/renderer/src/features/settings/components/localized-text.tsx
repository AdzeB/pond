import {
  createTranslator,
  type MessageKey,
  type TranslationValues,
} from "@shared/localization";
import { usePrefs } from "@/features/settings/state/prefs";

interface LocalizedTextProps {
  message: MessageKey;
  values?: TranslationValues;
}

export function LocalizedText({ message, values }: LocalizedTextProps) {
  return <>{useTranslate()(message, values)}</>;
}

export function useTranslate() {
  const [localization] = usePrefs("localization");
  return createTranslator(localization.locale);
}
