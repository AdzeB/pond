import { Tray } from "@pond/ui";
import {
  ActionCluster,
  MAIN_TABS,
  TabItem,
  UTILITY_TABS,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** The rail absorbs the dock: one vertical pill carries tabs and every action, the bottom stays empty for composers. */
export function VariantRail({ activeTab, onTabChange }: VariantProps) {
  return (
    <div className={styles["left-center"]}>
      <Tray.Pill
        orientation="vertical"
        className={styles.pill}
        render={<nav aria-label="Navigation" />}
      >
        {MAIN_TABS.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            activeTab={activeTab}
            onTabChange={onTabChange}
            layoutId="rail-tab"
            side="right"
          />
        ))}
        <Tray.Separator />
        <ActionCluster side="right" />
        <Tray.Separator />
        {UTILITY_TABS.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            activeTab={activeTab}
            onTabChange={onTabChange}
            layoutId="rail-tab"
            side="right"
          />
        ))}
      </Tray.Pill>
    </div>
  );
}
