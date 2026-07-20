import { Tooltip, Tray } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { bouncySpring } from "@/lib/ui/motion";
import {
  ALL_TABS,
  ContextActionCluster,
  TabItem,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** The rail returns as a transient flyout: tapping the trigger fans a vertical mini-rail above the pill, which never changes shape. */
export function VariantFan({ activeTab, onTabChange }: VariantProps) {
  const [open, setOpen] = useState(false);
  const active = ALL_TABS.find((t) => t.id === activeTab);
  if (!active) return null;

  return (
    <div className={styles["bottom-center"]}>
      <div className={styles["fan-anchor"]}>
        <AnimatePresence>
          {open ? (
            <motion.div
              key="fan"
              className={styles.fan}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={bouncySpring}
            >
              <Tray.Pill
                orientation="vertical"
                className={styles.pill}
                render={<nav aria-label="Navigation" />}
              >
                {ALL_TABS.map((tab) => (
                  <TabItem
                    key={tab.id}
                    tab={tab}
                    activeTab={activeTab}
                    onTabChange={(id) => {
                      onTabChange(id);
                      setOpen(false);
                    }}
                    layoutId="fan-tab"
                    side="right"
                  />
                ))}
              </Tray.Pill>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Tray.Pill className={styles.pill}>
          <Tooltip label="Navigate" side="top">
            <Tray.Item
              aria-label="Navigate"
              aria-expanded={open}
              data-status="active"
              onClick={() => setOpen((v) => !v)}
            >
              <Tray.Indicator />
              {active.icon}
            </Tray.Item>
          </Tooltip>
          <ContextActionCluster activeTab={activeTab} />
        </Tray.Pill>
      </div>
    </div>
  );
}
