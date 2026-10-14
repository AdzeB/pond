import { createFileRoute } from "@tanstack/react-router";
import { SoundGalleryPage } from "@/features/sounds/page";

export const Route = createFileRoute("/_library/sounds")({
  component: SoundGalleryPage,
});
