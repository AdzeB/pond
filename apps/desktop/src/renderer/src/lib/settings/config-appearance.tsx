import {
  AppearanceRow,
  ThemeColorRow,
  ThemeContrastRow,
  ThemePresetRow,
} from "@/components/settings/sections/appearance";
import { AppIconRow } from "@/components/settings/sections/appearance/app-icon";
import { defineSection } from "@/lib/settings/engine-types";
import { SOUND_FEEL_OPTIONS } from "@/lib/ui/sound-feel-options";
import { previewSoundFeel } from "@/lib/ui/sounds";

export const appearanceSection = defineSection("preferences", {
  title: "Appearance",
  description: "App icon, theme, colors, sounds, and accessibility.",
  groups: [
    {
      title: "App Icon",
      fullWidth: true,
      prefsKey: "window",
      items: [
        {
          control: "custom",
          key: "app-icon",
          title: "App Icon",
          keywords: [
            "dock",
            "icon",
            "tint",
            "aqua",
            "crayon",
            "taskbar",
            "brand",
          ],
          render: (b) => <AppIconRow binding={b} />,
        },
      ],
    },
    {
      title: "Theme",
      fullWidth: true,
      items: [
        {
          control: "custom",
          key: "appearance-mode",
          render: (b) => <AppearanceRow binding={b} />,
        },
      ],
    },
    {
      title: "Light theme",
      fullWidth: true,
      items: [
        {
          control: "custom",
          key: "light-preset",
          render: (b) => <ThemePresetRow binding={b} side="light" />,
        },
        {
          control: "custom",
          key: "light-accent",
          render: (b) => (
            <ThemeColorRow binding={b} side="light" field="accent" />
          ),
        },
        {
          control: "custom",
          key: "light-background",
          render: (b) => (
            <ThemeColorRow binding={b} side="light" field="background" />
          ),
        },
        {
          control: "custom",
          key: "light-foreground",
          render: (b) => (
            <ThemeColorRow binding={b} side="light" field="foreground" />
          ),
        },
        {
          control: "custom",
          key: "light-contrast",
          render: (b) => <ThemeContrastRow binding={b} side="light" />,
        },
      ],
    },
    {
      title: "Dark theme",
      fullWidth: true,
      items: [
        {
          control: "custom",
          key: "dark-preset",
          render: (b) => <ThemePresetRow binding={b} side="dark" />,
        },
        {
          control: "custom",
          key: "dark-accent",
          render: (b) => (
            <ThemeColorRow binding={b} side="dark" field="accent" />
          ),
        },
        {
          control: "custom",
          key: "dark-background",
          render: (b) => (
            <ThemeColorRow binding={b} side="dark" field="background" />
          ),
        },
        {
          control: "custom",
          key: "dark-foreground",
          render: (b) => (
            <ThemeColorRow binding={b} side="dark" field="foreground" />
          ),
        },
        {
          control: "custom",
          key: "dark-contrast",
          render: (b) => <ThemeContrastRow binding={b} side="dark" />,
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
          title: "Post Cover",
          description:
            "Image used as the card cover for saved posts on X and Threads.",
          keywords: [
            "twitter",
            "x",
            "threads",
            "screenshot",
            "media",
            "thumbnail",
          ],
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
      ],
    },
  ],
});
