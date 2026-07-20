import { Tray } from "@pond/ui";
import {
  ALL_TABS,
  ContextActionCluster,
  TabItem,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** Everything in one horizontal pill: tabs, then the full action cluster. */
export function VariantUnified({ activeTab, onTabChange }: VariantProps) {
  return (
    <div className={styles["bottom-center"]}>
      <Tray.Pill className={styles.pill}>
        {ALL_TABS.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            activeTab={activeTab}
            onTabChange={onTabChange}
            layoutId="unified-tab"
          />
        ))}
        <ContextActionCluster activeTab={activeTab} />
      </Tray.Pill>
    </div>
  );
}
