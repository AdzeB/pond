import { LocationRow } from "@/components/settings/sections/storage";
import { defineSection } from "@/lib/settings/engine-types";

type Values = Record<string, unknown>;

const guardsOn = (v: Values) => v.guardsEnabled === true;

export const storageSection = defineSection("storage", {
  title: "Storage",
  description:
    "Where your library lives, how to back it up, and how much space it may use.",
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
          description:
            "Track disk usage and act when the library grows too large.",
        },
        {
          control: "select",
          key: "maxLibraryGb",
          title: "Size Limit",
          description:
            "Trigger the action below once the library exceeds this.",
          visible: guardsOn,
          options: [
            { value: 10, label: "10\u00A0GB" },
            { value: 25, label: "25\u00A0GB" },
            { value: 50, label: "50\u00A0GB" },
            { value: 100, label: "100\u00A0GB" },
            { value: 250, label: "250\u00A0GB" },
            { value: 500, label: "500\u00A0GB" },
            { value: null, label: "No limit" },
          ],
        },
        {
          control: "select",
          key: "warnAtPercent",
          title: "Warn At",
          description:
            "Show a banner when usage reaches this share of the limit.",
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
          description: "What Pond does once the library passes the size limit.",
          visible: guardsOn,
          options: [
            { value: "warn", label: "Just warn" },
            { value: "pauseSync", label: "Pause sync" },
            { value: "pauseVideo", label: "Pause video downloads" },
          ],
        },
        {
          control: "select",
          key: "watchIntervalMinutes",
          title: "Check Interval",
          description: "How often to re-measure disk usage.",
          visible: guardsOn,
          options: [
            { value: 1, label: "Every minute" },
            { value: 5, label: "Every 5 minutes" },
            { value: 15, label: "Every 15 minutes" },
            { value: 30, label: "Every 30 minutes" },
          ],
        },
      ],
    },
  ],
});
