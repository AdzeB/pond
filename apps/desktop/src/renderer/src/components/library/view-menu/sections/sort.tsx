import { Menu } from "@pond/ui";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  HardDrive,
  type LucideIcon,
  Type,
} from "lucide-react";
import { type SortDir, type SortKey, useView } from "../context";
import styles from "./sort.module.css";

interface KeyOption {
  value: SortKey;
  label: string;
  icon: LucideIcon;
}

const KEY_OPTIONS = [
  { value: "savedAt", label: "Date saved", icon: CalendarDays },
  { value: "title", label: "Title", icon: Type },
  { value: "fileSize", label: "Size", icon: HardDrive },
] as const satisfies readonly KeyOption[];

const KEY_FALLBACK: KeyOption = KEY_OPTIONS[0];
const KEY_SET = new Set<SortKey>(KEY_OPTIONS.map((o) => o.value));

interface DirOption {
  value: SortDir;
  label: string;
  icon: LucideIcon;
}

const DIR_OPTIONS = [
  { value: "desc", label: "Descending", icon: ArrowDown },
  { value: "asc", label: "Ascending", icon: ArrowUp },
] as const satisfies readonly DirOption[];

const DIR_FALLBACK: DirOption = DIR_OPTIONS[0];

const DEFAULT_SORT = { key: "savedAt", dir: "desc" } as const;

export function SortSection() {
  const { state, actions } = useView();
  const currentKey =
    KEY_OPTIONS.find((o) => o.value === state.sort.key) ?? KEY_FALLBACK;
  const currentDir =
    DIR_OPTIONS.find((o) => o.value === state.sort.dir) ?? DIR_FALLBACK;
  const isModified =
    state.sort.key !== DEFAULT_SORT.key || state.sort.dir !== DEFAULT_SORT.dir;

  return (
    <Menu.Group>
      <header className={styles.header}>
        <Menu.GroupLabel className={styles.title}>Sort by</Menu.GroupLabel>
        {isModified ? (
          <button
            type="button"
            className={styles.reset}
            onClick={() => actions.setSort({ ...DEFAULT_SORT })}
          >
            Reset
          </button>
        ) : null}
      </header>
      <div className={styles.row}>
        <KeyPicker
          current={currentKey}
          onPick={(key) => actions.setSort({ key, dir: state.sort.dir })}
        />
        <DirPicker
          current={currentDir}
          onPick={(dir) => actions.setSort({ key: state.sort.key, dir })}
        />
      </div>
    </Menu.Group>
  );
}

interface KeyPickerProps {
  current: KeyOption;
  onPick: (value: SortKey) => void;
}

function KeyPicker({ current, onPick }: KeyPickerProps) {
  const Icon = current.icon;
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger
        render={
          <button type="button" className={styles.pill} aria-label="Sort key">
            <span className={styles["pill-icon"]} aria-hidden>
              <Icon width="14" height="14" />
            </span>
            <span className={styles["pill-label"]}>{current.label}</span>
            <span className={styles["pill-caret"]} aria-hidden>
              <ChevronDown width="12" height="12" />
            </span>
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={4}>
          <Menu.Popup>
            <Menu.RadioGroup
              value={current.value}
              onValueChange={(v) => {
                if (typeof v === "string" && KEY_SET.has(v as SortKey)) {
                  onPick(v as SortKey);
                }
              }}
            >
              {KEY_OPTIONS.map((opt) => {
                const OptIcon = opt.icon;
                return (
                  <Menu.RadioItem
                    key={opt.value}
                    value={opt.value}
                    closeOnClick={false}
                  >
                    <Menu.ItemIcon>
                      <OptIcon width="14" height="14" />
                    </Menu.ItemIcon>
                    <Menu.ItemLabel>{opt.label}</Menu.ItemLabel>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

interface DirPickerProps {
  current: DirOption;
  onPick: (value: SortDir) => void;
}

function DirPicker({ current, onPick }: DirPickerProps) {
  const Icon = current.icon;
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger
        render={
          <button
            type="button"
            className={`${styles.pill} ${styles["pill-dir"]}`}
            aria-label="Sort direction"
          >
            <span className={styles["pill-icon"]} aria-hidden>
              <Icon width="14" height="14" />
            </span>
            <span className={styles["pill-label"]}>{current.label}</span>
            <span className={styles["pill-caret"]} aria-hidden>
              <ChevronDown width="12" height="12" />
            </span>
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={4}>
          <Menu.Popup>
            <Menu.RadioGroup
              value={current.value}
              onValueChange={(v) => {
                if (v === "asc" || v === "desc") onPick(v);
              }}
            >
              {DIR_OPTIONS.map((opt) => {
                const OptIcon = opt.icon;
                return (
                  <Menu.RadioItem
                    key={opt.value}
                    value={opt.value}
                    closeOnClick={false}
                  >
                    <Menu.ItemIcon>
                      <OptIcon width="14" height="14" />
                    </Menu.ItemIcon>
                    <Menu.ItemLabel>{opt.label}</Menu.ItemLabel>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
