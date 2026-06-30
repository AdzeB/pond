import { createFileRoute } from "@tanstack/react-router";
import { SettingsMaster } from "@/components/settings-master";

export const Route = createFileRoute("/settings/")({
  component: SettingsMaster,
});
