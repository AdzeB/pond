import type { SoundFeel } from "@pond/schema/db";

export const SOUND_FEEL_OPTIONS: ReadonlyArray<{
  value: SoundFeel;
  label: string;
}> = [
  { value: "soft", label: "Soft" },
  { value: "crisp", label: "Crisp" },
  { value: "thock", label: "Thock" },
  { value: "glass", label: "Glass" },
  { value: "metal", label: "Metal" },
  { value: "lofi", label: "Lo-fi" },
  { value: "retro", label: "Retro" },
  { value: "organic", label: "Organic" },
  { value: "airy", label: "Airy" },
  { value: "punchy", label: "Punchy" },
];
