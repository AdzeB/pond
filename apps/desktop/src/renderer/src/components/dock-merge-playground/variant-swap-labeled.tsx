import { Tooltip, Tray } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { gentleSpring } from "@/lib/ui/motion";
import { dockMotion, MorphPill } from "./lib/morph-pill";
import {
  ALL_TABS,
  ContextActionCluster,
  type MockTab,
  type TabId,
  type VariantProps,
} from "./lib/parts";
import styles from "./variants.module.css";

/** D3's morph where the nav mode spends its width on labels: every place is named while you choose. */
export function VariantSwapLabeled({ activeTab, onTabChange }: VariantProps) {
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
                <NamedTab
                  key={tab.id}
                  tab={tab}
                  activeTab={activeTab}
                  onTabChange={(id) => {
                    onTabChange(id);
                    setMode("actions");
                  }}
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

function NamedTab({
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
            <motion.span
              layoutId="swap-labeled-tab"
              transition={gentleSpring}
            />
          }
        />
      ) : null}
      {tab.icon}
      <span className={styles.label}>
        <span className={styles["label-text"]}>{tab.label}</span>
      </span>
    </Tray.Item>
  );
}
