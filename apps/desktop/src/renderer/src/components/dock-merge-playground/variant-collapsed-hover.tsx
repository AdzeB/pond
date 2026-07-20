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

/** D1's fold without the click: tabs unfold while the pointer rests on the nav end and tuck away when it leaves. */
export function VariantCollapsedHover({
  activeTab,
  onTabChange,
}: VariantProps) {
  const [open, setOpen] = useState(false);
  const active = ALL_TABS.find((t) => t.id === activeTab);
  if (!active) return null;

  return (
    <div className={styles["bottom-center"]}>
      <Tray.Pill className={styles.pill}>
        <div
          className={styles["expand-zone"]}
          onPointerEnter={() => setOpen(true)}
          onPointerLeave={() => setOpen(false)}
        >
          <Tooltip label={active.label} side="top">
            <Tray.Item aria-label={active.label} data-status="active">
              <Tray.Indicator />
              {active.icon}
            </Tray.Item>
          </Tooltip>

          <AnimatePresence initial={false}>
            {open ? (
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
                      onTabChange={onTabChange}
                      layoutId="collapsed-hover-tab"
                    />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <ContextActionCluster activeTab={activeTab} />
      </Tray.Pill>
    </div>
  );
}
