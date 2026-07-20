import { createFileRoute, redirect } from "@tanstack/react-router";
import { TooltipPlayground } from "@/components/tooltip-playground";
import { loadAppInfo } from "@/lib/app-info";

export const Route = createFileRoute("/tooltip-playground")({
  beforeLoad: async () => {
    const info = await loadAppInfo();
    if (info.isPackaged) {
      throw redirect({ to: "/" });
    }
  },
  component: TooltipPlayground,
});
