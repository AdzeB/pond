import { createFileRoute, redirect } from "@tanstack/react-router";
import { openHarvester } from "@/shared/lib/open-harvester";

export const Route = createFileRoute("/_library/sources")({
  beforeLoad: () => {
    openHarvester({ section: "sources" });
    throw redirect({ to: "/" });
  },
});
