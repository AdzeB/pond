import { createFileRoute } from "@tanstack/react-router";
import { ShadowGallery } from "@/dev/shadow-gallery";
import { requireDevBuild } from "@/shared/lib/dev-only";

export const Route = createFileRoute("/_library/shadows")({
  beforeLoad: requireDevBuild,
  component: ShadowGallery,
});
