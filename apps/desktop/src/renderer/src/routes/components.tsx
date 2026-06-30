import { createFileRoute } from "@tanstack/react-router";
import { ComponentLibrary } from "@/components/component-library";

export const Route = createFileRoute("/components")({
  component: ComponentLibrary,
});
