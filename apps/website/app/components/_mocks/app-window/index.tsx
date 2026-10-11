import {
  IconArchiveContent2Fill,
  IconArrowLeft,
  IconArrowRight,
  IconArrowRotateClockwise,
  IconHistory,
  IconPlusFill,
  IconStopwatch,
  IconTriangleWarning,
  IconVersions,
  IconXmark,
} from "@pond/icons";
import type { ReactNode } from "react";
import { SaveThumb } from "../save-thumb";
import { demoImage, packMasonry, SAVES } from "../saves";
import styles from "./styles.module.css";

const CONTENT_WIDTH = 1280 - 32 - 40;

const PACKED = packMasonry(SAVES, CONTENT_WIDTH, 130, 16, 44);

const TOOLBAR_ACTIONS = [
  { label: "In progress", icon: IconStopwatch },
  { label: "Recent", icon: IconHistory },
  { label: "Errors", icon: IconTriangleWarning },
  { label: "Ongoing", icon: IconArrowRotateClockwise },
] as const;

function ChromeButton({
  label,
  children,
  disabled,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles["chrome-button"]}
      aria-label={label}
      disabled={disabled}
      tabIndex={-1}
    >
      {children}
    </button>
  );
}

export function AppWindow() {
  return (
    <div className={styles.window} aria-hidden inert>
      <span className={styles.lights}>
        <span className={styles.light} data-tone="close" />
        <span className={styles.light} data-tone="min" />
        <span className={styles.light} data-tone="max" />
      </span>
      <div className={styles.chrome}>
        <div className={styles.history}>
          <ChromeButton label="Back" disabled>
            <IconArrowLeft />
          </ChromeButton>
          <ChromeButton label="Forward" disabled>
            <IconArrowRight />
          </ChromeButton>
          <ChromeButton label="History" disabled>
            <IconVersions />
          </ChromeButton>
        </div>
        <div className={styles.tabs}>
          <div className={styles.group}>
            <div className={styles.tab} data-active>
              <span className={styles.icon}>
                <IconArchiveContent2Fill />
              </span>
              <span className={styles.label}>Library</span>
              <span className={styles.close}>
                <IconXmark size={12} />
              </span>
            </div>
          </div>
          <ChromeButton label="New tab">
            <IconPlusFill />
          </ChromeButton>
        </div>
        <div className={styles.spacer} />
        <div className={styles.actions}>
          {TOOLBAR_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <ChromeButton key={item.label} label={item.label}>
                <Icon />
              </ChromeButton>
            );
          })}
        </div>
      </div>
      <div className={styles.stage}>
        <div className={styles.panel}>
          <div className={styles.scroller}>
            <div className={styles.grid} style={{ height: PACKED.totalHeight }}>
              {PACKED.items.map(({ save, top, left, width }) => (
                <div
                  key={save.seed}
                  className={styles.cell}
                  style={{ top, left, width }}
                >
                  <SaveThumb
                    {...save}
                    image={demoImage(save.seed)}
                    mediaHeight={width / (save.aspect ?? 1)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
