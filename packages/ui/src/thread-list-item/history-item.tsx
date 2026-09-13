import { IconMsg2Outline18 } from "@pond/icons/outline/18";
import styles from "./styles.module.css";
import { ThreadListItem } from "./thread-list-item";

export function HistoryItem() {
  return (
    <ThreadListItem.Root>
      <ThreadListItem.Trigger className={styles["history-title"]}>
        <IconMsg2Outline18 />
        <ThreadListItem.Title fallback="New Chat" />
      </ThreadListItem.Trigger>
      <ThreadListItem.Archive
        className={styles["history-archive"]}
        aria-label="Archive chat"
      >
        Archive
      </ThreadListItem.Archive>
    </ThreadListItem.Root>
  );
}
