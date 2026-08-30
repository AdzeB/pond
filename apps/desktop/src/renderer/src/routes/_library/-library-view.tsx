import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import {
  LibraryEmpty,
  LibraryLoading,
  MatchesEmpty,
  TrashEmpty,
} from "@/components/library/empty";
import { LibraryGrid } from "@/components/library/layouts/grid";
import { LayoutSwitcher } from "@/components/shared/layout-switcher";
import { useCardActions } from "@/hooks/use-card-actions";
import { useGridHotkeys } from "@/hooks/use-grid-hotkeys";
import { useLibraryState } from "@/hooks/use-library-state";
import { useSavePaging } from "@/hooks/use-saves";
import { getAppRouter } from "@/lib/ui/app-router";
import { hydrateFullPool, loadNextPage } from "@/stores/bootstrap";
import { libraryViewContext } from "@/stores/library-view-context";
import { tabs } from "@/stores/tabs";

export function LibraryView() {
  const router = useRouter();
  const data = useLibraryState();
  const paging = useSavePaging();
  const actions = useCardActions(
    data.filteredIds,
    data.mode,
    data.sourceFilter,
  );
  useGridHotkeys(data.filteredIds);

  const canLoadAnotherPage =
    data.mode === "library" &&
    !data.hasActiveSearch &&
    !data.hasActiveFilter &&
    paging.hasMore &&
    !paging.loading;
  const onEndReached = useCallback(() => {
    void loadNextPage();
  }, []);

  /** Paging stops while narrowing, so every save has to be in the pool for the result to be whole. */
  const needsFullPool =
    data.mode !== "library" || data.hasActiveSearch || data.hasActiveFilter;
  useEffect(() => {
    if (!needsFullPool) return;
    void hydrateFullPool().catch((err) => {
      console.warn("[pond pool] full hydrate for library mode failed", err);
    });
  }, [needsFullPool]);

  useEffect(() => {
    const sync = () => {
      if (getAppRouter() !== router) return;
      libraryViewContext.set(data.filteredIds, data.mode);
    };
    sync();
    return tabs.subscribe(sync);
  }, [router, data.filteredIds, data.mode]);

  return (
    <LibraryGrid.Root
      onDragOver={actions.onDragOver}
      onDrop={(e) => void actions.onDrop(e)}
    >
      {!data.bootReady ? (
        <LibraryLoading />
      ) : data.filtered.length === 0 ? (
        data.mode === "trash" &&
        !data.hasActiveSearch &&
        !data.hasActiveFilter ? (
          <TrashEmpty />
        ) : paging.total === 0 && data.mode !== "trash" ? (
          <LibraryEmpty />
        ) : (
          <MatchesEmpty />
        )
      ) : (
        <LayoutSwitcher
          viewMode={data.viewMode}
          saves={data.filtered}
          multiSelectActive={actions.multiSelectActive}
          onClick={actions.handleCardClick}
          onAuxClick={actions.handleCardAuxClick}
          onDoubleClick={actions.focus}
          onEndReached={canLoadAnotherPage ? onEndReached : undefined}
        />
      )}
    </LibraryGrid.Root>
  );
}
