import { setSearchInput } from "@/features/library/state/view-store";
import { getAppRouter } from "@/shared/lib/app-router";

function showLibrary(): void {
  const router = getAppRouter();
  if (router && router.state.location.pathname !== "/") {
    router.history.push("/");
  }
}

export function viewAccountItems(accountId: string | readonly string[]): void {
  const ids = Array.isArray(accountId) ? [...accountId] : [accountId];
  const id = ids[0];
  if (!id) return;
  setSearchInput(
    ids.length === 1
      ? [{ field: "account", operator: "eq", value: id }]
      : [{ field: "account", operator: "in", value: ids }],
    "",
  );
  showLibrary();
}
