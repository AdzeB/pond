import { Bookmark, CircleQuestionMark } from "lucide-react";
import { Rail } from "./rail";
import styles from "./styles.module.css";
import { TagItem } from "./tag-item";

interface EmptyStateProps {
  hasAnyTags: boolean;
  needle: string;
  query: string;
}

function EmptyState({ hasAnyTags, needle, query }: EmptyStateProps) {
  if (needle) {
    return (
      <div className={styles.empty}>
        <div className={styles["empty-title"]}>No matches</div>
        <div className={styles["empty-subtitle"]}>No tags match "{query}".</div>
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <div className={styles["empty-art"]} aria-hidden>
        <Bookmark width={56} height={56} />
        <span className={styles["empty-art-overlay"]}>
          <CircleQuestionMark width={18} height={18} />
        </span>
      </div>
      <div className={styles["empty-title"]}>No Tags Yet</div>
      <div className={styles["empty-subtitle"]}>
        {hasAnyTags
          ? "This section is empty. Drag tags here or pick one from the rail."
          : "Add tags to your saves for a proper organization. Tags also help when searching."}
      </div>
    </div>
  );
}

export const AllTags = { Rail, TagItem, EmptyState };
export type { RailKey } from "./rail";
export type { DisplayItem } from "./tag-item";
