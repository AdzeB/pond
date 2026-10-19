import { Combobox } from "@pond/ui/combobox";
import { Input } from "@pond/ui/input";
import { clsx as cn } from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import type { Folder } from "@/utils/messaging";
import styles from "./styles.module.css";

interface RootProps extends ComponentPropsWithoutRef<"div"> {}

function Root({ className, ...props }: RootProps) {
  return <div className={cn(styles.root, className)} {...props} />;
}

interface TagsProps
  extends Omit<ComponentPropsWithoutRef<"input">, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

function Tags({ value, onValueChange, ...props }: TagsProps) {
  return (
    <Input.Root size="sm" className={styles.field}>
      <Input.Field
        aria-label="Tags"
        placeholder="Tags, separated by commas"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        {...props}
      />
    </Input.Root>
  );
}

interface FoldersProps {
  folders: Folder[];
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Popups render in the shadow root when the picker lives on a page. */
  container?: HTMLElement | null;
}

function Folders({ folders, value, onValueChange, container }: FoldersProps) {
  const names = new Map(folders.map((folder) => [folder.id, folder.name]));
  const labelOf = (id: string) => names.get(id) ?? id;
  return (
    <Combobox.Root
      multiple
      items={folders.map((folder) => folder.id)}
      value={value}
      itemToStringLabel={labelOf}
      onValueChange={onValueChange}
    >
      <Combobox.InputGroup className={styles.field}>
        <Combobox.Value>
          {(selected: string[]) => (
            <Combobox.Chips>
              {selected.map((id) => (
                <Combobox.Chip key={id} aria-label={labelOf(id)}>
                  {labelOf(id)}
                  <Combobox.ChipRemove aria-label={`Remove ${labelOf(id)}`} />
                </Combobox.Chip>
              ))}
              <Combobox.ChipsInput
                aria-label="Folders"
                placeholder={selected.length > 0 ? "" : "Add to folders"}
              />
            </Combobox.Chips>
          )}
        </Combobox.Value>
      </Combobox.InputGroup>
      <Combobox.Portal container={container}>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.Empty>No folders found</Combobox.Empty>
            <Combobox.List>
              {(id: string) => (
                <Combobox.Item key={id} value={id}>
                  <Combobox.ItemLabel>{labelOf(id)}</Combobox.ItemLabel>
                  <Combobox.ItemEnd>
                    <Combobox.ItemIndicator />
                  </Combobox.ItemEnd>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

export const CaptureFields = { Root, Tags, Folders };
