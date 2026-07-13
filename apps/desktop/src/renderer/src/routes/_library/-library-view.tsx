import { useEffect } from "react";
import { LayoutSwitcher } from "@/components/layout-switcher";
import { WelcomeEmpty } from "@/components/library-empty";
import { LibraryGrid } from "@/components/library-grid";
import { useCardActions } from "@/hooks/use-card-actions";
import { useDetailRouteSync } from "@/hooks/use-detail-route";
import { useLibraryState } from "@/hooks/use-library-state";
import { libraryViewContext } from "@/stores/library-view-context";

export function LibraryView() {
  useDetailRouteSync();
  const data = useLibraryState();
  const actions = useCardActions(
    data.filteredIds,
    data.mode,
    data.sourceFilter,
  );

  /** Mirrors the resolved view into a lightweight store so the global dock can act on the selection without recomputing the narrowing pipeline. */
  useEffect(() => {
    libraryViewContext.set(data.filteredIds, data.mode);
  }, [data.filteredIds, data.mode]);

  return (
    <LibraryGrid.Root
      onDragOver={actions.onDragOver}
      onDrop={(e) => void actions.onDrop(e)}
    >
      {data.filtered.length === 0 ? (
        !data.bootReady ? null : data.mode === "trash" ? (
          <LibraryGrid.Empty>Trash is empty.</LibraryGrid.Empty>
        ) : data.totalSaves === 0 ? (
          <WelcomeEmpty />
        ) : (
          <LibraryGrid.Empty>
            No matches. Try a different search or clear the filter.
          </LibraryGrid.Empty>
        )
      ) : (
        <LayoutSwitcher
          viewMode={data.viewMode}
          saves={data.filtered}
          multiSelectActive={actions.multiSelectActive}
          onClick={actions.handleCardClick}
          onDoubleClick={actions.focus}
        />
      )}
    </LibraryGrid.Root>
  );
}
