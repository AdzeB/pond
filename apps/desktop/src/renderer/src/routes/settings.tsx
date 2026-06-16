import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/components/settings-page";

export const Route = createFileRoute("/settings")({
  component: Settings,
});
