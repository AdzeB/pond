import { Toolbar as PondToolbar } from "@pond/ui";
import { LibrarySwitcher } from "@/components/library-switcher";
import styles from "./styles.module.css";

export function Toolbar() {
  return (
    <PondToolbar.Root>
      <PondToolbar.Row>
        <PondToolbar.Group fill={true} />
        <PondToolbar.Group className={styles.center}>
          <LibrarySwitcher />
        </PondToolbar.Group>
        <PondToolbar.Group fill={true} align="end" />
      </PondToolbar.Row>
    </PondToolbar.Root>
  );
}
