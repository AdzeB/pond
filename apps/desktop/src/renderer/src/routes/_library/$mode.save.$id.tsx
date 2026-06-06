import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseMode } from "@/lib/utils/save-list";
import { librarySearchSchema } from "@/lib/utils/search-schemas";
import { LibraryView } from "./-library-view";

export const Route = createFileRoute("/_library/$mode/save/$id")({
  validateSearch: librarySearchSchema,
  beforeLoad: ({ params }) => {
    if (parseMode(`/${params.mode}`) === null) {
      throw redirect({ to: "/" });
    }
  },
  component: LibraryView,
});
