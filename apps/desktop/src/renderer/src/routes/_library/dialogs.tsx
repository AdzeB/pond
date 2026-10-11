import { createFileRoute } from "@tanstack/react-router";
import { DialogGalleryPage } from "@/features/dialogs/page";

export const Route = createFileRoute("/_library/dialogs")({
  component: DialogGalleryPage,
});
