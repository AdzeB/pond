import { createFileRoute } from "@tanstack/react-router";
import { Tags } from "@/components/pages/tags";

export const Route = createFileRoute("/tags")({
  component: Tags,
});
