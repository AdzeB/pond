import { createFileRoute } from "@tanstack/react-router";
import { ComponentsGallery } from "@/components/components-gallery";

export const Route = createFileRoute("/components")({
  component: ComponentsGallery,
});
