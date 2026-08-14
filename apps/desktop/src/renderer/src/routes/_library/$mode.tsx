import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseMode } from "@/lib/save/list";
import { librarySearchSchema } from "@/lib/search/schemas";

/** List UI is owned by the `_library` layout so mode switches keep one grid instance. */
export const Route = createFileRoute("/_library/$mode")({
  validateSearch: librarySearchSchema,
  beforeLoad: ({ params }) => {
    if (parseMode(`/${params.mode}`) === null) {
      throw redirect({ to: "/" });
    }
  },
  component: () => null,
});
