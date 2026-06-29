import { createFileRoute } from "@tanstack/react-router";
import { PopupsPreview } from "@/components/popups-preview";

export const Route = createFileRoute("/popups-preview")({
  component: PopupsPreview,
});
