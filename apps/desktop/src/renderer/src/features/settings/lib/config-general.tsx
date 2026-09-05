import { CheckNowRow } from "@/features/settings/components/sections/general/general";
import {
  defineCustomSection,
  group,
} from "@/features/settings/lib/engine-types";

function runApply(
  channel:
    | "quickCapture.applyPrefs"
    | "window.applyPrefs"
    | "updates.applyPrefs",
): void {
  void window.pond.query(channel, {}).catch(() => {});
}

export const generalSection = defineCustomSection({
  title: "Preferences",
  description: "Window behavior, menu bar, and updates.",
  groups: [
    group.prefs("window", {
      title: "Startup",
      items: [
        {
          control: "select",
          key: "startupPage",
          title: "Startup Behavior",
          description: "Where Pond opens when you launch.",
          options: [
            { value: "continue", label: "Last Screen" },
            { value: "library", label: "Library" },
            { value: "sources", label: "Sources" },
            { value: "trash", label: "Trash" },
            { value: "settings", label: "Settings" },
          ],
        },
        {
          control: "switch",
          key: "launchAtLogin",
          title: "Launch at Login",
          description: "Start Pond when you sign in.",
          prefsKey: "quickCapture",
          apply: () => runApply("quickCapture.applyPrefs"),
        },
        {
          control: "switch",
          key: "launchHidden",
          title: "Launch Hidden",
          description: "Start in the tray without a window.",
          apply: () => runApply("window.applyPrefs"),
        },
      ],
    }),
    group.prefs("window", {
      title: "Window",
      items: [
        {
          control: "switch",
          key: "restorePosition",
          title: "Restore Window Position",
          description: "Reopen Pond where you last left it.",
          apply: () => runApply("window.applyPrefs"),
        },
        {
          control: "switch",
          key: "closeToTray",
          title: "Close to Tray",
          description: "Hide to the tray instead of quitting.",
          apply: () => runApply("window.applyPrefs"),
        },
      ],
    }),
    group.prefs("quickCapture", {
      title: "Menu Bar",
      items: [
        {
          control: "switch",
          key: "menuBarIcon",
          title: "Menu Bar Icon",
          description: "Keep Pond in the system tray.",
          apply: () => runApply("quickCapture.applyPrefs"),
        },
      ],
    }),
    group.prefs("updates", {
      title: "Updates",
      items: [
        {
          control: "switch",
          key: "autoInstall",
          title: "Automatic Updates",
          description: "Download in the background. Apply on next launch.",
          apply: () => runApply("updates.applyPrefs"),
        },
        {
          control: "custom",
          key: "check-now",
          render: () => <CheckNowRow />,
        },
      ],
    }),
  ],
});
