import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseMode } from "@/features/saves/lib/list";
import { librarySearchSchema } from "@/features/search/lib/schemas";

export const Route = createFileRoute("/_library/$mode")({
  validateSearch: librarySearchSchema,
  beforeLoad: ({ params }) => {
    if (parseMode(`/${params.mode}`) === null) {
      throw redirect({ to: "/" });
    }
  },
  component: () => null,
});
