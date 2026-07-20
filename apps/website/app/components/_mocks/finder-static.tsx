import { IconFolderFill18 } from "@pond/icons/fill/18";
import styles from "./finder-static.module.css";
import { TweetCard } from "./tweet-card";

const ITEM_LABELS = [
  "01HZTPWX2K….info",
  "01J4QDZ8B7….info",
  "01JCT2M9RV….info",
  "01JD8KWN4A….info",
  "01JEV5XH0Q….info",
];

const SELECTED_ITEM = 1;

const FILES = ["info.json", "tweet-light.png", "avatar.jpg"];

const SELECTED_FILE = 1;

/** Finder column view fixed on an archived tweet: plain files on disk, readable without the app. */
export function FinderStatic() {
  return (
    <div className={styles.window} aria-hidden>
      <div className={styles.chrome}>
        <span className={styles.lights}>
          <span className={styles.light} />
          <span className={styles.light} />
          <span className={styles.light} />
        </span>
        <span className={styles.path}>
          <IconFolderFill18 width={13} height={13} />
          ~/Pond/My Pond.pond
        </span>
      </div>
      <div className={styles.columns}>
        <div className={styles.column} data-role="root">
          <span className={styles.row} data-selected>
            <IconFolderFill18 width={14} height={14} />
            items
            <span className={styles["row-meta"]}>5,070</span>
          </span>
          <span className={styles.row}>
            <IconFolderFill18 width={14} height={14} />
            trash
            <span className={styles["row-meta"]}>12</span>
          </span>
          <span className={styles.row} data-kind="file">
            library.sqlite
          </span>
        </div>
        <div className={styles.column}>
          {ITEM_LABELS.map((label, index) => (
            <span
              key={label}
              className={styles.row}
              data-selected={index === SELECTED_ITEM || undefined}
            >
              <IconFolderFill18 width={14} height={14} />
              <span className={styles.mono}>{label}</span>
            </span>
          ))}
        </div>
        <div className={styles.column} data-role="files">
          {FILES.map((name, index) => (
            <span
              key={name}
              className={styles.row}
              data-kind="file"
              data-selected={index === SELECTED_FILE || undefined}
            >
              <span className={styles.mono}>{name}</span>
            </span>
          ))}
        </div>
        <div className={styles.preview}>
          <TweetCard />
        </div>
      </div>
    </div>
  );
}
