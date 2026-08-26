import { createFileRoute } from "@tanstack/react-router";
import { SoundsPage } from "@/components/dev/sounds";

export const Route = createFileRoute("/dev/sounds")({
  component: SoundsPage,
});
