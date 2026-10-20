import { ExtensionSources } from "@/features/settings/components/sections/extension";
import { defineSection } from "@/features/settings/lib/engine-types";

export const extensionSection = defineSection("extension", {
  title: "Browser Extension",
  description:
    "Every browser with the Pond extension picks these up the next time you open it or save.",
  keywords: ["chrome", "firefox", "arc", "browser", "capture", "screenshot"],
  groups: [
    {
      title: "General",
      items: [
        {
          control: "select",
          key: "toolbar",
          title: "Toolbar Button",
          description: "Save Page skips the panel and saves in one click.",
          options: [
            { value: "popup", label: "Open Panel" },
            { value: "save", label: "Save Page" },
          ],
        },
        {
          control: "select",
          key: "theme",
          title: "Theme",
          description:
            "Match Library uses the colors of the Pond Library you have open.",
          options: [
            { value: "library", label: "Match Library" },
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ],
        },
        {
          control: "switch",
          key: "confirmations",
          title: "Show Confirmations",
          description:
            "When off, the Pond icon shows a badge instead of a notice on the page.",
        },
      ],
    },
    {
      title: "Saving",
      items: [
        {
          control: "switch",
          key: "askDetails",
          title: "Ask Where to Save",
          description:
            "Pick a name, rating, tags, and folders on the page before each save.",
          keywords: ["details", "rating", "folders", "tags"],
        },
        {
          control: "switch",
          key: "altClick",
          title: "Alt-Right-Click to Save",
          description:
            "Hold Alt, or Option on a Mac, and right-click an image or link to save it.",
          keywords: ["option", "gesture", "right click"],
        },
      ],
    },
    {
      title: "Screenshots",
      items: [
        {
          control: "select",
          key: "screenshotFormat",
          title: "Screenshot Format",
          description: "PNG keeps text sharp, and JPEG makes smaller files.",
          options: [
            { value: "png", label: "PNG" },
            { value: "jpeg", label: "JPEG" },
          ],
        },
        {
          control: "switch",
          key: "retina",
          title: "Full Resolution",
          description:
            "Saves every pixel a high-density display shows, not just the size the page appears.",
          keywords: ["retina", "2x", "density"],
        },
      ],
    },
    {
      title: "Sources",
      render: () => <ExtensionSources />,
    },
  ],
});
