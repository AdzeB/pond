import { CheckNowRow } from "@/features/settings/components/sections/general/general";
import { ShortcutSettings } from "@/features/settings/components/sections/general/shortcut-settings";
import {
  defineCustomSection,
  group,
} from "@/features/settings/lib/engine-types";

import { notify } from "@/shared/lib/toast";

function runApply(
  channel:
    | "quickCapture.applyPrefs"
    | "window.applyPrefs"
    | "updates.applyPrefs",
): void {
  void window.pond.query(channel, {}).catch(() =>
    notify({
      id: "settings-apply-error",
      title: "Couldn’t apply this setting",
      description: "Try again or restart Pond.",
    }),
  );
}

export const generalSection = defineCustomSection({
  title: "General",
  description: "Window behavior, menu bar, and updates.",
  groups: [
    group.prefs("shortcuts", {
      title: "Keyboard Shortcuts",
      fullWidth: true,
      items: [
        {
          control: "custom",
          key: "shortcuts",
          title: "Shortcut Profile",
          keywords: ["Eagle", "rating", "keys"],
          render: () => <ShortcutSettings />,
        },
      ],
    }),
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
          title: "Launch in Background",
          description: "Start Pond without opening its window.",
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
          title: "Keep Running When Closed",
          description: "Fetch with the window closed, until you quit.",
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
          description: "Show Pond in the menu bar.",
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
          title: "Check for Updates",
          render: () => <CheckNowRow />,
        },
      ],
    }),
  ],
});
