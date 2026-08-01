import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutSwitcher } from "@/components/layout-switcher";
import { WelcomeEmpty } from "@/components/library-empty";
import { LibraryGrid } from "@/components/library-grid";
import { useCardActions } from "@/hooks/use-card-actions";
import { useGridHotkeys } from "@/hooks/use-grid-hotkeys";
import { useLibraryState } from "@/hooks/use-library-state";
import { getAppRouter } from "@/lib/ui/app-router";
import { libraryViewContext } from "@/stores/library-view-context";
import { tabs } from "@/stores/tabs";

export function LibraryView() {
  const router = useRouter();
  const data = useLibraryState();
  const actions = useCardActions(
    data.filteredIds,
    data.mode,
    data.sourceFilter,
  );
  useGridHotkeys(data.filteredIds);

  /** Only the active tab's view owns the dock/context snapshot; background tabs stay mounted for state but must not overwrite it. */
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
          onAuxClick={actions.handleCardAuxClick}
          onDoubleClick={actions.focus}
        />
      )}
    </LibraryGrid.Root>
  );
}
