import { createFileRoute } from "@tanstack/react-router";
import { librarySearchSchema } from "@/features/search/lib/schemas";

export const Route = createFileRoute("/_library/")({
  validateSearch: librarySearchSchema,
  component: () => null,
});
