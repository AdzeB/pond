import { LOCALES, type Locale } from "@pond/schema";
import { Settings } from "@pond/ui";
import { createTranslator, LOCALE_LABELS } from "@shared/localization";
import { usePrefs } from "@/features/settings/state/prefs";
import { EnumSelect } from "@/shared/components/enum-select";

const OPTIONS = LOCALES.map((locale) => ({
  value: locale,
  label: LOCALE_LABELS[locale],
}));

export function LanguageRow() {
  const [localization, patch, loaded] = usePrefs("localization");
  const translate = createTranslator(localization.locale);

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>
          {translate("settings.language.title")}
        </Settings.ItemTitle>
        <Settings.ItemDescription>
          {translate("settings.language.description")}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <EnumSelect<Locale>
          aria-label={translate("settings.language.title")}
          value={localization.locale}
          disabled={!loaded}
          options={OPTIONS}
          onValueChange={(locale) => {
            void patch({ locale });
          }}
        />
      </Settings.ItemControl>
    </>
  );
}
