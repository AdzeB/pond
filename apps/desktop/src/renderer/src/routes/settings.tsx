import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/features/settings/page";

export const Route = createFileRoute("/settings")({
  component: Settings,
});
