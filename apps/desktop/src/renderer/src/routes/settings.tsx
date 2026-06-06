import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/components/pages/settings";

export const Route = createFileRoute("/settings")({
  component: Settings,
});
