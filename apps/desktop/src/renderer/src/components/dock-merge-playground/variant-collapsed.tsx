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

/** One pill where nav rests as just the active tab's icon; tapping it unfolds the other tabs inline. */
export function VariantCollapsed({ activeTab, onTabChange }: VariantProps) {
  const [expanded, setExpanded] = useState(false);
  const active = ALL_TABS.find((t) => t.id === activeTab);
  if (!active) return null;

  return (
    <div className={styles["bottom-center"]}>
      <Tray.Pill className={styles.pill}>
        <Tooltip label={expanded ? active.label : "Navigate"} side="top">
          <Tray.Item
            aria-label={expanded ? active.label : "Navigate"}
            aria-expanded={expanded}
            data-status="active"
            onClick={() => setExpanded((v) => !v)}
          >
            <Tray.Indicator />
            {active.icon}
          </Tray.Item>
        </Tooltip>

        <AnimatePresence initial={false}>
          {expanded ? (
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
                      setExpanded(false);
                    }}
                    layoutId="collapsed-tab"
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ContextActionCluster activeTab={activeTab} />
      </Tray.Pill>
    </div>
  );
}
