import { createFileRoute } from "@tanstack/react-router";
import { IconGalleryPage } from "@/features/icons/page";

export const Route = createFileRoute("/_library/icons")({
  component: IconGalleryPage,
});
