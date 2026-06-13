import { LayoutSwitcher } from "@/components/layout-switcher";
import { LibraryGrid } from "@/components/library-grid";
import { useCardActions } from "@/hooks/use-card-actions";
import { useLibraryState } from "@/hooks/use-library-state";

export function LibraryView() {
  const data = useLibraryState();
  const actions = useCardActions(
    data.filteredIds,
    data.mode,
    data.sourceFilter,
  );

  return (
    <LibraryGrid.Root
      view={data.viewMode === "list" ? "list" : "grid"}
      onDragOver={actions.onDragOver}
      onDrop={(e) => void actions.onDrop(e)}
    >
      {data.filtered.length === 0 ? (
        !data.bootReady ? null : data.mode === "trash" ? (
          <LibraryGrid.Empty>Trash is empty.</LibraryGrid.Empty>
        ) : data.totalSaves === 0 ? (
          <LibraryGrid.Empty>
            No saves yet. Drop a link, image, or file to get started.
          </LibraryGrid.Empty>
        ) : (
          <LibraryGrid.Empty>
            No matches. Try a different search or clear the filter.
          </LibraryGrid.Empty>
        )
      ) : (
        <LayoutSwitcher
          viewMode={data.viewMode}
          saves={data.filtered}
          selectedId={data.selectedId}
          multiSelectActive={actions.multiSelectActive}
          onClick={actions.handleCardClick}
          onDoubleClick={actions.focus}
        />
      )}
    </LibraryGrid.Root>
  );
}
