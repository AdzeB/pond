import { Tray } from "@pond/ui";
import {
  ALL_TABS,
  ContextActionCluster,
  TAB_ACTIONS,
  TabItem,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** Two capsules sharing the bottom center: navigation on the left, actions on the right. */
export function VariantSplit({ activeTab, onTabChange }: VariantProps) {
  return (
    <div className={styles["bottom-center"]}>
      <Tray.Pill
        className={styles.pill}
        render={<nav aria-label="Navigation" />}
      >
        {ALL_TABS.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            activeTab={activeTab}
            onTabChange={onTabChange}
            layoutId="split-tab"
          />
        ))}
      </Tray.Pill>
      {TAB_ACTIONS[activeTab].groups.length > 0 ? (
        <Tray.Pill className={styles.pill}>
          <ContextActionCluster
            activeTab={activeTab}
            leadingSeparator={false}
          />
        </Tray.Pill>
      ) : null}
    </div>
  );
}
