import { createFileRoute, redirect } from "@tanstack/react-router";
import { ToastPlayground } from "@/components/toast-playground";
import { loadAppInfo } from "@/lib/app-info";

export const Route = createFileRoute("/toast-playground")({
  beforeLoad: async () => {
    const info = await loadAppInfo();
    if (info.isPackaged) {
      throw redirect({ to: "/" });
    }
  },
  component: ToastPlayground,
});
