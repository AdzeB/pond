import type { SectionConfig } from "@/components/settings-engine";
import { GlassPreview } from "@/components/settings-glass-preview";
import {
  ContrastRow,
  CustomColorRow,
  SystemPresetRow,
  ThemeRow,
} from "@/components/settings-section-appearance";

type Values = Record<string, unknown>;

const isSystemMode = (v: Values) => (v.themeMode ?? "system") === "system";
const isCustomMode = (v: Values) => (v.themeMode ?? "system") === "custom";

// Glass controls are moot once surfaces are forced opaque.
const transparencyReduced = (v: Values) => v.reduceTransparency === true;
// Refraction/chroma only matter while liquid glass is on (and visible).
const lensDisabled = (v: Values) =>
  v.liquidGlass === false || transparencyReduced(v);

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
          title: "Pointer cursors",
          description:
            "Show a hand cursor on hover instead of the default text caret.",
        },
      ],
    },
    {
      title: "Liquid glass",
      render: () => <GlassPreview />,
    },
    {
      items: [
        {
          control: "switch",
          key: "liquidGlass",
          title: "Liquid glass",
          description:
            "Refract the content behind translucent surfaces, like real glass.",
          disabled: transparencyReduced,
        },
        {
          control: "range",
          key: "liquidGlassRefraction",
          title: "Refraction",
          description: "How strongly the glass rim bends the backdrop.",
          min: 0,
          max: 30,
          step: 1,
          suffix: "px",
          visible: (v) => !lensDisabled(v),
        },
        {
          control: "range",
          key: "liquidGlassChroma",
          title: "Chromatic aberration",
          description: "Color fringe split along the glass edges.",
          min: 0,
          max: 8,
          step: 1,
          suffix: "px",
          visible: (v) => !lensDisabled(v),
        },
        {
          control: "range",
          key: "liquidGlassBlur",
          title: "Blur",
          description: "Frost radius of the backdrop behind the glass.",
          min: 0,
          max: 20,
          step: 1,
          suffix: "px",
          visible: (v) => !transparencyReduced(v),
        },
      ],
    },
    {
      title: "Library",
      items: [
        {
          control: "select",
          key: "tweetCover",
          title: "Tweet cover",
          description:
            "Show a tweet's attached media, or the rendered tweet card.",
          options: [
            { value: "media", label: "Attached media" },
            { value: "screenshot", label: "Tweet screenshot" },
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
          title: "Reduce motion",
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
          title: "Reduce transparency",
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
          title: "Blur sensitive media",
          description:
            "Detect explicit media on-device and blur it until you click to reveal.",
        },
      ],
    },
  ],
};
