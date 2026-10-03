import { createFileRoute, redirect } from "@tanstack/react-router";
import { openHarvester } from "@/features/library/lib/open-harvester";

export const Route = createFileRoute("/_library/downloads")({
  beforeLoad: () => {
    openHarvester({ section: "downloads" });
    throw redirect({ to: "/" });
  },
});
