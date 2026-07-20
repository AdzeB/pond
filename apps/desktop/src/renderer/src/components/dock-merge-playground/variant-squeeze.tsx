import { Tooltip, Tray } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { gentleSpring } from "@/lib/ui/motion";
import {
  ALL_TABS,
  ContextActionCluster,
  TabItem,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** Unfolding the tabs folds the actions away, so the pill trades content instead of growing into a runway. */
export function VariantSqueeze({ activeTab, onTabChange }: VariantProps) {
  const [navOpen, setNavOpen] = useState(false);
  const active = ALL_TABS.find((t) => t.id === activeTab);
  if (!active) return null;

  return (
    <div className={styles["bottom-center"]}>
      <Tray.Pill className={styles.pill}>
        <Tooltip label={navOpen ? active.label : "Navigate"} side="top">
          <Tray.Item
            aria-label={navOpen ? active.label : "Navigate"}
            aria-expanded={navOpen}
            data-status="active"
            onClick={() => setNavOpen((v) => !v)}
          >
            <Tray.Indicator />
            {active.icon}
          </Tray.Item>
        </Tooltip>

        <AnimatePresence initial={false}>
          {navOpen ? (
            <motion.div
              key="tabs"
              className={styles.expand}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={gentleSpring}
            >
              <div className={styles["expand-inner"]}>
                {ALL_TABS.filter((tab) => tab.id !== activeTab).map((tab) => (
                  <TabItem
                    key={tab.id}
                    tab={tab}
                    activeTab={activeTab}
                    onTabChange={(id) => {
                      onTabChange(id);
                      setNavOpen(false);
                    }}
                    layoutId="squeeze-tab"
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ContextActionCluster activeTab={activeTab} hidden={navOpen} />
      </Tray.Pill>
    </div>
  );
}
