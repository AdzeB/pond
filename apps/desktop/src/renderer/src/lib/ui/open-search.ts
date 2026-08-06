import { getAppRouter } from "@/lib/ui/app-router";
import { dockMode } from "@/stores/dock-mode";
import { settingsModal } from "@/stores/settings-modal";

/** Search filters the library grid, so leave other surfaces before focusing the find field. */
export function openLibrarySearch(): void {
  settingsModal.close();
  const router = getAppRouter();
  if (router && router.state.location.pathname !== "/") {
    router.history.push("/");
  }
  dockMode.open("search");
}
