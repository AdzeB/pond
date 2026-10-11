import {
  IconAscendingSorting,
  IconDescendingSorting,
  IconSliders,
} from "@pond/icons";
import { Button, Popover, Select, Tooltip } from "@pond/ui";
import { useState } from "react";
import type {
  TableColumnLayout,
  TableColumnSpec,
  TableSort,
} from "@/shared/lib/table-column-layout";
import styles from "./styles.module.css";

function sameSort<Id extends string>(
  current: TableSort<Id> | null,
  baseline: TableSort<Id> | null,
): boolean {
  if (current === baseline) return true;
  if (!current || !baseline) return false;
  return current.id === baseline.id && current.desc === baseline.desc;
}

export function TableOptionsMenu<Id extends string>({
  columns,
  lockedId,
  layout,
  defaultSort = null,
  onHiddenChange,
  onSortChange,
  onReset,
}: {
  columns: readonly TableColumnSpec<Id>[];
  lockedId: Id;
  layout: TableColumnLayout<Id>;
  defaultSort?: TableSort<Id> | null;
  onHiddenChange: (id: Id, hidden: boolean) => void;
  onSortChange: (sort: TableSort<Id> | null) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hidden = new Set(layout.hidden);
  const hideable = columns.some((column) => column.id !== lockedId);
  const changed =
    layout.hidden.length > 0 ||
    !sameSort(layout.sort, defaultSort) ||
    layout.order.some((id, index) => id !== columns[index]?.id);
  const sortLabel =
    columns.find((column) => column.id === layout.sort?.id)?.label ?? "None";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip label="Options" side="bottom">
        <Button
          render={<Popover.Trigger />}
          icon
          size="sm"
          variant="ghost"
          aria-label="Options"
        >
          <IconSliders />
        </Button>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className={styles.popup} aria-label="Options">
            <Select.Root
              items={columns.map((column) => ({
                value: column.id,
                label: column.label,
              }))}
              value={layout.sort?.id ?? null}
              onValueChange={(value) => {
                const column = columns.find((item) => item.id === value);
                if (!column) return;
                onSortChange({
                  id: column.id,
                  desc: layout.sort?.desc ?? false,
                });
              }}
            >
              <div className={styles.row}>
                <Select.Label className={styles.label}>Sort By</Select.Label>
                <div className={styles.controls}>
                  <Button
                    icon
                    size="sm"
                    variant="secondary"
                    disabled={!layout.sort}
                    aria-label="Toggle Sort Direction"
                    onClick={() => {
                      if (!layout.sort) return;
                      onSortChange({
                        id: layout.sort.id,
                        desc: !layout.sort.desc,
                      });
                    }}
                  >
                    {layout.sort?.desc ? (
                      <IconDescendingSorting />
                    ) : (
                      <IconAscendingSorting />
                    )}
                  </Button>
                  <Select.Trigger size="sm" className={styles.select}>
                    <Select.Value placeholder="None">{sortLabel}</Select.Value>
                  </Select.Trigger>
                </div>
              </div>
              <Select.Portal>
                <Select.Positioner align="end" sideOffset={6}>
                  <Select.Popup>
                    <Select.Items
                      items={columns.map((column) => ({
                        value: column.id,
                        label: column.label,
                      }))}
                    />
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
            {hideable ? (
              <>
                <hr className={styles.separator} />
                <fieldset className={styles.properties}>
                  <legend className={styles.heading}>Display Properties</legend>
                  {columns.map((column) => {
                    const visible = !hidden.has(column.id);
                    const locked = column.id === lockedId;
                    return (
                      <Button
                        key={column.id}
                        size="xs"
                        variant={visible ? "tertiary" : "secondary"}
                        disabled={locked}
                        aria-pressed={visible}
                        onClick={() => onHiddenChange(column.id, visible)}
                      >
                        {column.label}
                      </Button>
                    );
                  })}
                </fieldset>
              </>
            ) : null}
            <hr className={styles.separator} />
            <div className={styles.footer}>
              <Button
                size="sm"
                variant="ghost"
                disabled={!changed}
                onClick={onReset}
              >
                Reset
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
