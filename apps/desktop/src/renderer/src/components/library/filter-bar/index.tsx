import { IconPlusOutline12 as Plus } from "@pond/icons/outline/12";
import { IconTrash2Outline18 as Trash } from "@pond/icons/outline/18";
import { FIELD_IDS } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { isPredicate } from "@pond/schema/filters/types";
import { useMemo, useState } from "react";
import { PromptDialog } from "@/components/dialogs/prompt";
import { AddFilterMenu } from "@/components/menus/add-filter";
import { FilterChip } from "@/components/menus/filter-field";
import { useView } from "@/components/menus/view";
import { applySavedView, useActiveViewId } from "@/lib/stores/view-store";
import {
  createSavedView,
  updateSavedView,
  useSavedViews,
} from "@/pool/saved-views";
import styles from "./styles.module.css";

export function FilterBar() {
  const { state, actions } = useView();
  const { setFieldPredicate, resetFilters } = actions;

  const activeViewId = useActiveViewId();
  const views = useSavedViews();
  const [promptOpen, setPromptOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  // One predicate per field: committed clauses first, then any pending
  // (empty, mid-edit) drafts, rendered in canonical field order.
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
  // Show Save when there's something worth persisting: unsaved filters, or a
  // modified active view.
  const showSave = (hasFilters && activeView == null) || dirty;

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
    // biome-ignore lint/a11y/useSemanticElements: a fieldset's default form semantics and layout don't fit this filter toolbar
    <div className={styles.bar} role="group" aria-label="Filters">
      {activeFields.map((field) => (
        <FilterChip
          key={field}
          field={field}
          predicate={byField.get(field) ?? null}
          onChange={setFieldPredicate}
        />
      ))}

      <AddFilterMenu>
        <button type="button" className={styles.add} aria-label="Add filter">
          <Plus width="0.9em" height="0.9em" />
          {activeFields.length === 0 ? <span>Filter</span> : null}
        </button>
      </AddFilterMenu>

      {hasFilters ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.clear}
            onClick={() => resetFilters()}
            aria-label="Clear all filters"
          >
            <Trash width="0.9em" height="0.9em" />
          </button>
          {showSave ? (
            <button type="button" className={styles.save} onClick={saveView}>
              {activeView && dirty ? "Save changes" : "Save"}
            </button>
          ) : null}
        </div>
      ) : null}

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
