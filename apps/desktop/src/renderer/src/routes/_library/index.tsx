import { createFileRoute } from "@tanstack/react-router";
import { librarySearchSchema } from "@/core/lib/search-schemas";
import { LibraryView } from "./-library-view";

export const Route = createFileRoute("/_library/")({
  validateSearch: librarySearchSchema,
  component: LibraryView,
});
