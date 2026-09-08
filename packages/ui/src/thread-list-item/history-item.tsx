import { IconMsg2Outline18 } from "@pond/icons/outline/18";
import styles from "./styles.module.css";
import { ThreadListItem } from "./thread-list-item";

export function HistoryItem() {
  return (
    <ThreadListItem.Root>
      <ThreadListItem.Trigger className={styles.historyTitle}>
        <IconMsg2Outline18 />
        <ThreadListItem.Title fallback="New Chat" />
      </ThreadListItem.Trigger>
      <ThreadListItem.Archive
        className={styles.historyArchive}
        aria-label="Archive chat"
      >
        Archive
      </ThreadListItem.Archive>
    </ThreadListItem.Root>
  );
}
