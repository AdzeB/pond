import { createRootRoute } from "@tanstack/react-router";
import { RootShell } from "@/app/components/root-shell";

export const Route = createRootRoute({
  component: RootShell,
});
