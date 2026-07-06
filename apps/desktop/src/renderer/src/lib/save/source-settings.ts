import type { Prefs, Source } from "@pond/schema/db";

// Keys of the `preferences` prefs slice that hold per-source display settings.
type PreferenceKey = keyof Prefs["preferences"];

interface SegmentedOption {
  value: string;
  label: string;
}

// A single source-specific setting, rendered as a segmented control in the
// source dialog. Bound to a key on the `preferences` prefs slice — the natural
// home for per-source display preferences (e.g. how a Tweet's cover renders).
interface SourceSettingField {
  key: PreferenceKey;
  label: string;
  description: string;
  options: SegmentedOption[];
}

// Declarative registry of source-specific settings. Add an entry for a source
// (plus the backing key on the `preferences` slice in @pond/schema) and the
// source dialog renders it automatically — no dialog changes required.
const SOURCE_SETTINGS: Partial<Record<Source, SourceSettingField[]>> = {
  twitter: [
    {
      key: "tweetCover",
      label: "Tweet cover",
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
