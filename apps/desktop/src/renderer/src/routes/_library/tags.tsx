import { createFileRoute } from "@tanstack/react-router";
import { TagsPage } from "@/components/library/tags/page";

export const Route = createFileRoute("/_library/tags")({
  component: TagsPage,
});
