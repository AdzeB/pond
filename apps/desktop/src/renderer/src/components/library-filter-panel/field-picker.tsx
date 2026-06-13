import { FIELD_IDS, FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { type ReactElement, useMemo, useState } from "react";
import { FIELD_UI } from "@/components/library-view-menu/filter/field-ui";
import styles from "./styles.module.css";

const GROUP_ORDER = ["content", "media", "time", "people"] as const;

const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  content: "Content",
  media: "Media",
  time: "Time",
  people: "People",
};

interface FieldPickerProps {
  value: FieldId;
  onSelect: (field: FieldId) => void;
  trigger: ReactElement;
}

export function FieldPicker({ value, onSelect, trigger }: FieldPickerProps) {
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
