import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { IconBarsFilterFill18 as Funnel } from "@pond/icons/fill/18";
import { IconPlusOutline12 as Plus } from "@pond/icons/outline/12";
import { Menu } from "@pond/ui";
import { useMemo, useState } from "react";
import { AppliedBadge } from "@/components/library-view-menu/submenu";
import { PromptDialog } from "@/components/prompt-dialog";
import { useView } from "@/hooks/use-view";
import { defaultPredicateFor } from "@/lib/filter-helpers";
import {
  createSavedView,
  updateSavedView,
  useSavedViews,
} from "@/stores/saved-views";
import {
  applySavedView,
  useActiveViewId,
  useViewStore,
} from "@/stores/view-store";
import { ConditionRow } from "./condition-row";
import styles from "./styles.module.css";

// Nested "Filter by" entry for the View options menu. Renders the filter
// builder inside a submenu popup so filtering lives alongside layout/sort/etc.
export function FilterSubmenu() {
  const [promptOpen, setPromptOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const { query, sortKey, sortDir, layout } = useViewStore();
  const appliedCount = query.rules.length;

  const confirmCreate = () => {
    const name = draftName.trim();
    if (!name) return;
    void createSavedView({
      name,
      query,
      sortKey,
      sortDir,
      layout,
    }).then((id) => {
      if (id) {
        applySavedView({ id, query, sortKey, sortDir, layout });
      }
    });
    setPromptOpen(false);
  };

  return (
    <>
      <Menu.SubmenuRoot>
        <Menu.SubmenuTrigger>
          <Menu.ItemIcon>
            <Funnel />
          </Menu.ItemIcon>
          <Menu.ItemLabel>Filter by</Menu.ItemLabel>
          <AppliedBadge count={appliedCount} />
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner align="start" sideOffset={6}>
            <Menu.Popup className={styles.panel}>
              <PanelContent
                onRequestSaveNew={() => {
                  setDraftName("");
                  setPromptOpen(true);
                }}
              />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>

      <PromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        title="Save view"
        description="Save the current filters and sort as a named view."
        value={draftName}
        onValueChange={setDraftName}
        placeholder="View name"
        confirmLabel="Save"
        onConfirm={confirmCreate}
      />
    </>
  );
}

interface PanelContentProps {
  onRequestSaveNew: () => void;
}

function PanelContent({ onRequestSaveNew }: PanelContentProps) {
  const { state, actions } = useView();
  const { rows, combinator, query } = state;

  const views = useSavedViews();
  const activeViewId = useActiveViewId();
  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  const dirty =
    activeView != null &&
    (JSON.stringify(activeView.query) !== JSON.stringify(query) ||
      activeView.sortKey !== state.sort.key ||
      activeView.sortDir !== state.sort.dir);

  const hasActiveFilters = query.rules.length > 0;
  const showSave = (hasActiveFilters && activeView == null) || dirty;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    actions.reorderRows(Number(active.id), Number(over.id));
  };

  const saveView = () => {
    if (activeView && dirty) {
      void updateSavedView(activeView.id, {
        query,
        sortKey: state.sort.key,
        sortDir: state.sort.dir,
        layout: state.layout,
      });
      return;
    }
    onRequestSaveNew();
  };

  const ids = useMemo(() => rows.map((_, i) => String(i)), [rows]);

  return (
    <div>
      <div className={styles.header}>
        <span className={styles.title}>Filter by</span>
        <div className={styles.headerActions}>
          {showSave ? (
            <button
              type="button"
              className={styles.linkButton}
              onClick={saveView}
            >
              {activeView && dirty ? "Update view" : "Save view"}
            </button>
          ) : null}
          {rows.length > 0 ? (
            <button
              type="button"
              className={styles.linkButton}
              data-muted="true"
              onClick={() => actions.resetFilters()}
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>No conditions yet.</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className={styles.rows}>
              {rows.map((row, index) => (
                <ConditionRow
                  // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and reordered via the store
                  key={index}
                  index={index}
                  predicate={row}
                  combinator={combinator}
                  onSetCombinator={actions.setCombinator}
                  onChangeField={(field) =>
                    actions.updateRow(index, defaultPredicateFor(field))
                  }
                  onChange={(next) => actions.updateRow(index, next)}
                  onRemove={() => actions.removeRow(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.add}
          onClick={() => actions.addCondition()}
        >
          <span className={styles.addIcon}>
            <Plus width={12} height={12} />
          </span>
          Add a condition
        </button>
      </div>
    </div>
  );
}
