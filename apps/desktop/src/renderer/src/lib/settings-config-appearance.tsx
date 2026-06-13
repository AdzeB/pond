import type { SectionConfig } from "@/components/settings-engine";
import {
  ContrastRow,
  CustomColorRow,
  SystemPresetRow,
  ThemeRow,
} from "@/components/settings-section-appearance";

type Values = Record<string, unknown>;

const isSystemMode = (v: Values) => (v.themeMode ?? "system") === "system";
const isCustomMode = (v: Values) => (v.themeMode ?? "system") === "custom";

export const appearanceSection: SectionConfig = {
  title: "Appearance",
  description: "Theme, motion, and typography.",
  prefsKey: "preferences",
  groups: [
    {
      title: "Theme",
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

        {
          control: "switch",
          key: "pointerCursors",
          title: "Use Pointer Cursors",
          description:
            "Show a hand cursor on hover instead of the default text caret.",
        },
      ],
    },
    {
      title: "Library",
      items: [
        {
          control: "select",
          key: "tweetCover",
          title: "Tweet Cover",
          description:
            "Show a tweet's attached media, or the rendered tweet card.",
          options: [
            { value: "media", label: "Attached Media" },
            { value: "screenshot", label: "Tweet Screenshot" },
          ],
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
            { value: "system", label: "Match System" },
            { value: "always", label: "Always Reduce" },
            { value: "never", label: "Never Reduce" },
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
    {
      title: "Privacy",
      items: [
        {
          control: "switch",
          key: "blurSensitiveMedia",
          title: "Blur Sensitive Media",
          description:
            "Detect explicit media on-device and blur it until you click to reveal.",
        },
      ],
    },
  ],
};
