import { LayoutSwitcher } from "@/components/layout-switcher";
import { WelcomeEmpty } from "@/components/library-empty";
import { LibraryGrid } from "@/components/library-grid";
import { useCardActions } from "@/hooks/use-card-actions";
import { useLibraryState } from "@/hooks/use-library-state";
import { useIngestingCount } from "@/hooks/use-saves";

export function LibraryView() {
  const data = useLibraryState();
  const actions = useCardActions(
    data.filteredIds,
    data.mode,
    data.sourceFilter,
  );

  // Surface in-flight saves as a leading grid tile, scoped to the current view. The
  // grid filter hides "ingesting" saves, so the placeholder is the only proof they exist.
  const ingestingCount = useIngestingCount(
    data.mode === "source" ? data.sourceFilter : undefined,
  );
  const placeholderCount =
    data.mode === "library" || data.mode === "source" ? ingestingCount : 0;

  return (
    <LibraryGrid.Root
      onDragOver={actions.onDragOver}
      onDrop={(e) => void actions.onDrop(e)}
    >
      {data.filtered.length === 0 && placeholderCount === 0 ? (
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
          placeholderCount={placeholderCount}
          onClick={actions.handleCardClick}
          onDoubleClick={actions.focus}
        />
      )}
    </LibraryGrid.Root>
  );
}
