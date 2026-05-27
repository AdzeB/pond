import { createFileRoute } from "@tanstack/react-router";
import { librarySearchSchema } from "@/lib/search-schemas";
import { LibraryView } from "./-library-view";

export const Route = createFileRoute("/_library/source/$source/save/$id")({
  validateSearch: librarySearchSchema,
  component: LibraryView,
});
