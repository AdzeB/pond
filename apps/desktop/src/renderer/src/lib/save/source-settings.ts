import type { Prefs, Source } from "@pond/schema/db";

type PreferenceKey = keyof Prefs["preferences"];

interface SegmentedOption {
  value: string;
  label: string;
}

/** One source-specific setting, rendered as a segmented control in the source dialog and bound to a key on the `preferences` prefs slice. */
interface SourceSettingField {
  key: PreferenceKey;
  label: string;
  description: string;
  options: SegmentedOption[];
}

/** Adding an entry (plus the backing key on the `preferences` slice in @pond/schema) makes the source dialog render it automatically. */
const SOURCE_SETTINGS: Partial<Record<Source, SourceSettingField[]>> = {
  twitter: [
    {
      key: "tweetCover",
      label: "Tweet Cover",
      description: "Image used as the card cover.",
      options: [
        { value: "media", label: "Media" },
        { value: "screenshot", label: "Screenshot" },
      ],
    },
  ],
};

export function sourceSettingsFor(source: Source): SourceSettingField[] {
  return SOURCE_SETTINGS[source] ?? [];
}
