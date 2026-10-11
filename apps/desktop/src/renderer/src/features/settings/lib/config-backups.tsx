import type { SectionConfig } from "@/features/settings/components/engine";
import { BackupSettings } from "@/features/settings/components/sections/backups";
import { BackupSummary } from "@/features/settings/components/sections/backups/summary";

export const backupsSection: SectionConfig = {
  title: "Backups",
  description: "Create, restore, and review copies of this library.",
  keywords: ["backup", "restore", "copy", "transfer"],
  groups: [
    { title: "Overview", render: () => <BackupSummary /> },
    {
      title: "Backups",
      fullWidth: true,
      render: () => <BackupSettings />,
    },
  ],
};
