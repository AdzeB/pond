import { LocationRow } from "@/components/settings/sections/storage";
import {
  defineSection,
  type SettingsValues,
} from "@/lib/settings/engine-types";

const guardsOn = (v: SettingsValues) => v.guardsEnabled === true;

export const storageSection = defineSection("storage", {
  title: "Storage",
  description: "Library location, backups, and disk usage.",
  groups: [
    {
      title: "Location",
      fullWidth: true,
      render: () => <LocationRow />,
    },
    {
      title: "Usage Guard",
      items: [
        {
          control: "switch",
          key: "guardsEnabled",
          title: "Watch Library Size",
          description: "Act when the library grows too large.",
        },
        {
          control: "select",
          key: "maxLibraryGb",
          title: "Size Limit",
          description: "Act when the library exceeds this.",
          visible: guardsOn,
          options: [
            { value: 10, label: "10\u00A0GB" },
            { value: 25, label: "25\u00A0GB" },
            { value: 50, label: "50\u00A0GB" },
            { value: 100, label: "100\u00A0GB" },
            { value: 250, label: "250\u00A0GB" },
            { value: 500, label: "500\u00A0GB" },
            { value: null, label: "No Limit" },
          ],
        },
        {
          control: "select",
          key: "warnAtPercent",
          title: "Warn At",
          description: "Show a banner at this share of the limit.",
          visible: guardsOn,
          options: [
            { value: 70, label: "70%" },
            { value: 80, label: "80%" },
            { value: 90, label: "90%" },
            { value: 95, label: "95%" },
          ],
        },
        {
          control: "select",
          key: "action",
          title: "When the Limit Is Reached",
          description: "What Pond does at the cap.",
          visible: guardsOn,
          options: [
            { value: "warn", label: "Warn" },
            { value: "pauseSync", label: "Pause Sync" },
            { value: "pauseVideo", label: "Pause Video Downloads" },
          ],
        },
        {
          control: "select",
          key: "watchIntervalMinutes",
          title: "Check Interval",
          description: "How often to re-measure.",
          visible: guardsOn,
          options: [
            { value: 1, label: "Every Minute" },
            { value: 5, label: "Every 5 Minutes" },
            { value: 15, label: "Every 15 Minutes" },
            { value: 30, label: "Every 30 Minutes" },
          ],
        },
      ],
    },
  ],
});
