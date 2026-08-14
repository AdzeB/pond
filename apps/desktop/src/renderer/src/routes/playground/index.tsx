import { createFileRoute } from "@tanstack/react-router";
import { PlaygroundGrid } from "@/components/playground";

export const Route = createFileRoute("/playground/")({
  component: PlaygroundGrid,
});
