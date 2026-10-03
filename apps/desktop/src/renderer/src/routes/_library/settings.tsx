import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsPage } from "@/features/settings/components/page";

export const Route = createFileRoute("/_library/settings")({
  beforeLoad: async ({ location }) => {
    if (!window.pond?.openSettingsWindow) return;
    const section = location.pathname.replace(/^\/settings\/?/, "");
    if (section === "tags") throw redirect({ href: "/tags" });
    await window.pond.openSettingsWindow({
      section: section || undefined,
      hash: location.hash || undefined,
    });
    throw redirect({ href: "/" });
  },
  component: SettingsPage,
});
