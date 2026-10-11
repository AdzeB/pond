import { createFileRoute } from "@tanstack/react-router";
import { ShadowGallery } from "@/dev/shadow-gallery";

export const Route = createFileRoute("/_library/shadows")({
  component: ShadowGallery,
});
