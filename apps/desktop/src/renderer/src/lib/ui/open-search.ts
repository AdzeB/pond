import { getAppRouter } from "@/lib/ui/app-router";
import { libraryHeader } from "@/stores/library-header";
import { settingsModal } from "@/stores/settings-modal";
import { setSearchInput } from "@/stores/view-store";

function showLibrary(): void {
  settingsModal.close();
  const router = getAppRouter();
  if (router && router.state.location.pathname !== "/") {
    router.history.push("/");
  }
}

export function focusLibrarySearch(): void {
  const pathname = getAppRouter()?.state.location.pathname ?? "";
  if (pathname.startsWith("/sources")) {
    settingsModal.close();
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-sources-search]")?.focus();
    });
    return;
  }
  if (pathname.startsWith("/downloads")) {
    settingsModal.close();
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-downloads-search]")?.focus();
    });
    return;
  }
  showLibrary();
  libraryHeader.focusSearch();
}

export function viewAccountItems(accountId: string): void {
  setSearchInput([{ field: "account", operator: "eq", value: accountId }], "");
  showLibrary();
}
