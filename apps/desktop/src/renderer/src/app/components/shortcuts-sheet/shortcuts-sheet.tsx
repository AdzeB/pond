import { Dialog } from "@pond/ui";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import {
  SHORTCUT_GROUPS,
  SHORTCUTS,
  type ShortcutId,
} from "@/shared/lib/shortcuts";
import styles from "./shortcuts-sheet.module.css";

const handle = Dialog.createHandle();

export function openShortcutsSheet(): void {
  handle.open(null);
}

// SAFETY: `ShortcutId` is `keyof typeof SHORTCUTS`, so the own keys of that
// literal object are exactly its members.
const IDS = Object.keys(SHORTCUTS) as ShortcutId[];

export function ShortcutsSheetHost() {
  const scrollFade = useScrollFade<HTMLDivElement>();
  return (
    <Dialog.Root handle={handle}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>Keyboard Shortcuts</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Content className={styles.content} {...scrollFade}>
            <div className={styles.columns}>
              {SHORTCUT_GROUPS.map((group) => (
                <section key={group} className={styles.group}>
                  <h3 className={styles["group-title"]}>{group}</h3>
                  {IDS.filter((id) => SHORTCUTS[id].group === group).map(
                    (id) => (
                      <div key={id} className={styles.row}>
                        <span className={styles.label}>
                          {SHORTCUTS[id].label}
                        </span>
                        <ShortcutKeys id={id} />
                      </div>
                    ),
                  )}
                </section>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
