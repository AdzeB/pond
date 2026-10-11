import { createFileRoute, redirect } from "@tanstack/react-router";
import { openHarvester } from "@/shared/lib/open-harvester";

export const Route = createFileRoute("/_library/downloads")({
  beforeLoad: () => {
    openHarvester({ section: "downloads" });
    throw redirect({ to: "/" });
  },
});
