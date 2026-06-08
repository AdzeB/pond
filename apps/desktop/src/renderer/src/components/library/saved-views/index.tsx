import {
  IconCopyOutline18 as Copy,
  IconDotsOutline18 as Ellipsis,
  IconPencilOutline18 as Pencil,
  IconTrash2Outline18 as Trash2,
} from "@pond/icons/outline/18";
import { Button, Menu } from "@pond/ui";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/primitives/dialogs/confirm";
import { PromptDialog } from "@/components/primitives/dialogs/prompt";
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

  // The currently selected saved view surfaces as its own tab in the row, next
  // to the quick filters; the rest stay tucked inside the overflow menu.
  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  return (
    <div className={styles.tabs} role="tablist" aria-label="Filters">
      {QUICK_FILTERS.map((qf) => {
        const active = qf.id === activeQuickId;
        return (
          <Button
            size="sm"
            key={qf.id}
            data-active={active ? "true" : undefined}
            className={styles.tab}
            onClick={() => applySavedView(qf)}
          >
            {qf.name}
          </Button>
        );
      })}

      {activeView ? (
        <Button
          size="sm"
          data-active="true"
          className={styles.tab}
          onClick={() => applySavedView(activeView)}
        >
          {activeView.name}
          {activeDirty ? (
            <span className={styles.dot} role="img" aria-label="Modified" />
          ) : null}
        </Button>
      ) : null}

      {views.length > 0 ? (
        <Menu.Root>
          <Menu.Trigger variant="ghost" size="sm" icon>
            <Ellipsis width={14} height={14} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6}>
              <Menu.Popup>
                {views.map((view) => {
                  const active = view.id === activeViewId;
                  return (
                    <Menu.SubmenuRoot key={view.id}>
                      <Menu.SubmenuTrigger
                        data-active={active ? "true" : undefined}
                        onClick={() => applySavedView(view)}
                      >
                        <Menu.ItemLabel>{view.name}</Menu.ItemLabel>
                      </Menu.SubmenuTrigger>
                      <Menu.Portal>
                        <Menu.Positioner
                          side="right"
                          align="start"
                          sideOffset={-4}
                        >
                          <Menu.Popup>
                            <Menu.Item
                              onClick={() => {
                                setRenameValue(view.name);
                                setRenameTarget(view);
                              }}
                            >
                              <Menu.ItemIcon>
                                <Pencil width={14} height={14} />
                              </Menu.ItemIcon>
                              <Menu.ItemLabel>Rename</Menu.ItemLabel>
                            </Menu.Item>
                            <Menu.Item
                              onClick={() => {
                                void createSavedView({
                                  name: `${view.name} copy`,
                                  query: view.query,
                                  sortKey: view.sortKey,
                                  sortDir: view.sortDir,
                                  layout: view.layout,
                                });
                              }}
                            >
                              <Menu.ItemIcon>
                                <Copy width={14} height={14} />
                              </Menu.ItemIcon>
                              <Menu.ItemLabel>Duplicate</Menu.ItemLabel>
                            </Menu.Item>
                            <Menu.Separator />
                            <Menu.Item onClick={() => setDeleteTarget(view)}>
                              <Menu.ItemIcon>
                                <Trash2 width={14} height={14} />
                              </Menu.ItemIcon>
                              <Menu.ItemLabel>Delete</Menu.ItemLabel>
                            </Menu.Item>
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </Menu.SubmenuRoot>
                  );
                })}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : null}

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
