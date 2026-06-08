import { Toggle } from "@base-ui/react/toggle";
import {
  IconAscendingSortingFill18 as AscendingIcon,
  IconDescendingSortingFill18 as DescendingIcon,
} from "@pond/icons/fill/18";
import { Menu, Select } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import {
  type SortDir,
  type SortKey,
  useView,
} from "../../../../../lib/hooks/use-view";
import styles from "./styles.module.css";

const KEY_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "savedAt", label: "Date saved" },
  { value: "title", label: "Title" },
  { value: "fileSize", label: "Size" },
];

const _DIR_OPTIONS: Array<{ value: SortDir; label: string }> = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
];

const KEY_LABELS: Record<SortKey, string> = Object.fromEntries(
  KEY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<SortKey, string>;

const transition = {
  initial: { opacity: 0, filter: "blur(2px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(px)" },
  duration: 0.18,
  ease: [0.19, 1, 0.22, 1],
} as const;

export function SortSection() {
  const { state, actions } = useView();

  return (
    <Menu.Group>
      <Menu.Item stale>
        Sorting
        <Select.Root
          value={state.sort.key}
          onValueChange={(value) =>
            actions.setSort({ key: value as SortKey, dir: state.sort.dir })
          }
        >
          <Select.Trigger style={{ marginLeft: "auto" }}>
            <Select.Value>{(value: SortKey) => KEY_LABELS[value]}</Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {KEY_OPTIONS.map(({ label, value }) => (
                    <Select.Item key={value} value={value}>
                      <Select.ItemText>{label}</Select.ItemText>
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        <Toggle
          aria-label="Toggle sort direction"
          className={styles.button}
          pressed={state.sort.dir === "asc"}
          onPressedChange={(pressed) =>
            actions.setSort({
              key: state.sort.key,
              dir: pressed ? "asc" : "desc",
            })
          }
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {state.sort.dir === "asc" ? (
              <motion.div key="asc" {...transition}>
                <AscendingIcon size={14} />
              </motion.div>
            ) : (
              <motion.div key="desc" {...transition}>
                <DescendingIcon size={14} />
              </motion.div>
            )}
          </AnimatePresence>
        </Toggle>
      </Menu.Item>
    </Menu.Group>
  );
}
