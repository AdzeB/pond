import type { SectionConfig } from "@/components/settings-engine";
import { CheckNowRow } from "@/components/settings-section-general";

// Post-patch side effect telling main to apply saved prefs; fails open if the handler is missing.
function runApply(channel: string): void {
  void window.pond.query(channel, {}).catch(() => {});
}

export const generalSection: SectionConfig = {
  title: "General",
  description: "Window behavior, menu bar, and updates.",
  groups: [
    {
      title: "Window",
      prefsKey: "window",
      items: [
        {
          control: "switch",
          key: "closeToTray",
          title: "Close to tray",
          description:
            "Hide Pond when you close the window instead of quitting.",
          apply: () => runApply("window.applyPrefs"),
        },
      ],
    },
    {
      title: "Menu bar",
      prefsKey: "quickCapture",
      items: [
        {
          control: "switch",
          key: "menuBarIcon",
          title: "Show menu bar icon",
          description:
            "Keep Pond reachable from the system tray with the window hidden.",
          apply: () => runApply("quickCapture.applyPrefs"),
        },
        {
          control: "switch",
          key: "launchAtLogin",
          title: "Launch at login",
          description: "Start Pond when you sign in to your computer.",
          apply: () => runApply("quickCapture.applyPrefs"),
        },
      ],
    },
    {
      title: "Updates",
      prefsKey: "updates",
      items: [
        {
          control: "switch",
          key: "autoInstall",
          title: "Automatic updates",
          description: "Download updates as they appear. Apply on next launch.",
          apply: () => runApply("updates.applyPrefs"),
        },
        {
          control: "custom",
          key: "check-now",
          render: () => <CheckNowRow />,
        },
      ],
    },
    {
      title: "Advanced",
      prefsKey: "developer",
      items: [
        {
          control: "switch",
          key: "developerMode",
          title: "Show developer tools",
          description: "Enable developer tools in the sidebar.",
        },
      ],
    },
  ],
};
