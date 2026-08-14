import { getAppRouter } from "@/lib/ui/app-router";
import { clearAsk } from "@/stores/ask-store";
import { dockMode } from "@/stores/dock-mode";
import { settingsModal } from "@/stores/settings-modal";
import { setAiMode, setSearchInput } from "@/stores/view-store";

function showLibrary(): void {
  settingsModal.close();
  const router = getAppRouter();
  if (router && router.state.location.pathname !== "/") {
    router.history.push("/");
  }
}

/** Search filters the library grid, so leave other surfaces before focusing the find field. */
export function openLibrarySearch(opts?: { aiMode?: boolean }): void {
  showLibrary();
  if (opts?.aiMode != null) setAiMode(opts.aiMode);
  dockMode.open("search");
}

/** Narrow the library to one connected account or watch, then leave Sources so the grid is visible. */
export function viewAccountItems(accountId: string): void {
  clearAsk();
  setSearchInput([{ field: "account", operator: "eq", value: accountId }], "");
  dockMode.close();
  showLibrary();
}
