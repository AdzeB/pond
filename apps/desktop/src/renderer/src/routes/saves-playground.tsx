import { createFileRoute, redirect } from "@tanstack/react-router";
import { SavesPlayground } from "@/components/saves-playground";
import { loadAppInfo } from "@/lib/app-info";

export const Route = createFileRoute("/saves-playground")({
  beforeLoad: async () => {
    const info = await loadAppInfo();
    if (info.isPackaged) {
      throw redirect({ to: "/" });
    }
  },
  component: SavesPlayground,
});
