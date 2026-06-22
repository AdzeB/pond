import { createFileRoute } from "@tanstack/react-router";
import { TagsSection } from "@/components/settings-tags";

export const Route = createFileRoute("/_library/tags")({
  component: TagsRoute,
});

function TagsRoute() {
  return <TagsSection />;
}
