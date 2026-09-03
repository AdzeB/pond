import { useCallback, useEffect } from "react";
import {
  LibraryEmpty,
  LibraryLoading,
  LibrarySectionEmpty,
  MatchesEmpty,
  TrashEmpty,
} from "@/components/library/empty";
import { HoverPreview } from "@/components/library/hover-preview";
import { LibraryGrid } from "@/components/library/layouts/grid";
import { LayoutSwitcher } from "@/components/shared/layout-switcher";
import { useCardActions } from "@/hooks/use-card-actions";
import { useGridHotkeys } from "@/hooks/use-grid-hotkeys";
import { useLibraryState } from "@/hooks/use-library-state";
import { useSavePaging } from "@/hooks/use-saves";
import {
  clearSaveSelection,
  isLibraryBackgroundTarget,
} from "@/lib/save/select";
import { loadNextPage } from "@/stores/bootstrap";
import { libraryViewContext } from "@/stores/library-view-context";
import { resetFilters } from "@/stores/view-store";

export function LibraryView() {
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

  useEffect(() => {
    libraryViewContext.set(data.filteredIds, data.mode);
  }, [data.filteredIds, data.mode]);

  return (
    <LibraryGrid.Root
      data-library-grid=""
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        if (!isLibraryBackgroundTarget(event.target)) return;
        clearSaveSelection();
      }}
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
        ) : data.hasActiveSearch || data.hasActiveFilter ? (
          <MatchesEmpty onReset={resetFilters} />
        ) : data.mode !== "library" && data.mode !== "trash" ? (
          <LibrarySectionEmpty mode={data.mode} />
        ) : (
          <MatchesEmpty onReset={resetFilters} />
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
      <HoverPreview />
    </LibraryGrid.Root>
  );
}
