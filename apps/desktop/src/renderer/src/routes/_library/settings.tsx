import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/settings/page";

export const Route = createFileRoute("/_library/settings")({
  component: SettingsPage,
});
