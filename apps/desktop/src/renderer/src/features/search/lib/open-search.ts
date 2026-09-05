import { setSearchInput } from "@/features/library/state/view-store";
import { getAppRouter } from "@/shared/lib/app-router";

function showLibrary(): void {
  const router = getAppRouter();
  if (router && router.state.location.pathname !== "/") {
    router.history.push("/");
  }
}

export function viewAccountItems(accountId: string): void {
  setSearchInput([{ field: "account", operator: "eq", value: accountId }], "");
  showLibrary();
}
