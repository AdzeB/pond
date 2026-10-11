import {
  createTranslator,
  type MessageKey,
  type TranslationValues,
} from "@shared/localization";
import { usePrefs } from "@/shared/state/prefs";

interface LocalizedTextProps {
  message: MessageKey;
  values?: TranslationValues;
}

export function LocalizedText({ message, values }: LocalizedTextProps) {
  return <>{useTranslate()(message, values)}</>;
}

function useTranslate() {
  const [prefs] = usePrefs("localization");
  return createTranslator(prefs.locale);
}
