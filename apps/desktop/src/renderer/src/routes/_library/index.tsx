import { createFileRoute } from "@tanstack/react-router";
import { librarySearchSchema } from "@/lib/search/schemas";

export const Route = createFileRoute("/_library/")({
  validateSearch: librarySearchSchema,
  component: () => null,
});
