import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Menu } from "@pond/ui";
import styles from "./styles.module.css";

export function ChoiceIndicator({ excluded }: { excluded?: boolean }) {
  return excluded ? (
    <Menu.CheckboxItemIndicator
      className={styles.excluded}
      render={<span aria-hidden="true" />}
    >
      <IconXmarkOutline12 />
    </Menu.CheckboxItemIndicator>
  ) : (
    <Menu.CheckboxItemIndicator />
  );
}
