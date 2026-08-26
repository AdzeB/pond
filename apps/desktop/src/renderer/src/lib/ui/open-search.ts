import { getAppRouter } from "@/lib/ui/app-router";
import { dockMode } from "@/stores/dock-mode";
import { settingsModal } from "@/stores/settings-modal";
import { setSearchInput } from "@/stores/view-store";

function showLibrary(): void {
  settingsModal.close();
  const router = getAppRouter();
  if (router && router.state.location.pathname !== "/") {
    router.history.push("/");
  }
}

export function openLibrarySearch(): void {
  showLibrary();
  dockMode.open("search");
}

export function viewAccountItems(accountId: string): void {
  setSearchInput([{ field: "account", operator: "eq", value: accountId }], "");
  dockMode.close();
  showLibrary();
}
