import { createFileRoute } from "@tanstack/react-router";
import { IconGalleryPage } from "@/features/icons/page";
import { requireDevBuild } from "@/shared/lib/dev-only";

export const Route = createFileRoute("/_library/icons")({
  beforeLoad: requireDevBuild,
  component: IconGalleryPage,
});
