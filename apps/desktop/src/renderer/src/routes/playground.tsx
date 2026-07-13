import { createFileRoute, redirect } from "@tanstack/react-router";
import { DockPlayground } from "@/components/dock-playground";
import { loadAppInfo } from "@/lib/app-info";

export const Route = createFileRoute("/playground")({
  beforeLoad: async () => {
    const info = await loadAppInfo();
    if (info.isPackaged) {
      throw redirect({ to: "/" });
    }
  },
  component: DockPlayground,
});
