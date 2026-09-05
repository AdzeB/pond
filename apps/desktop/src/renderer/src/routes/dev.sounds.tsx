import { createFileRoute } from "@tanstack/react-router";
import { SoundsPage } from "@/dev/sounds/sounds";

export const Route = createFileRoute("/dev/sounds")({
  component: SoundsPage,
});
