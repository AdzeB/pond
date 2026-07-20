import { Tray } from "@pond/ui";
import {
  ALL_TABS,
  ContextActionCluster,
  TAB_ACTIONS,
  TabItem,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** The rail lies down: a horizontal nav pill in the bottom-left corner, actions stay centered, both on one baseline. */
export function VariantCorner({ activeTab, onTabChange }: VariantProps) {
  return (
    <>
      <div className={styles["bottom-left"]}>
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
              layoutId="corner-tab"
            />
          ))}
        </Tray.Pill>
      </div>
      {TAB_ACTIONS[activeTab].groups.length > 0 ? (
        <div className={styles["bottom-center"]}>
          <Tray.Pill className={styles.pill}>
            <ContextActionCluster
              activeTab={activeTab}
              leadingSeparator={false}
            />
          </Tray.Pill>
        </div>
      ) : null}
    </>
  );
}
