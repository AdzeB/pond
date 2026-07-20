import { createFileRoute, redirect } from "@tanstack/react-router";
import { SourceTilePlayground } from "@/components/source-tile-playground";
import { loadAppInfo } from "@/lib/app-info";

export const Route = createFileRoute("/source-tile-playground")({
  beforeLoad: async () => {
    const info = await loadAppInfo();
    if (info.isPackaged) {
      throw redirect({ to: "/" });
    }
  },
  component: SourceTilePlayground,
});
