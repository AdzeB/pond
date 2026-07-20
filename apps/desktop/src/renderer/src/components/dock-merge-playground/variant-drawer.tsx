import { Tray } from "@pond/ui";
import { clsx as cn } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { gentleSpring } from "@/lib/ui/motion";
import {
  ALL_TABS,
  ContextActionCluster,
  TAB_ACTIONS,
  TabItem,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** At rest only the action row shows; hovering the pill slides the nav storey out of the top edge. */
export function VariantDrawer({ activeTab, onTabChange }: VariantProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={styles["bottom-center"]}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      <Tray.Pill className={cn(styles.pill, styles.stacked)}>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="nav"
              className={styles.drawer}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={gentleSpring}
            >
              <div className={styles["stacked-row"]}>
                {ALL_TABS.map((tab) => (
                  <TabItem
                    key={tab.id}
                    tab={tab}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                    layoutId="drawer-tab"
                  />
                ))}
              </div>
              {TAB_ACTIONS[activeTab].groups.length > 0 ? (
                <Tray.Separator className={styles["stacked-divider"]} />
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
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
