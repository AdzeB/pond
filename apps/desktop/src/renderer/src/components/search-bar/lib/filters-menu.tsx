import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { IconBarsFilterOutline18 as Filters } from "@pond/icons/outline/18";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, FieldMeta } from "@pond/schema/filters/types";
import { Popover } from "@pond/ui";
import { Fragment, useMemo, useState } from "react";
import { ClippedScroll } from "@/components/clipped-scroll";
import { FIELD_HINTS, FIELD_ICONS } from "@/lib/search/fields";
import { canonicalKey, TOKEN_FIELDS } from "@/lib/search/syntax";
import { $insertFieldKey } from "./editor-state";
import styles from "./filters-menu.module.css";

type FieldGroup = FieldMeta["group"];

const GROUP_ORDER: FieldGroup[] = ["content", "media", "time", "people"];
const GROUP_LABELS: Record<FieldGroup, string> = {
  content: "Content",
  media: "Media",
  time: "Time",
  people: "People",
};

interface FieldEntry {
  field: FieldId;
  key: string;
  label: string;
  hint: string;
}

function buildGroups(): { group: FieldGroup; fields: FieldEntry[] }[] {
  const buckets = new Map<FieldGroup, FieldEntry[]>();
  for (const spec of TOKEN_FIELDS) {
    const meta = FIELD_META[spec.field];
    const entry: FieldEntry = {
      field: spec.field,
      key: canonicalKey(spec.field),
      label: meta.label,
      hint: FIELD_HINTS[spec.field] ?? "",
    };
    const list = buckets.get(meta.group) ?? [];
    list.push(entry);
    buckets.set(meta.group, list);
  }
  const ordered = [...buckets.keys()].sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b),
  );
  return ordered.map((group) => ({
    group,
    fields: buckets.get(group) ?? [],
  }));
}

// A browsable list of every filter the search grammar understands, grouped by
// area. Picking one drops its `key:` into the editor and refocuses so the value
// typeahead opens on it.
export function FiltersMenu() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const groups = useMemo(buildGroups, []);

  const pick = (key: string) => {
    setOpen(false);
    editor.update(() => $insertFieldKey(key));
    queueMicrotask(() => editor.focus());
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={styles.trigger} aria-label="All filters">
        <Filters width={16} height={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8}>
          <Popover.Popup className={styles.popup}>
            <ClippedScroll maxHeight={320}>
              {groups.map(({ group, fields }) => (
                <Fragment key={group}>
                  <div className={styles["group-label"]}>
                    {GROUP_LABELS[group]}
                  </div>
                  {fields.map((entry) => {
                    const Icon = FIELD_ICONS[entry.field];
                    return (
                      <button
                        key={entry.field}
                        type="button"
                        className={styles.row}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(entry.key)}
                      >
                        <span className={styles["row-icon"]}>
                          <Icon width={15} height={15} />
                        </span>
                        <span className={styles["row-label"]}>
                          {entry.label}
                        </span>
                        <span className={styles["row-key"]}>{entry.key}:</span>
                        {entry.hint ? (
                          <span className={styles["row-hint"]}>
                            {entry.hint}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </ClippedScroll>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
