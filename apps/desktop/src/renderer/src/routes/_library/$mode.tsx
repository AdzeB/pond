import { createFileRoute, redirect } from "@tanstack/react-router";
import { librarySearchSchema } from "@/core/lib/search-schemas";
import { parseMode } from "@/features/library/lib/save-list";
import { LibraryView } from "./-library-view";

export const Route = createFileRoute("/_library/$mode")({
  validateSearch: librarySearchSchema,
  beforeLoad: ({ params }) => {
    if (parseMode(`/${params.mode}`) === null) {
      throw redirect({ to: "/" });
    }
  },
  component: LibraryView,
});
