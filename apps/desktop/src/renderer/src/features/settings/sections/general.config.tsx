import type { SectionConfig } from "../engine";
import { CheckNowRow } from "./general";

// Post-patch side effect: tell main to apply the freshly saved prefs. Handlers
// may be missing in older main processes, so fail open.
function runApply(channel: string): void {
  void window.pond.query(channel, {}).catch(() => {});
}

export const generalSection: SectionConfig = {
  title: "General",
  description: "Window behavior, notifications, and updates.",
  groups: [
    {
      title: "Window",
      prefsKey: "window",
      items: [
        {
          control: "switch",
          key: "closeToTray",
          title: "Close to Tray",
          description:
            "Hide Pond when you close the window instead of quitting.",
          apply: () => runApply("window.applyPrefs"),
        },
      ],
    },
    {
      title: "Menu Bar",
      prefsKey: "quickCapture",
      items: [
        {
          control: "switch",
          key: "menuBarIcon",
          title: "Show Menu Bar Icon",
          description:
            "Keep Pond reachable from the system tray with the window hidden.",
          apply: () => runApply("quickCapture.applyPrefs"),
        },
        {
          control: "switch",
          key: "launchAtLogin",
          title: "Launch at Login",
          description: "Start Pond when you sign in to your computer.",
          apply: () => runApply("quickCapture.applyPrefs"),
        },
      ],
    },
    {
      title: "Notifications",
      prefsKey: "notifications",
      items: [
        {
          control: "switch",
          key: "saveComplete",
          title: "Save Completed",
          description: "Notify when a save finishes ingesting.",
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
          title: "Automatic Updates",
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
          title: "Show Developer Tools",
          description: "Enable developer tools in the sidebar.",
        },
      ],
    },
  ],
};
