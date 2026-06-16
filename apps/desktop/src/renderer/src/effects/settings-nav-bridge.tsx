import { useEffect } from "react";
import { settings } from "@/stores/settings-dialog";

// Menu / tray / deep-link navigation arrives over `IPC.nav` as a path string.
// Settings is no longer a route, so intercept `/settings[/<section>]` here and
// open the dialog at the requested section instead of routing.
export function SettingsNavBridge() {
  useEffect(() => {
    return window.pond.onNavigate((path) => {
      const pathname = path.split("?")[0] ?? "";
      if (pathname !== "/settings" && !pathname.startsWith("/settings/")) {
        return;
      }
      const section = pathname.slice("/settings/".length) || undefined;
      settings.open(section);
    });
  }, []);

  return null;
}
