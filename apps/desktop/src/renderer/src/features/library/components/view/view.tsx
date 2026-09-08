import { useCallback, useEffect } from "react";
import {
  LibraryEmpty,
  LibraryLoading,
  LibrarySectionEmpty,
  MatchesEmpty,
  TrashEmpty,
  UncategorizedEmpty,
} from "@/features/library/components/empty/empty";
import { HoverPreview } from "@/features/library/components/hover-preview/hover-preview";
import { LibraryGrid } from "@/features/library/components/layouts/grid/grid";
import { LayoutSwitcher } from "@/features/library/components/layouts/switcher/switcher";
import { useGridHotkeys } from "@/features/library/hooks/use-grid-hotkeys";
import { useLibraryState } from "@/features/library/hooks/use-library-state";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import { libraryViewContext } from "@/features/library/state/library-view-context";
import { resetFilters } from "@/features/library/state/view-store";
import { useCardActions } from "@/features/saves/hooks/use-card-actions";
import { useSavePaging } from "@/features/saves/hooks/use-saves";
import {
  clearSaveSelection,
  isLibraryBackgroundTarget,
} from "@/features/saves/lib/select";
import { loadNextPage } from "@/features/saves/state/bootstrap";

export function LibraryView() {
  const data = useLibraryState();
  const nav = useLibraryNav();
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
        ) : nav.kind === "uncategorized" ? (
          <UncategorizedEmpty />
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
