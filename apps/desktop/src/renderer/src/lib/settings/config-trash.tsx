import type { SectionConfig } from "@/components/settings-engine";

export const trashSection: SectionConfig = {
  title: "Trash",
  description: "How deleted saves are kept and cleared.",
  prefsKey: "trash",
  groups: [
    {
      title: "Auto-empty",
      items: [
        {
          control: "select",
          key: "autoEmptyDays",
          title: "Empty automatically",
          description: "Permanently remove trashed saves after this long.",
          options: [
            { value: null, label: "Never" },
            { value: 7, label: "After 7 days" },
            { value: 14, label: "After 14 days" },
            { value: 30, label: "After 30 days" },
            { value: 90, label: "After 90 days" },
          ],
        },
      ],
    },
    {
      title: "Safety",
      items: [
        {
          control: "switch",
          key: "confirmBeforeEmpty",
          title: "Confirm before emptying",
          description: "Ask for confirmation before clearing the trash.",
        },
      ],
    },
  ],
};
