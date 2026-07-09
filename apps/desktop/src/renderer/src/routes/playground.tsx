import { createFileRoute } from "@tanstack/react-router";
import { DockPlayground } from "@/components/dock-playground";

export const Route = createFileRoute("/playground")({
  component: DockPlayground,
});
