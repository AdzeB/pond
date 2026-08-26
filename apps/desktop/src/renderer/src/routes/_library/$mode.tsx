import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseMode } from "@/lib/save/list";
import { librarySearchSchema } from "@/lib/search/schemas";

export const Route = createFileRoute("/_library/$mode")({
  validateSearch: librarySearchSchema,
  beforeLoad: ({ params }) => {
    if (parseMode(`/${params.mode}`) === null) {
      throw redirect({ to: "/" });
    }
  },
  component: () => null,
});
