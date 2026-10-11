import {
  IconCircleInfoOutline18,
  IconMessageOutline18,
  IconSlidersOutline18,
} from "@pond/icons/outline/18";
import { PaneHeader } from "../pane-header";
import styles from "./styles.module.css";

const tags = ["Sunset", "Beach", "Golden Hour"] as const;

export function Inspector() {
  return (
    <div className={styles.inspector}>
      <PaneHeader>
        <span className={styles.tabs}>
          <span data-active>
            <IconSlidersOutline18 />
          </span>
          <span>
            <IconCircleInfoOutline18 />
          </span>
          <span>
            <IconMessageOutline18 />
          </span>
        </span>
      </PaneHeader>
      <div className={styles.fields}>
        <span className={styles.field}>
          Title
          <span className={styles.input}>Sunset over the bay</span>
        </span>
        <span className={styles.field}>
          Tags
          <span className={styles.chips}>
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}
