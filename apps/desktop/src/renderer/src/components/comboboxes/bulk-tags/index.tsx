import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, Combobox, Input } from "@pond/ui";
import { useMemo, useState } from "react";
import { useTags } from "@/pool/tags";
import styles from "./styles.module.css";

interface TagOption {
  value: string;
  label: string;
  create?: boolean;
}

interface BulkTagsComboboxProps {
  onPick: (name: string) => void;
  disabled?: boolean;
}

/**
 * A creatable tag picker: filters existing tags as you type and offers to
 * create a new tag when there is no exact match. Selecting an item commits the
 * tag (the caller decides what "commit" means) and closes the popup.
 */
export function BulkTagsCombobox({ onPick, disabled }: BulkTagsComboboxProps) {
  const tags = useTags();
  const { contains } = Combobox.useFilter({ sensitivity: "base" });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo<TagOption[]>(() => {
    const trimmed = query.trim();
    const base = trimmed ? tags.filter((t) => contains(t.name, trimmed)) : tags;
    const result = base
      .slice()
      .sort(
        (a, b) =>
          Number(b.starred) - Number(a.starred) || a.name.localeCompare(b.name),
      )
      .slice(0, 20)
      .map<TagOption>((t) => ({ value: t.name, label: t.name }));

    const exact =
      trimmed &&
      tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (trimmed && !exact) {
      result.push({
        value: `__create__:${trimmed}`,
        label: `Create "${normalizeLabelName(trimmed) || trimmed}"`,
        create: true,
      });
    }
    return result;
  }, [tags, query, contains]);

  function pick(option: TagOption) {
    const name = option.create ? query : option.value;
    if (!name.trim()) return;
    onPick(name);
    setQuery("");
    setOpen(false);
  }

  return (
    <Combobox.Root
      items={options}
      open={open}
      onOpenChange={setOpen}
      inputValue={query}
      onInputValueChange={setQuery}
      filter={null}
      autoHighlight
      disabled={disabled}
    >
      <Combobox.Trigger
        render={
          <Button size="sm" disabled={disabled}>
            Add tag…
          </Button>
        }
      />
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} align="start">
          <Combobox.Popup className={styles.popup}>
            <Combobox.Input
              render={<Input.Field data-size="sm" />}
              placeholder="Add tag…"
            />
            <Combobox.Empty className={styles.empty}>No tags.</Combobox.Empty>
            <Combobox.List className={styles.list}>
              {(option: TagOption) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  className={styles.item}
                  data-create={option.create || undefined}
                  onClick={() => pick(option)}
                >
                  {option.label}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
