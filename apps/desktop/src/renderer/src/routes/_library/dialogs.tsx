import { createFileRoute } from "@tanstack/react-router";
import { DialogGalleryPage } from "@/features/dialogs/page";
import { requireDevBuild } from "@/shared/lib/dev-only";

export const Route = createFileRoute("/_library/dialogs")({
  beforeLoad: requireDevBuild,
  component: DialogGalleryPage,
});
