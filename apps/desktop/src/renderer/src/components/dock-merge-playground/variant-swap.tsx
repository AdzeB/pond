import { Tooltip, Tray } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { dockMotion, MorphPill } from "./lib/morph-pill";
import {
  ALL_TABS,
  ContextActionCluster,
  TabItem,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** Tapping the active tab morphs the whole pill from verbs to places with the real dock's box-and-crossfade. */
export function VariantSwap({ activeTab, onTabChange }: VariantProps) {
  const [mode, setMode] = useState<"actions" | "tabs">("actions");
  const active = ALL_TABS.find((t) => t.id === activeTab);
  if (!active) return null;

  const { swap, swapTransition } = dockMotion;

  return (
    <div className={styles["bottom-center"]}>
      <MorphPill>
        <AnimatePresence initial={false}>
          {mode === "tabs" ? (
            <motion.div
              key="tabs"
              className={styles.row}
              {...swap}
              transition={swapTransition}
            >
              {ALL_TABS.map((tab) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  activeTab={activeTab}
                  onTabChange={(id) => {
                    onTabChange(id);
                    setMode("actions");
                  }}
                  layoutId="swap-tab"
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              className={styles.row}
              {...swap}
              transition={swapTransition}
            >
              <Tooltip label="Navigate" side="top">
                <Tray.Item
                  aria-label="Navigate"
                  onClick={() => setMode("tabs")}
                >
                  <Tray.Indicator />
                  {active.icon}
                </Tray.Item>
              </Tooltip>
              <ContextActionCluster activeTab={activeTab} />
            </motion.div>
          )}
        </AnimatePresence>
      </MorphPill>
    </div>
  );
}
