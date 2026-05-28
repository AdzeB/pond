import { createFileRoute } from "@tanstack/react-router";
import { Sync } from "@/components/sync";

export const Route = createFileRoute("/_library/sync")({
  component: Sync.Page,
});
