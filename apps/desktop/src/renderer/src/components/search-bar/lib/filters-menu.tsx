import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { IconBarsFilterOutline18 as Filters } from "@pond/icons/outline/18";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, FieldMeta } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { Fragment, useMemo } from "react";
import { ClippedScroll } from "@/components/clipped-scroll";
import { FIELD_HINTS, FIELD_ICONS } from "@/lib/search/fields";
import { canonicalKey, TOKEN_FIELDS } from "@/lib/search/syntax";
import { $insertFieldKey } from "./editor-state";
import styles from "./filters-menu.module.css";

type FieldGroup = FieldMeta["group"];

const GROUP_ORDER: FieldGroup[] = ["content", "media", "time", "people"];
export const GROUP_LABELS: Record<FieldGroup, string> = {
  content: "Content",
  media: "Media",
  time: "Time",
  people: "People",
};

export interface FieldEntry {
  field: FieldId;
  key: string;
  label: string;
  hint: string;
}

export function buildGroups(): { group: FieldGroup; fields: FieldEntry[] }[] {
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

/** Picking a filter drops its `key:` into the editor and refocuses so the value typeahead opens on it. */
export function FiltersMenu() {
  const [editor] = useLexicalComposerContext();
  const groups = useMemo(buildGroups, []);

  const pick = (key: string) => {
    editor.update(() => $insertFieldKey(key));
    queueMicrotask(() => editor.focus());
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="All filters"
        render={<button type="button" className={styles.trigger} />}
      >
        <Filters width={16} height={16} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8}>
          <Menu.Popup
            className={styles.popup}
            /** Focus lands back in the editor on close so the value typeahead can open on the inserted `key:`. */
            finalFocus={() => editor.getRootElement()}
          >
            <ClippedScroll maxHeight={320}>
              {groups.map(({ group, fields }, index) => (
                <Fragment key={group}>
                  {index > 0 ? <Menu.Separator /> : null}
                  {/** Items stay outside the Group (which GroupLabel requires) so ClippedScroll's direct children remain individual rows it can measure. */}
                  <Menu.Group>
                    <Menu.GroupLabel>{GROUP_LABELS[group]}</Menu.GroupLabel>
                  </Menu.Group>
                  {fields.map((entry) => {
                    const Icon = FIELD_ICONS[entry.field];
                    return (
                      <Menu.Item
                        key={entry.field}
                        onClick={() => pick(entry.key)}
                      >
                        <Menu.ItemIcon>
                          <Icon width={15} height={15} />
                        </Menu.ItemIcon>
                        <Menu.ItemLabel>
                          {entry.label}
                          <span className={styles.key}>{entry.key}:</span>
                        </Menu.ItemLabel>
                        {entry.hint ? (
                          <Menu.SecondaryLabel className={styles.hint}>
                            {entry.hint}
                          </Menu.SecondaryLabel>
                        ) : null}
                      </Menu.Item>
                    );
                  })}
                </Fragment>
              ))}
            </ClippedScroll>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
