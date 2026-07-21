import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { OnboardingGate } from "@/components/onboarding";
import { SaveDetailModal } from "@/components/save-detail-modal";
import { SettingsModal } from "@/components/settings-modal";
import { Tray } from "@/components/tray";
import { settingsModal } from "@/stores/settings-modal";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  /** Menu / tray / deep-link navigation arrives over `IPC.nav` as a path string; settings lives in a modal, so its paths open it instead of routing. */
  useEffect(() => {
    return window.pond.onNavigate((path) => {
      const pathname = path.split("?")[0] ?? "";
      if (pathname === "/settings") {
        settingsModal.open();
        return;
      }
      if (pathname.startsWith("/settings/")) {
        settingsModal.open(pathname.slice("/settings/".length));
      }
    });
  }, []);

  return (
    <>
      <Outlet />
      <Tray.Library />
      <SaveDetailModal />
      <SettingsModal />
      <OnboardingGate />
    </>
  );
}
