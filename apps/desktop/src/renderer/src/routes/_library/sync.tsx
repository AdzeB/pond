import { createFileRoute } from "@tanstack/react-router";
import { SyncPage } from "@/components/sync";

export const Route = createFileRoute("/_library/sync")({
  component: SyncPage,
});
