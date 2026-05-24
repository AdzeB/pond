import {
  KEYBOARD_GROUP_LABELS,
  KEYBOARD_GROUP_ORDER,
  KEYBOARD_SHORTCUTS,
  type KeyboardGroup,
  type KeyboardShortcut,
} from "@pond/schema";
import { Drawer, Kbd } from "@pond/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./styles.module.css";

const OPEN_EVENT = "pond:open-keyboard-cheatsheet";
const TRIGGER_KEY = "?";

const GROUPED_SHORTCUTS = (() => {
  const out = new Map<KeyboardGroup, KeyboardShortcut[]>();
  for (const group of KEYBOARD_GROUP_ORDER) out.set(group, []);
  for (const shortcut of KEYBOARD_SHORTCUTS) {
    const list = out.get(shortcut.group);
    if (list) list.push(shortcut);
  }
  return out;
})();

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function KeyboardCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== TRIGGER_KEY) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    };
    const onCustom = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onCustom);
    };
  }, []);

  const groups = useMemo(
    () =>
      KEYBOARD_GROUP_ORDER.flatMap((group) => {
        const shortcuts = GROUPED_SHORTCUTS.get(group) ?? [];
        if (shortcuts.length === 0) return [];
        return [{ group, shortcuts }];
      }),
    [],
  );

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Popup className={styles.popup}>
          <Drawer.Viewport className={styles.viewport}>
            <Drawer.Content className={styles.content}>
              <header className={styles.header}>
                <div>
                  <Drawer.Title className={styles.title}>
                    Keyboard Shortcuts
                  </Drawer.Title>
                  <Drawer.Description className={styles.description}>
                    Press <kbd>?</kbd> any time to open or close this drawer.
                  </Drawer.Description>
                </div>
                <Drawer.Close
                  className={styles.close}
                  onClick={handleClose}
                  aria-label="Close shortcuts"
                >
                  Close
                </Drawer.Close>
              </header>

              <div className={styles.body}>
                {groups.map(({ group, shortcuts }) => (
                  <section key={group} className={styles.group}>
                    <h3 className={styles["group-label"]}>
                      {KEYBOARD_GROUP_LABELS[group]}
                    </h3>
                    <ul className={styles.list}>
                      {shortcuts.map((s) => (
                        <li key={s.id} className={styles.row}>
                          <span className={styles["row-label"]}>{s.label}</span>
                          <Kbd.Cluster keys={parseBinding(s.binding)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </Drawer.Content>
          </Drawer.Viewport>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function parseBinding(binding: string): string[] {
  return binding.split("+").map((part) => {
    const trimmed = part.trim();
    switch (trimmed) {
      case "Cmd":
      case "Command":
        return "⌘";
      case "Ctrl":
      case "Control":
        return "⌃";
      case "Alt":
      case "Option":
        return "⌥";
      case "Shift":
        return "⇧";
      case "Backspace":
        return "⌫";
      case "Enter":
      case "Return":
        return "↵";
      default:
        return trimmed;
    }
  });
}
