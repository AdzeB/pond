import { IconXmark } from "@pond/icons";
import { Menu } from "@pond/ui";
import styles from "./styles.module.css";

export function ChoiceIndicator({ excluded }: { excluded?: boolean }) {
  return excluded ? (
    <Menu.CheckboxItemIndicator
      className={styles.excluded}
      render={<span aria-hidden="true" />}
    >
      <IconXmark size={12} />
    </Menu.CheckboxItemIndicator>
  ) : (
    <Menu.CheckboxItemIndicator />
  );
}
