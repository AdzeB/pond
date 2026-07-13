import {
  IconArrowUpFill18 as ArrowUp,
  IconChevronDownFill18 as Collapse,
  IconImagePlusFill18 as ImagePlus,
} from "@pond/icons/fill/18";
import { IconClockRotateClockwiseOutline18 as History } from "@pond/icons/outline/18";
import { Popover } from "@pond/ui";
import styles from "../styles.module.css";

export function ComposerToolbar({
  onCollapse,
  historyOpen,
  onHistoryOpenChange,
  recents,
  onReplay,
  onPickImage,
  canSend,
  onSend,
}: {
  onCollapse?: () => void;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  recents: ReadonlyArray<string>;
  onReplay: (question: string) => void;
  onPickImage: () => void;
  canSend: boolean;
  onSend: () => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles["toolbar-group"]}>
        <button
          type="button"
          className={styles["icon-button"]}
          aria-label="Collapse"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCollapse?.()}
        >
          <Collapse width={16} height={16} />
        </button>
        <Popover.Root open={historyOpen} onOpenChange={onHistoryOpenChange}>
          <Popover.Trigger
            className={styles["icon-button"]}
            aria-label="Recent asks"
          >
            <History width={16} height={16} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="top" align="start" sideOffset={8}>
              <Popover.Popup className={styles["history-popup"]}>
                <div className={styles["history-label"]}>Recent</div>
                {recents.length === 0 ? (
                  <div className={styles["history-empty"]}>
                    No recent asks yet
                  </div>
                ) : (
                  recents.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={styles["history-item"]}
                      onClick={() => onReplay(q)}
                    >
                      {q}
                    </button>
                  ))
                )}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <button
          type="button"
          className={styles["icon-button"]}
          aria-label="Attach image"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onPickImage}
        >
          <ImagePlus width={16} height={16} />
        </button>
      </div>

      <div className={styles["toolbar-group"]}>
        <button
          type="button"
          className={styles.primary}
          aria-label="Ask"
          disabled={!canSend}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSend}
        >
          <ArrowUp width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
