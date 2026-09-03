import { IconArchiveContent2Fill18, IconPlusFill18 } from "@pond/icons/fill/18";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import {
  IconArrowLeftOutline18,
  IconArrowRightOutline18,
  IconArrowRotateClockwiseOutline18,
  IconClockRotateClockwiseOutline18,
  IconStopwatchOutline18,
  IconTriangleWarningOutline18,
  IconVersionsOutline18,
} from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import { SaveThumb } from "../save-thumb";
import { demoImage, packMasonry, SAVES } from "../saves";
import styles from "./styles.module.css";

const CONTENT_WIDTH = 1280 - 32 - 40;

const PACKED = packMasonry(SAVES, CONTENT_WIDTH, 130, 16, 44);

const TOOLBAR_ACTIONS = [
  { label: "In progress", icon: IconStopwatchOutline18 },
  { label: "Recent", icon: IconClockRotateClockwiseOutline18 },
  { label: "Errors", icon: IconTriangleWarningOutline18 },
  { label: "Ongoing", icon: IconArrowRotateClockwiseOutline18 },
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
      className={styles.chromeButton}
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
            <IconArrowLeftOutline18 />
          </ChromeButton>
          <ChromeButton label="Forward" disabled>
            <IconArrowRightOutline18 />
          </ChromeButton>
          <ChromeButton label="History" disabled>
            <IconVersionsOutline18 />
          </ChromeButton>
        </div>
        <div className={styles.tabs}>
          <div className={styles.group}>
            <div className={styles.tab} data-active>
              <span className={styles.tabIcon}>
                <IconArchiveContent2Fill18 />
              </span>
              <span className={styles.tabLabel}>Library</span>
              <span className={styles.tabClose}>
                <IconXmarkOutline12 />
              </span>
            </div>
          </div>
          <ChromeButton label="New tab">
            <IconPlusFill18 />
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
