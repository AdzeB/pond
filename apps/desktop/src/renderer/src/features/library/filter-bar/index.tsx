import { IconPlusOutline12 as Plus } from "@pond/icons/outline/12";
import { FIELD_IDS } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { isPredicate } from "@pond/schema/filters/types";
import { Button } from "@pond/ui";
import { useMemo, useState } from "react";
import {
  createSavedView,
  updateSavedView,
  useSavedViews,
} from "@/core/data/saved-views";
import { PromptDialog } from "@/core/ui/prompt-dialog";
import { useView } from "@/features/library/hooks/use-view";
import { AddFilterMenu } from "@/features/library/menus/add-filter";
import { FilterChip } from "@/features/library/menus/filter-field";
import {
  applySavedView,
  useActiveViewId,
} from "@/features/library/stores/view-store";
import styles from "./styles.module.css";

export function FilterBar() {
  const { state, actions } = useView();
  const { setFieldPredicate, resetFilters } = actions;

  const activeViewId = useActiveViewId();
  const views = useSavedViews();
  const [promptOpen, setPromptOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  const byField = useMemo(() => {
    const map = new Map<FieldId, Predicate>();
    for (const clause of state.query.rules) {
      if (isPredicate(clause) && !map.has(clause.field)) {
        map.set(clause.field, clause);
      }
    }
    for (const pending of state.pendingPredicates) {
      if (!map.has(pending.field)) map.set(pending.field, pending);
    }
    return map;
  }, [state.query.rules, state.pendingPredicates]);

  const activeFields = useMemo(
    () => FIELD_IDS.filter((field) => byField.has(field)),
    [byField],
  );

  const hasFilters = state.query.rules.length > 0;
  const activeView = views.find((v) => v.id === activeViewId) ?? null;
  const dirty =
    activeView != null &&
    (JSON.stringify(activeView.query) !== JSON.stringify(state.query) ||
      activeView.sortKey !== state.sort.key ||
      activeView.sortDir !== state.sort.dir);

  const showSave = (hasFilters && activeView == null) || dirty;

  if (activeFields.length === 0) return null;

  const saveView = () => {
    if (activeView && dirty) {
      void updateSavedView(activeView.id, {
        query: state.query,
        sortKey: state.sort.key,
        sortDir: state.sort.dir,
        layout: state.layout,
      });
      return;
    }
    setDraftName("");
    setPromptOpen(true);
  };

  const confirmCreate = () => {
    const name = draftName.trim();
    if (!name) return;
    void createSavedView({
      name,
      query: state.query,
      sortKey: state.sort.key,
      sortDir: state.sort.dir,
      layout: state.layout,
    }).then((id) => {
      if (id) {
        applySavedView({
          id,
          query: state.query,
          sortKey: state.sort.key,
          sortDir: state.sort.dir,
          layout: state.layout,
        });
      }
    });
    setPromptOpen(false);
  };

  return (
    <div className={styles.bar}>
      <div className={styles.chips}>
        {activeFields.map((field) => (
          <FilterChip
            key={field}
            field={field}
            predicate={byField.get(field) ?? null}
            onChange={setFieldPredicate}
          />
        ))}

        <AddFilterMenu>
          <Button size="sm" className={styles.add} icon aria-label="Add filter">
            <Plus width={10} height={10} />
          </Button>
        </AddFilterMenu>
      </div>

      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resetFilters()}
          aria-label="Clear all filters"
        >
          Trash
        </Button>
        {showSave ? (
          <Button
            variant="primary"
            size="sm"
            onClick={saveView}
            aria-label="Save view"
          >
            Save
          </Button>
        ) : null}
      </div>

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
    </div>
  );
}
