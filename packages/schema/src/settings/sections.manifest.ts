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
    description: "Window behavior, notifications, and updates.",
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
        title: "Notifications",
        slice: "notifications",
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
        slice: "updates",
        items: [
          {
            control: "switch",
            key: "autoInstall",
            title: "Automatic Updates",
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
        ],
      },
      {
        title: "Input",
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
    id: "downloads",
    label: "Downloads",
    group: "saving",
    icon: "Download",
    description: "How Pond treats videos and images it saves.",
    groups: [
      {
        title: "Video Quality",
        binding: "downloads.video",
        items: [
          {
            control: "select",
            key: "maxHeight",
            title: "Maximum Resolution",
            description:
              "Higher resolutions mean bigger files. 1080p suits most clips.",
            options: [
              { value: 4320, label: "4320p (8K)" },
              { value: 2160, label: "2160p (4K)" },
              { value: 1440, label: "1440p" },
              { value: 1080, label: "1080p" },
              { value: 720, label: "720p" },
              { value: 480, label: "480p" },
              { value: 360, label: "360p" },
              { value: 240, label: "240p" },
              { value: 144, label: "144p" },
              { value: null, label: "Original" },
            ],
          },
          {
            control: "select",
            key: "maxFps",
            title: "Maximum Frame Rate",
            description: "Cap the frame rate to keep files smaller.",
            options: [
              { value: null, label: "Unlimited" },
              { value: 60, label: "60\u00A0fps" },
              { value: 30, label: "30\u00A0fps" },
              { value: 24, label: "24\u00A0fps" },
            ],
          },
        ],
      },
      {
        title: "Video Codecs",
        binding: "downloads.video",
        items: [
          {
            control: "select",
            key: "videoCodec",
            title: "Preferred Video Codec",
            description:
              "H.264 is most compatible; AV1 and VP9 are smaller but newer.",
            options: [
              { value: "h264", label: "H.264 (AVC)" },
              { value: "hevc", label: "H.265 (HEVC)" },
              { value: "av1", label: "AV1" },
              { value: "vp9", label: "VP9" },
              { value: "any", label: "Any / Best" },
            ],
          },
          {
            control: "select",
            key: "audioCodec",
            title: "Preferred Audio Codec",
            description: "Falls back to the next best when unavailable.",
            options: [
              { value: "aac", label: "AAC" },
              { value: "opus", label: "Opus" },
              { value: "any", label: "Any / Best" },
            ],
          },
        ],
      },
      {
        title: "Video Container & Size",
        binding: "downloads.video",
        items: [
          {
            control: "select",
            key: "container",
            title: "Container",
            description: "Auto picks the best wrapper for the chosen codecs.",
            options: [
              { value: "auto", label: "Auto" },
              { value: "mp4", label: "MP4" },
              { value: "mkv", label: "MKV" },
              { value: "webm", label: "WebM" },
              { value: "mov", label: "MOV" },
            ],
          },
          {
            control: "select",
            key: "maxFileSizeMb",
            title: "Maximum File Size",
            description:
              "Cap each download so a long stream can't fill the disk.",
            options: [
              { value: 100, label: "100\u00A0MB" },
              { value: 200, label: "200\u00A0MB" },
              { value: 500, label: "500\u00A0MB" },
              { value: 1000, label: "1\u00A0GB" },
              { value: 2000, label: "2\u00A0GB" },
              { value: 5000, label: "5\u00A0GB" },
              { value: null, label: "No Cap" },
            ],
          },
        ],
      },
      {
        title: "Video Subtitles",
        binding: "downloads.video",
        items: [
          {
            control: "select",
            key: "subtitles",
            title: "Subtitles",
            description:
              "Download saves a sidecar file; Embed muxes them into the video.",
            options: [
              { value: "off", label: "Off" },
              { value: "download", label: "Download Sidecar" },
              { value: "embed", label: "Embed in Video" },
            ],
          },
          {
            control: "select",
            key: "subtitleLang",
            title: "Subtitle Language",
            description: "Preferred language to fetch when available.",
            visible: "subtitlesEnabled",
            options: [
              { value: "en", label: "English" },
              { value: "es", label: "Spanish" },
              { value: "fr", label: "French" },
              { value: "de", label: "German" },
              { value: "it", label: "Italian" },
              { value: "pt", label: "Portuguese" },
              { value: "ja", label: "Japanese" },
              { value: "ko", label: "Korean" },
              { value: "zh", label: "Chinese" },
              { value: "ru", label: "Russian" },
              { value: "ar", label: "Arabic" },
              { value: "hi", label: "Hindi" },
            ],
          },
        ],
      },
      {
        title: "Video Extras",
        binding: "downloads.video",
        items: [
          {
            control: "switch",
            key: "embedMetadata",
            title: "Embed Metadata",
            description: "Write title, uploader, and date into the file.",
          },
          {
            control: "switch",
            key: "embedThumbnail",
            title: "Embed Thumbnail",
            description: "Attach the poster image as cover art.",
          },
          {
            control: "switch",
            key: "embedChapters",
            title: "Embed Chapters",
            description: "Include chapter markers when the source has them.",
          },
          {
            control: "switch",
            key: "sponsorblockRemove",
            title: "Remove Sponsors",
            description:
              "Use SponsorBlock to cut sponsor segments (YouTube only).",
          },
        ],
      },
      {
        title: "Image Resize & Format",
        binding: "downloads.image",
        items: [
          {
            control: "select",
            key: "maxLongEdge",
            title: "Maximum Resolution",
            description: "Long edge in pixels. Pond resizes anything larger.",
            options: [
              { value: 1024, label: "1024\u00A0px" },
              { value: 2048, label: "2048\u00A0px" },
              { value: 4096, label: "4096\u00A0px" },
              { value: 8192, label: "8192\u00A0px" },
              { value: null, label: "Original" },
            ],
          },
          {
            control: "select",
            key: "format",
            title: "Format",
            description: "Convert saved images, or keep the original encoding.",
            options: [
              { value: "original", label: "Original" },
              { value: "jpeg", label: "JPEG" },
              { value: "png", label: "PNG" },
              { value: "webp", label: "WebP" },
              { value: "avif", label: "AVIF" },
            ],
          },
          {
            control: "select",
            key: "maxFileSizeMb",
            title: "Maximum File Size",
            description: "Skip downloads bigger than the cap.",
            options: [
              { value: 2, label: "2\u00A0MB" },
              { value: 5, label: "5\u00A0MB" },
              { value: 10, label: "10\u00A0MB" },
              { value: 25, label: "25\u00A0MB" },
              { value: 50, label: "50\u00A0MB" },
              { value: null, label: "No Cap" },
            ],
          },
        ],
      },
      {
        title: "Image Encoding",
        binding: "downloads.image",
        items: [
          {
            control: "select",
            key: "quality",
            title: "Quality",
            description: "Higher keeps more detail at the cost of size.",
            visible: "imageQuality",
            options: [
              { value: 50, label: "50%" },
              { value: 60, label: "60%" },
              { value: 70, label: "70%" },
              { value: 80, label: "80%" },
              { value: 90, label: "90%" },
              { value: 95, label: "95%" },
              { value: 100, label: "100%" },
            ],
          },
          {
            control: "switch",
            key: "lossless",
            title: "Lossless",
            description: "Encode WebP/AVIF without quality loss.",
            visible: "imageLossless",
          },
          {
            control: "switch",
            key: "progressive",
            title: "Progressive",
            description: "Render JPEG/PNG in passes as they load.",
            visible: "imageProgressive",
          },
          {
            control: "switch",
            key: "preserveMetadata",
            title: "Preserve Metadata",
            description: "Keep EXIF and color profile when re-encoding.",
            visible: "imageReencode",
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
