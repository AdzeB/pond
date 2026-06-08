import { IconCalendarFill18 as Calendar } from "@pond/icons/fill/18";
import { FIELD_IDS, FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { isPredicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { type ReactElement, useMemo, useState } from "react";
import { FIELD_UI } from "@/components/primitives/menus/view/filter/field-ui";
import { defaultPredicateFor } from "@/components/primitives/menus/view/filter/helpers";
import { Body } from "@/components/primitives/menus/view/filter/value-select";
import { useView } from "@/lib/hooks/use-view";
import styles from "./styles.module.css";

const GROUP_ORDER = ["content", "media", "time", "people"] as const;

const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  content: "Content",
  media: "Media",
  time: "Time",
  people: "People",
};

interface Section {
  group: (typeof GROUP_ORDER)[number];
  label: string;
  fields: FieldId[];
}

interface AddFilterMenuProps {
  open?: boolean;
  align?: "start" | "end";
  children: ReactElement;
  onOpenChange?: (open: boolean) => void;
}

export function AddFilterMenu({
  children,
  open: controlledOpen,
  align = "start",
  onOpenChange,
}: AddFilterMenuProps) {
  const { state, actions } = useView();
  const [internalOpen, setInternalOpen] = useState(false);
  const _open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [query, setQuery] = useState("");

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

  const searching = query.trim().length > 0;

  const sections = useMemo<Section[]>(() => {
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
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <Menu.Trigger render={children} />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align={align} sideOffset={6}>
          <Menu.Popup>
            <Menu.Input
              value={query}
              placeholder="Filter by…"
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
            {sections.length === 0 ? (
              <div className={styles.empty}>No fields.</div>
            ) : (
              sections.map((section) =>
                // The date fields collapse into a single "Dates" submenu (like
                // Linear), except while searching — then they stay flat so the
                // typed query can surface them directly.
                section.group === "time" && !searching ? (
                  <Menu.Group key={section.group}>
                    <DatesSubmenu
                      fields={section.fields}
                      byField={byField}
                      onChange={actions.setFieldPredicate}
                    />
                  </Menu.Group>
                ) : (
                  <Menu.Group key={section.group}>
                    {section.fields.map((field) => (
                      <FieldSubmenu
                        key={field}
                        field={field}
                        predicate={byField.get(field) ?? null}
                        onChange={(next) =>
                          actions.setFieldPredicate(field, next)
                        }
                      />
                    ))}
                  </Menu.Group>
                ),
              )
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

interface DatesSubmenuProps {
  fields: FieldId[];
  byField: Map<FieldId, Predicate>;
  onChange: (field: FieldId, next: Predicate | null) => void;
}

// Groups the date fields (Saved / Published / Modified) behind a single
// "Dates" entry; each opens its own value-picker submenu one level deeper.
function DatesSubmenu({ fields, byField, onChange }: DatesSubmenuProps) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>
          <Calendar width={16} height={16} />
        </Menu.ItemIcon>
        <Menu.ItemLabel>Dates</Menu.ItemLabel>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side="right" align="start" sideOffset={-4}>
          <Menu.Popup>
            {fields.map((field) => (
              <FieldSubmenu
                key={field}
                field={field}
                predicate={byField.get(field) ?? null}
                onChange={(next) => onChange(field, next)}
              />
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

interface FieldSubmenuProps {
  field: FieldId;
  predicate: Predicate | null;
  onChange: (next: Predicate) => void;
}

function FieldSubmenu({ field, predicate, onChange }: FieldSubmenuProps) {
  const Icon = FIELD_UI[field].icon;
  const draft = predicate ?? defaultPredicateFor(field);

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>
          <Icon width={16} height={16} />
        </Menu.ItemIcon>
        <Menu.ItemLabel>{FIELD_META[field].label}</Menu.ItemLabel>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side="right" align="start" sideOffset={-4}>
          <Menu.Popup>
            <Body predicate={draft} onChange={onChange} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
