import { createFileRoute, redirect } from "@tanstack/react-router";
import { DockMergePlayground } from "@/components/dock-merge-playground";
import { loadAppInfo } from "@/lib/app-info";

export const Route = createFileRoute("/dock-merge-playground")({
  beforeLoad: async () => {
    const info = await loadAppInfo();
    if (info.isPackaged) {
      throw redirect({ to: "/" });
    }
  },
  component: DockMergePlayground,
});
