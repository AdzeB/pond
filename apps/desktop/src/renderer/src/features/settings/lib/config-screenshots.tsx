import { ScreenshotIntakeSettings } from "@/features/settings/components/sections/screenshots/intake";
import { ScreenshotShortcuts } from "@/features/settings/components/sections/screenshots/shortcuts";
import { usePrefs } from "@/features/settings/state/prefs";
import { defineCustomSection, group } from "./engine-types";

function useScreenshotFeedback() {
  const [prefs, patch, loaded] = usePrefs("feedback");
  return {
    values: { notify: prefs.notifications.screenshot },
    loaded,
    patch: (delta: { notify?: boolean }) =>
      patch({
        notifications: {
          ...prefs.notifications,
          screenshot: delta.notify ?? prefs.notifications.screenshot,
        },
      }),
  };
}

export const screenshotsSection = defineCustomSection({
  title: "Screenshots",
  description: "Capture your screen and choose how screenshots are saved.",
  keywords: [
    "capture",
    "screen",
    "window",
    "clipboard",
    "Retina",
    "PNG",
    "JPG",
    "WebP",
  ],
  groups: [
    group.prefs("screenshots", {
      title: "Format and Quality",
      items: [
        {
          control: "select",
          key: "format",
          title: "Format",
          options: [
            { value: "png", label: "PNG" },
            { value: "jpeg", label: "JPG" },
            { value: "webp", label: "WebP" },
          ],
        },
        {
          control: "range",
          key: "quality",
          title: "Quality",
          min: 1,
          max: 100,
          suffix: "%",
          visible: (v) => v.format !== "png",
        },
      ],
    }),
    { title: "Screenshot Shortcuts", render: () => <ScreenshotShortcuts /> },
    group.prefs("screenshots", {
      title: "Screenshot Options",
      items: [
        {
          control: "switch",
          key: "askWhereToSave",
          title: "Ask Where to Save",
          description:
            "Choose a folder and add details after area or window capture.",
        },
        {
          control: "select",
          key: "afterSaving",
          title: "After Saving",
          options: [
            { value: "return", label: "Return to Previous App" },
            { value: "open", label: "Open Saved Image in Pond" },
          ],
        },
        {
          control: "switch",
          key: "autoTag",
          title: "Add Screenshot Tag",
          description: "Tag new screenshots automatically.",
        },
        {
          control: "switch",
          key: "copyToClipboard",
          title: "Copy to Clipboard",
          description: "Paste the screenshot into another app.",
        },
        {
          control: "switch",
          key: "useRetina",
          title: "Capture at Retina Resolution",
          description: "Keep the full pixel resolution on Retina displays.",
        },
      ],
    }),
    group.with(useScreenshotFeedback, {
      items: [
        {
          control: "switch",
          key: "notify",
          title: "Notify After Capture",
          description: "Show a notification when the screenshot is saved.",
        },
      ],
    }),
    {
      title: "Capture App and Imports",
      render: () => <ScreenshotIntakeSettings />,
    },
  ],
});
