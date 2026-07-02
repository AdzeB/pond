import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { primarySelection, primarySelectionStore } from "@/stores/selection";

type AnyRouter = ReturnType<typeof useRouter>;

function readDetail(router: AnyRouter): string | null {
  return (router.state.location.search as { detail?: string }).detail ?? null;
}

// Keeps the open save (primarySelectionStore) in sync with a `detail` search
// param so opening/closing a save is a real history entry -- Back/Forward move
// in and out of the detail overlay while the grid route stays mounted beneath.
//
// Both directions are wired as imperative subscriptions that read the OTHER
// side's *live committed* value at the moment of the change (not a render-time
// snapshot). That is what keeps it from oscillating: once the store and the URL
// agree, each listener is a genuine no-op, so a change on one side settles the
// other in a single hop instead of the two directions swapping stale snapshots.
export function useDetailRouteSync(): void {
  const router = useRouter();

  useEffect(() => {
    // URL -> store: Back/Forward, deep links, and our own navigations resolve
    // here and drive the open save.
    const syncUrlToStore = () => {
      const detail = readDetail(router);
      if (primarySelection.get() !== detail) primarySelection.set(detail);
    };

    // store -> URL: every existing writer (card click, ask-bar, menus, close)
    // sets primarySelection; reflect that as a navigation. Opening pushes a new
    // entry; closing replaces so Back stays symmetric.
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

    // Initial reconcile: on mount the URL is the source of truth (deep links,
    // restored windows), so seed the store from it.
    syncUrlToStore();

    const unsubHistory = router.subscribe("onResolved", syncUrlToStore);
    const storeSub = primarySelectionStore.subscribe(syncStoreToUrl);
    return () => {
      unsubHistory();
      storeSub.unsubscribe();
    };
  }, [router]);
}
