import { Tooltip, Tray } from "@pond/ui";
import { clsx as cn } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { gentleSpring } from "@/lib/ui/motion";
import {
  ALL_TABS,
  ContextActionCluster,
  type MockTab,
  TAB_ACTIONS,
  type TabId,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** E1's storeys where the active tab wears its name, giving the icon row orientation. */
export function VariantLabeled({ activeTab, onTabChange }: VariantProps) {
  return (
    <div className={styles["bottom-center"]}>
      <Tray.Pill className={cn(styles.pill, styles.stacked)}>
        <div className={styles["stacked-row"]}>
          {ALL_TABS.map((tab) => (
            <LabeledTab
              key={tab.id}
              tab={tab}
              activeTab={activeTab}
              onTabChange={onTabChange}
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

function LabeledTab({
  tab,
  activeTab,
  onTabChange,
}: {
  tab: MockTab;
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}) {
  const active = tab.id === activeTab;
  return (
    <Tooltip label={tab.label} side="top">
      <Tray.Item
        className={styles["labeled-item"]}
        aria-label={tab.label}
        data-status={active ? "active" : undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => onTabChange(tab.id)}
      >
        {active ? (
          <Tray.Indicator
            render={
              <motion.span layoutId="labeled-tab" transition={gentleSpring} />
            }
          />
        ) : null}
        {tab.icon}
        <AnimatePresence initial={false}>
          {active ? (
            <motion.span
              key="label"
              className={styles.label}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={gentleSpring}
            >
              <span className={styles["label-text"]}>{tab.label}</span>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </Tray.Item>
    </Tooltip>
  );
}
