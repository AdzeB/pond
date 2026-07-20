import { Tray } from "@pond/ui";
import { clsx as cn } from "clsx";
import {
  ALL_TABS,
  ContextActionCluster,
  TAB_ACTIONS,
  TabItem,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** Two storeys in one capsule: destinations on top, actions below. */
export function VariantStacked({ activeTab, onTabChange }: VariantProps) {
  return (
    <div className={styles["bottom-center"]}>
      <Tray.Pill className={cn(styles.pill, styles.stacked)}>
        <div className={styles["stacked-row"]}>
          {ALL_TABS.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              activeTab={activeTab}
              onTabChange={onTabChange}
              layoutId="stacked-tab"
            />
          ))}
        </div>
        {TAB_ACTIONS[activeTab].groups.length > 0 ? (
          <Tray.Separator className={styles["stacked-divider"]} />
        ) : null}
        <div className={styles["stacked-row"]}>
          <ContextActionCluster
            activeTab={activeTab}
            leadingSeparator={false}
          />
        </div>
      </Tray.Pill>
    </div>
  );
}
