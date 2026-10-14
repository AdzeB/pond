import { createFileRoute } from "@tanstack/react-router";
import { SoundGalleryPage } from "@/features/sounds/page";
import { requireDevBuild } from "@/shared/lib/dev-only";

export const Route = createFileRoute("/_library/sounds")({
  beforeLoad: requireDevBuild,
  component: SoundGalleryPage,
});
