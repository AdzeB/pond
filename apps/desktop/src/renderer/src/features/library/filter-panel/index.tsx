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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDownOutline12 as ChevronDown,
  IconPlusOutline12 as Plus,
} from "@pond/icons/outline/12";
import {
  IconGripDotsVerticalOutline18 as Grip,
  IconTrash2Outline18 as Trash,
} from "@pond/icons/outline/18";
import { FIELD_IDS, FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu, Popover } from "@pond/ui";
import { type ReactElement, useMemo, useState } from "react";
import {
  createSavedView,
  updateSavedView,
  useSavedViews,
} from "@/core/data/saved-views";
import { PromptDialog } from "@/core/ui/prompt-dialog";
import { useView } from "@/features/library/hooks/use-view";
import { FIELD_UI } from "@/features/library/menus/view/filter/field-ui";
import { defaultPredicateFor } from "@/features/library/menus/view/filter/helpers";
import {
  changeComparator,
  operatorOptions,
  operatorPhrase,
} from "@/features/library/menus/view/filter/operators";
import {
  Body,
  summariseValue,
} from "@/features/library/menus/view/filter/value-select";
import {
  applySavedView,
  useActiveViewId,
  useViewStore,
} from "@/features/library/stores/view-store";
import styles from "./styles.module.css";

const GROUP_ORDER = ["content", "media", "time", "people"] as const;

const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  content: "Content",
  media: "Media",
  time: "Time",
  people: "People",
};

interface FilterPanelProps {
  children: ReactElement;
  align?: "start" | "end";
  side?: "top" | "bottom";
}

export function FilterPanel({
  children,
  align = "end",
  side = "bottom",
}: FilterPanelProps) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const { query, sortKey, sortDir, layout } = useViewStore();

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
      <Popover.Root>
        <Popover.Trigger render={children} />
        <Popover.Portal>
          <Popover.Positioner side={side} align={align} sideOffset={6}>
            <Popover.Popup className={styles.panel}>
              <PanelContent
                onRequestSaveNew={() => {
                  setDraftName("");
                  setPromptOpen(true);
                }}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

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

interface ConditionRowProps {
  index: number;
  predicate: Predicate;
  combinator: "and" | "or";
  onSetCombinator: (next: "and" | "or") => void;
  onChangeField: (field: FieldId) => void;
  onChange: (next: Predicate) => void;
  onRemove: () => void;
}

function ConditionRow({
  index,
  predicate,
  combinator,
  onSetCombinator,
  onChangeField,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(index) });

  const meta = FIELD_META[predicate.field];
  const FieldIcon = FIELD_UI[predicate.field].icon;
  const opOptions = operatorOptions(predicate);
  const valueless = predicate.operator === "empty";
  const summary = summariseValue(predicate);
  const valueEmpty = summary === "Select";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} className={styles.row} style={style}>
      <Conjunction
        index={index}
        combinator={combinator}
        onSetCombinator={onSetCombinator}
      />

      <FieldPicker
        value={predicate.field}
        onSelect={onChangeField}
        trigger={
          <button type="button" className={`${styles.control} ${styles.field}`}>
            <span className={styles.fieldIcon}>
              <FieldIcon width={14} height={14} />
            </span>
            <span className={styles.controlLabel}>{meta.label}</span>
            <ChevronDown width={10} height={10} className={styles.chevron} />
          </button>
        }
      />

      {opOptions.length > 0 ? (
        <Menu.Root>
          <Menu.Trigger
            render={
              <button
                type="button"
                className={styles.operator}
                aria-label={`${meta.label} operator`}
              >
                {operatorPhrase(predicate)}
              </button>
            }
          />
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="start" sideOffset={6}>
              <Menu.Popup>
                {opOptions.map((option) => (
                  <Menu.Item
                    key={option.operator}
                    data-checked={
                      option.operator === predicate.operator ? "" : undefined
                    }
                    onClick={() =>
                      onChange(changeComparator(predicate, option.operator))
                    }
                  >
                    <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : (
        <span className={styles.operator}>{operatorPhrase(predicate)}</span>
      )}

      {valueless ? null : (
        <Menu.Root>
          <Menu.Trigger
            render={
              <button
                type="button"
                className={`${styles.control} ${styles.value}`}
                data-empty={valueEmpty ? "true" : undefined}
                aria-label={`${meta.label} value`}
              >
                <span className={styles.controlLabel}>{summary}</span>
                <ChevronDown
                  width={10}
                  height={10}
                  className={styles.chevron}
                />
              </button>
            }
          />
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="start" sideOffset={6}>
              <Menu.Popup>
                <Body predicate={predicate} onChange={onChange} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}

      <button
        type="button"
        className={styles.iconButton}
        aria-label={`Remove ${meta.label} condition`}
        onClick={onRemove}
      >
        <Trash width={15} height={15} />
      </button>

      <button
        type="button"
        className={`${styles.iconButton} ${styles.handle}`}
        aria-label="Reorder condition"
        {...attributes}
        {...listeners}
      >
        <Grip width={15} height={15} />
      </button>
    </div>
  );
}

interface ConjunctionProps {
  index: number;
  combinator: "and" | "or";
  onSetCombinator: (next: "and" | "or") => void;
}

function Conjunction({ index, combinator, onSetCombinator }: ConjunctionProps) {
  if (index === 0) {
    return <span className={styles.conj}>Where</span>;
  }

  const label = combinator === "or" ? "Or" : "And";

  if (index > 1) {
    return <span className={styles.conj}>{label}</span>;
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            className={`${styles.control} ${styles.conj}`}
            aria-label="Combinator"
          >
            <span className={styles.controlLabel}>{label}</span>
            <ChevronDown width={10} height={10} className={styles.chevron} />
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup>
            <Menu.Item
              data-checked={combinator === "and" ? "" : undefined}
              onClick={() => onSetCombinator("and")}
            >
              <Menu.ItemLabel>And</Menu.ItemLabel>
            </Menu.Item>
            <Menu.Item
              data-checked={combinator === "or" ? "" : undefined}
              onClick={() => onSetCombinator("or")}
            >
              <Menu.ItemLabel>Or</Menu.ItemLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

interface FieldPickerProps {
  value: FieldId;
  onSelect: (field: FieldId) => void;
  trigger: ReactElement;
}

function FieldPicker({ value, onSelect, trigger }: FieldPickerProps) {
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return GROUP_ORDER.map((group) => ({
      group,
      label: GROUP_LABEL[group],
      fields: FIELD_IDS.filter(
        (id) =>
          FIELD_META[id].group === group &&
          (!needle || FIELD_META[id].label.toLowerCase().includes(needle)),
      ),
    })).filter((section) => section.fields.length > 0);
  }, [query]);

  return (
    <Menu.Root
      onOpenChange={(next) => {
        if (!next) setQuery("");
      }}
    >
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup>
            <Menu.Input
              value={query}
              placeholder="Field…"
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
            {sections.length === 0 ? (
              <div className={styles.empty}>No fields.</div>
            ) : (
              sections.map((section) => (
                <Menu.Group key={section.group}>
                  <Menu.GroupLabel>{section.label}</Menu.GroupLabel>
                  {section.fields.map((field) => {
                    const Icon = FIELD_UI[field].icon;
                    return (
                      <Menu.Item
                        key={field}
                        data-checked={field === value ? "" : undefined}
                        onClick={() => onSelect(field)}
                      >
                        <Menu.ItemIcon>
                          <Icon width={16} height={16} />
                        </Menu.ItemIcon>
                        <Menu.ItemLabel>
                          {FIELD_META[field].label}
                        </Menu.ItemLabel>
                      </Menu.Item>
                    );
                  })}
                </Menu.Group>
              ))
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
