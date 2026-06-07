import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm";
import { PromptDialog } from "@/components/dialogs/prompt";
import { SavedViewContextMenu } from "@/components/menus/saved-view-context";
import { findActiveQuickFilterId, QUICK_FILTERS } from "@/lib/quick-filters";
import {
  applySavedView,
  clearActiveView,
  useActiveViewId,
  useViewStore,
} from "@/lib/stores/view-store";
import {
  createSavedView,
  deleteSavedView,
  renameSavedView,
  type SavedViewRow,
  useSavedViews,
} from "@/pool/saved-views";
import styles from "./styles.module.css";

export function SavedViews() {
  const views = useSavedViews();
  const activeViewId = useActiveViewId();
  const { query, sortKey, sortDir } = useViewStore();

  const [renameTarget, setRenameTarget] = useState<SavedViewRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SavedViewRow | null>(null);

  // The active view is "modified" when the live query/sort diverge from what
  // was saved — Save then updates the view in place.
  const activeDirty = useMemo(() => {
    const active = views.find((v) => v.id === activeViewId);
    if (!active) return false;
    return (
      JSON.stringify(active.query) !== JSON.stringify(query) ||
      active.sortKey !== sortKey ||
      active.sortDir !== sortDir
    );
  }, [views, activeViewId, query, sortKey, sortDir]);

  // When no saved view is explicitly active, fall back to matching the live
  // state against a quick filter so e.g. "Recently Saved" shows selected on
  // load.
  const activeQuickId =
    activeViewId ?? findActiveQuickFilterId(query, sortKey, sortDir);

  return (
    <div className={styles.tabs} role="tablist" aria-label="Filters">
      {QUICK_FILTERS.map((qf) => {
        const active = qf.id === activeQuickId;
        return (
          <button
            key={qf.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={styles.tab}
            data-active={active ? "true" : undefined}
            onClick={() => applySavedView(qf)}
          >
            <span className={styles.label}>{qf.name}</span>
          </button>
        );
      })}

      {views.length > 0 ? (
        <span className={styles.separator} aria-hidden="true" />
      ) : null}

      {views.map((view) => {
        const active = view.id === activeViewId;
        return (
          <SavedViewContextMenu
            key={view.id}
            onRename={() => {
              setRenameValue(view.name);
              setRenameTarget(view);
            }}
            onDuplicate={() => {
              void createSavedView({
                name: `${view.name} copy`,
                query: view.query,
                sortKey: view.sortKey,
                sortDir: view.sortDir,
                layout: view.layout,
              });
            }}
            onRequestDelete={() => setDeleteTarget(view)}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className={styles.tab}
              data-active={active ? "true" : undefined}
              onClick={() => applySavedView(view)}
            >
              <span className={styles.label}>{view.name}</span>
              {active && activeDirty ? (
                <span className={styles.dot} role="img" aria-label="Modified" />
              ) : null}
            </button>
          </SavedViewContextMenu>
        );
      })}

      <PromptDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        title="Rename view"
        value={renameValue}
        onValueChange={setRenameValue}
        placeholder="View name"
        confirmLabel="Rename"
        onConfirm={() => {
          if (renameTarget) {
            void renameSavedView(renameTarget.id, renameValue.trim());
          }
          setRenameTarget(null);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete "${deleteTarget?.name ?? ""}"?`}
        description="This removes the saved view. Your saves are not affected."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) {
            if (deleteTarget.id === activeViewId) clearActiveView();
            void deleteSavedView(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
