import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/features/settings/components/page";

export const Route = createFileRoute("/_library/settings")({
  component: SettingsPage,
});
