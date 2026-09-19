import { createFileRoute } from "@tanstack/react-router";
import { TagsPage } from "@/features/tags/components/page";

export const Route = createFileRoute("/_library/tags")({
  component: TagsPage,
});
