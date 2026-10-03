import { createFileRoute, redirect } from "@tanstack/react-router";
import { openHarvester } from "@/features/library/lib/open-harvester";

export const Route = createFileRoute("/_library/sources")({
  beforeLoad: () => {
    openHarvester({ section: "sources" });
    throw redirect({ to: "/" });
  },
});
