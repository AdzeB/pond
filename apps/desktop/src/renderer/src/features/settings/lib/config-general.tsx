import { LocalizedText } from "@/features/settings/components/localized-text";
import { NotificationPreferences } from "@/features/settings/components/sections/general/feedback";
import { CheckNowRow } from "@/features/settings/components/sections/general/general";
import { LanguageRow } from "@/features/settings/components/sections/general/language";
import { RaycastRow } from "@/features/settings/components/sections/general/raycast";
import { SidebarPreferences } from "@/features/settings/components/sections/general/sidebar";
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
  title: <LocalizedText message="settings.preferences.title" />,
  description: <LocalizedText message="settings.preferences.description" />,
  groups: [
    group.plain({
      items: [
        {
          control: "custom",
          key: "language",
          title: "Language",
          keywords: ["locale", "translation"],
          render: () => <LanguageRow />,
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
        {
          control: "range",
          key: "interfaceZoom",
          title: "Interface Zoom",
          description: "Scale Pond's interface without changing media zoom.",
          min: 50,
          max: 200,
          step: 5,
          suffix: "%",
        },
      ],
    }),
    group.plain({
      title: "Sidebar",
      items: [
        {
          control: "custom",
          key: "sidebar",
          title: "Sidebar",
          keywords: ["destinations", "counts", "double-click"],
          render: () => <SidebarPreferences />,
        },
      ],
    }),
    group.plain({
      title: "Notifications",
      items: [
        {
          control: "custom",
          key: "notifications",
          title: "Notifications",
          keywords: ["alerts", "extension", "auto import", "screenshots"],
          render: () => <NotificationPreferences />,
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
    group.plain({
      title: "Integrations",
      items: [
        {
          control: "custom",
          key: "raycast",
          title: "Raycast",
          keywords: ["extension", "local API", "token"],
          render: () => <RaycastRow />,
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
