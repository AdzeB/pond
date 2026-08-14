import { createFileRoute } from "@tanstack/react-router";
import { librarySearchSchema } from "@/lib/search/schemas";

/** List UI is owned by the `_library` layout so `/` ↔ `/trash` and save overlays keep one grid instance. */
export const Route = createFileRoute("/_library/")({
  validateSearch: librarySearchSchema,
  component: () => null,
});
