import {
  ContrastRow,
  CustomColorRow,
  SystemPresetRow,
  ThemeRow,
} from "@/components/settings/sections/appearance";
import { defineSection } from "@/lib/settings/engine-types";
import { SOUND_FEEL_OPTIONS } from "@/lib/ui/sound-feel-options";
import { previewSoundFeel } from "@/lib/ui/sounds";

type Values = Record<string, unknown>;

const isSystemMode = (v: Values) => (v.themeMode ?? "system") === "system";
const isCustomMode = (v: Values) => (v.themeMode ?? "system") === "custom";

export const appearanceSection = defineSection("preferences", {
  title: "Appearance",
  description: "Theme, colors, sounds, and accessibility.",
  groups: [
    {
      title: "Theme",
      fullWidth: true,
      items: [
        {
          control: "custom",
          key: "interface-theme",
          render: (b) => <ThemeRow binding={b} />,
        },
        {
          control: "custom",
          key: "system-light",
          render: (b) => <SystemPresetRow binding={b} kind="light" />,
          visible: isSystemMode,
        },
        {
          control: "custom",
          key: "system-dark",
          render: (b) => <SystemPresetRow binding={b} kind="dark" />,
          visible: isSystemMode,
        },
        {
          control: "custom",
          key: "accent",
          render: (b) => <CustomColorRow binding={b} field="accent" />,
          visible: isCustomMode,
        },
        {
          control: "custom",
          key: "background",
          render: (b) => <CustomColorRow binding={b} field="base" />,
          visible: isCustomMode,
        },
        {
          control: "custom",
          key: "contrast",
          render: (b) => <ContrastRow binding={b} />,
          visible: isCustomMode,
        },
      ],
    },
    {
      items: [
        {
          control: "switch",
          key: "pointerCursors",
          title: "Pointer Cursors",
          description:
            "Show a hand cursor on hover instead of the default text caret.",
        },
      ],
    },
    {
      title: "Cards",
      items: [
        {
          control: "select",
          key: "tweetCover",
          title: "Tweet Cover",
          description: "Image used as the card cover for saved tweets.",
          keywords: ["twitter", "x", "screenshot", "media", "thumbnail"],
          options: [
            { value: "media", label: "Media" },
            { value: "screenshot", label: "Screenshot" },
          ],
        },
      ],
    },
    {
      title: "Sounds",
      items: [
        {
          control: "switch",
          key: "soundsEnabled",
          title: "Interface Sounds",
          description: "Play feedback for presses, toggles, and deletes.",
          keywords: ["audio", "click", "feedback", "sfx", "mute", "silence"],
          apply: () => {
            previewSoundFeel();
          },
        },
        {
          control: "select",
          key: "soundFeel",
          title: "Sound Style",
          description: "Character of the interface feedback.",
          keywords: [
            "soft",
            "crisp",
            "thock",
            "glass",
            "metal",
            "lofi",
            "retro",
            "organic",
            "airy",
            "punchy",
          ],
          options: [...SOUND_FEEL_OPTIONS],
          visible: (v) => v.soundsEnabled !== false,
          apply: () => {
            previewSoundFeel();
          },
        },
      ],
    },
    {
      title: "Accessibility",
      items: [
        {
          control: "select",
          key: "reduceMotion",
          title: "Reduce Motion",
          description: "Tone down animations and transitions across Pond.",
          options: [
            { value: "system", label: "Match system" },
            { value: "always", label: "Always reduce" },
            { value: "never", label: "Never reduce" },
          ],
        },
        {
          control: "switch",
          key: "reduceTransparency",
          title: "Reduce Transparency",
          description: "Swap blurred surfaces for opaque fills.",
        },
      ],
    },
  ],
});
