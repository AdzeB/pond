import type { SectionsManifest } from "./types";

// The settings UI: nav metadata plus the rows shown per section. Declarative
// rows reference a key in the group's bound slice; bespoke UI is referenced by
// name (component / body / binding / predicate) and resolved at runtime in the
// desktop registry. Section order drives nav order.
export const SETTINGS_SECTIONS_MANIFEST: SectionsManifest = [
  {
    id: "general",
    label: "General",
    group: "app",
    icon: "SlidersHorizontal",
    description: "Window behavior, input, notifications, and updates.",
    groups: [
      {
        title: "Window",
        slice: "window",
        items: [
          {
            control: "switch",
            key: "closeToTray",
            title: "Close to Tray",
            description:
              "Hide Pond when you close the window instead of quitting.",
            apply: "window.applyPrefs",
          },
          {
            control: "switch",
            key: "launchHidden",
            title: "Launch Hidden",
            description: "Start in the tray on login without opening a window.",
            apply: "window.applyPrefs",
          },
          {
            control: "switch",
            key: "restorePosition",
            title: "Remember Window Position",
            description:
              "Restore the last window size and screen position on launch.",
          },
        ],
      },
      {
        title: "Menu Bar",
        slice: "quickCapture",
        items: [
          {
            control: "switch",
            key: "menuBarIcon",
            title: "Show Menu Bar Icon",
            description:
              "Keep Pond reachable from the system tray with the window hidden.",
            apply: "quickCapture.applyPrefs",
          },
          {
            control: "switch",
            key: "launchAtLogin",
            title: "Launch at Login",
            description: "Start Pond when you sign in to your computer.",
            apply: "quickCapture.applyPrefs",
          },
        ],
      },
      {
        title: "Input",
        slice: "preferences",
        items: [
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
        title: "Notifications",
        slice: "notifications",
        items: [
          {
            control: "switch",
            key: "saveComplete",
            title: "Save Completed",
            description: "Notify when a save finishes ingesting.",
          },
          {
            control: "switch",
            key: "sound",
            title: "Chime on Toast",
            description: "Plays a short 880\u00A0Hz tick when a toast lands.",
          },
        ],
      },
      {
        title: "Updates",
        slice: "updates",
        items: [
          {
            control: "select",
            key: "channel",
            title: "Channel",
            description:
              "Stable ships every few weeks. Beta gets fixes sooner.",
            apply: "updates.applyPrefs",
            options: [
              { value: "stable", label: "Stable" },
              { value: "beta", label: "Beta" },
            ],
          },
          {
            control: "switch",
            key: "autoInstall",
            title: "Auto-Install Updates",
            description:
              "Download updates as they appear. Apply on next launch.",
            apply: "updates.applyPrefs",
          },
          {
            control: "custom",
            key: "check-now",
            component: "CheckNowRow",
          },
        ],
      },
      {
        title: "Extension",
        items: [
          {
            control: "custom",
            key: "pairing-link",
            component: "PairingLinkRow",
          },
          {
            control: "custom",
            key: "install-instructions",
            component: "InstallInstructionsRow",
          },
        ],
      },
      {
        title: "Trash",
        slice: "trash",
        items: [
          {
            control: "select",
            key: "autoEmptyDays",
            title: "Auto-Empty Trash",
            description: "Permanently delete saves older than this window.",
            options: [
              { value: null, label: "Never" },
              { value: 7, label: "After 7\u00A0days" },
              { value: 30, label: "After 30\u00A0days" },
              { value: 90, label: "After 90\u00A0days" },
            ],
          },
          {
            control: "switch",
            key: "confirmBeforeEmpty",
            title: "Confirm Before Emptying",
            description: "Ask before Empty Trash deletes everything.",
          },
        ],
      },
      {
        title: "Advanced",
        slice: "developer",
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
  },
  {
    id: "appearance",
    label: "Appearance",
    group: "app",
    icon: "Palette",
    description: "Theme, motion, and typography.",
    slice: "preferences",
    groups: [
      {
        title: "Theme",
        items: [
          {
            control: "custom",
            key: "interface-theme",
            component: "ThemeRow",
          },
          {
            control: "custom",
            key: "system-light",
            component: "SystemLightRow",
            visible: "isSystemMode",
          },
          {
            control: "custom",
            key: "system-dark",
            component: "SystemDarkRow",
            visible: "isSystemMode",
          },
          {
            control: "custom",
            key: "accent",
            component: "AccentRow",
            visible: "isCustomMode",
          },
          {
            control: "custom",
            key: "background",
            component: "BackgroundRow",
            visible: "isCustomMode",
          },
          {
            control: "custom",
            key: "contrast",
            component: "ContrastRow",
            visible: "isCustomMode",
          },
          {
            control: "range",
            key: "radius",
            title: "Corner Radius",
            description: "Roundness of various elements.",
            min: 0,
            max: 28,
            step: 1,
            suffix: "px",
          },
          {
            control: "stepper",
            key: "uiFontSize",
            title: "Font Size",
            description: "Adjust the size of the text in the interface.",
            min: 11,
            max: 18,
            fallback: 13,
          },
          {
            control: "custom",
            key: "reset-theme",
            component: "ResetThemeRow",
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
    ],
  },
  {
    id: "storage",
    label: "Storage",
    group: "library",
    icon: "HardDrive",
    description:
      "How much disk your library uses, your storage cap, and integrity checks.",
    groups: [
      { title: "Disk Usage", body: "DiskUsage" },
      {
        title: "Storage Limits",
        slice: "storage",
        items: [
          {
            control: "switch",
            key: "guardsEnabled",
            title: "Enforce a Storage Limit",
            description: "Apply an action when the library crosses your cap.",
            apply: "storage.applyGuardPrefs",
          },
          {
            control: "custom",
            key: "no-hard-cap",
            component: "NoHardCapRow",
            visible: "guardsEnabled",
          },
          {
            control: "number",
            key: "maxLibraryGb",
            title: "Max Library Size",
            description: "The action fires once usage hits this many GB.",
            visible: "hasCap",
            min: 1,
            max: 1000,
            unit: "GB",
            apply: "storage.applyGuardPrefs",
          },
          {
            control: "number",
            key: "warnAtPercent",
            title: "Warn At",
            description: "Warn once usage crosses this percentage of the cap.",
            visible: "hasCap",
            min: 50,
            max: 100,
            unit: "%",
            apply: "storage.applyGuardPrefs",
          },
          {
            control: "custom",
            key: "action",
            component: "ActionRow",
            visible: "guardsEnabled",
          },
          {
            control: "number",
            key: "watchIntervalMinutes",
            title: "Watch Interval",
            description:
              "How often Pond recomputes usage. 1 to 60\u00A0minutes.",
            visible: "guardsEnabled",
            min: 1,
            max: 60,
            unit: "min",
            apply: "storage.applyGuardPrefs",
          },
        ],
      },
      {
        title: "Integrity",
        items: [{ control: "custom", key: "verify", component: "VerifyRow" }],
      },
    ],
  },
  {
    id: "location",
    label: "Location",
    group: "library",
    icon: "FolderOpen",
    custom: "LocationSection",
  },
  {
    id: "downloads",
    label: "Downloads",
    group: "saving",
    icon: "Download",
    description: "How Pond treats videos and images it saves.",
    groups: [
      {
        title: "Videos",
        binding: "downloads.video",
        items: [
          {
            control: "switch",
            key: "enabled",
            title: "Download Videos",
            description:
              "Fetch the MP4 alongside the poster for offline playback.",
          },
          {
            control: "select",
            key: "maxHeight",
            title: "Maximum Resolution",
            description:
              "Higher resolutions mean bigger files. 1080p suits most clips.",
            disabled: "videoDisabled",
            options: [
              { value: 480, label: "480p (Small Files)" },
              { value: 720, label: "720p" },
              { value: 1080, label: "1080p (Recommended)" },
              { value: 1440, label: "1440p" },
              { value: 2160, label: "2160p / 4K" },
              { value: null, label: "Original (No Cap)" },
            ],
          },
          {
            control: "select",
            key: "maxFileSizeMb",
            title: "Maximum File Size",
            description:
              "Cap each download so a long stream can't fill the disk.",
            disabled: "videoDisabled",
            options: [
              { value: 200, label: "200\u00A0MB" },
              { value: 500, label: "500\u00A0MB (Recommended)" },
              { value: 1000, label: "1\u00A0GB" },
              { value: 2000, label: "2\u00A0GB" },
              { value: 5000, label: "5\u00A0GB" },
              { value: null, label: "No Cap" },
            ],
          },
        ],
      },
      {
        title: "Images",
        binding: "downloads.image",
        items: [
          {
            control: "select",
            key: "maxLongEdge",
            title: "Maximum Resolution",
            description: "Long edge in pixels. Pond resizes anything larger.",
            options: [
              { value: 1024, label: "1024 px" },
              { value: 2048, label: "2048 px (Recommended)" },
              { value: 4096, label: "4096 px / 4K" },
              { value: null, label: "Original (No Cap)" },
            ],
          },
          {
            control: "select",
            key: "maxFileSizeMb",
            title: "Maximum File Size",
            description: "Skip downloads bigger than the cap.",
            options: [
              { value: 5, label: "5\u00A0MB" },
              { value: 10, label: "10\u00A0MB (Recommended)" },
              { value: 25, label: "25\u00A0MB" },
              { value: 50, label: "50\u00A0MB" },
              { value: null, label: "No Cap" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    group: "saving",
    icon: "Clock",
    custom: "ScheduleSection",
  },
  {
    id: "developer",
    label: "Developer",
    group: "dev",
    icon: "Terminal",
    custom: "DeveloperSection",
  },
] satisfies SectionsManifest;
