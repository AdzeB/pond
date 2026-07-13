import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { primarySelection, primarySelectionStore } from "@/stores/selection";

type AnyRouter = ReturnType<typeof useRouter>;

function readDetail(router: AnyRouter): string | null {
  return (router.state.location.search as { detail?: string }).detail ?? null;
}

/**
 * Syncs the open save with the `detail` search param so opening/closing a save is a real history entry.
 * @remarks Each subscription reads the other side's live committed value, so once store and URL agree every listener is a no-op and nothing oscillates.
 */
export function useDetailRouteSync(): void {
  const router = useRouter();

  useEffect(() => {
    /** Back/Forward, deep links, and our own navigations all resolve here and drive the open save. */
    const syncUrlToStore = () => {
      const detail = readDetail(router);
      if (primarySelection.get() !== detail) primarySelection.set(detail);
    };

    /** Opening pushes a new history entry; closing replaces so Back stays symmetric. */
    const syncStoreToUrl = () => {
      const id = primarySelection.get();
      const detail = readDetail(router);
      if (id === detail) return;
      void router.navigate({
        to: router.state.location.pathname,
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          detail: id ?? undefined,
        }),
        replace: id === null,
      } as unknown as Parameters<AnyRouter["navigate"]>[0]);
    };

    /** On mount the URL is the source of truth — deep links, restored windows — so seed the store from it. */
    syncUrlToStore();

    const unsubHistory = router.subscribe("onResolved", syncUrlToStore);
    const storeSub = primarySelectionStore.subscribe(syncStoreToUrl);
    return () => {
      unsubHistory();
      storeSub.unsubscribe();
    };
  }, [router]);
}
