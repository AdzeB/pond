import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { Settings, Shell, TitleBar } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Suspense } from "react";
import { SettingsSectionView } from "@/components/settings-engine";
import {
  isBespokeSection,
  sectionForId,
  sectionForPath,
} from "@/lib/settings/registry";
import styles from "./styles.module.css";

// Detail page for a single settings section. Field-style sections flow into a
// centered single column; bespoke sections (Tags, Library) bring their own
// full layout.
export function SettingsDetail({ section }: { section: string }) {
  const def = sectionForPath(section);
  if (!def) return null;

  const bespoke = isBespokeSection(def);
  const parent = def.parent ? sectionForId(def.parent) : undefined;

  return (
    <>
      <Shell.Mask />
      <Shell.Header>
        <TitleBar.Root>
          <TitleBar.Title>
            <TitleBar.Meta aria-label="Breadcrumb">
              <motion.span
                className={styles.crumbs}
                initial={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link to="/settings" className={styles.link}>
                  Settings
                </Link>
                <motion.span
                  key={`sep-${def.id}`}
                  className={styles.icon}
                  initial={{ x: -3, opacity: 0.4 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ChevronRight width={12} height={12} />
                </motion.span>
                {parent ? (
                  <>
                    <Link
                      to="/settings/$section"
                      params={{ section: parent.path }}
                      className={styles.link}
                    >
                      {parent.label}
                    </Link>
                    <motion.span
                      key={`sep-parent-${parent.id}`}
                      className={styles.icon}
                      initial={{ x: -3, opacity: 0.4 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <ChevronRight width={12} height={12} />
                    </motion.span>
                  </>
                ) : null}
                <span className={styles.currentWrap}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={def.id}
                      className={styles.current}
                      initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {def.label}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.span>
            </TitleBar.Meta>
          </TitleBar.Title>
        </TitleBar.Root>
      </Shell.Header>

      <div className={styles.body}>
        <Suspense fallback={null}>
          {bespoke ? (
            <SettingsSectionView config={def.config} />
          ) : (
            <Settings.Page width="medium">
              <SettingsSectionView config={def.config} />
            </Settings.Page>
          )}
        </Suspense>
      </div>
    </>
  );
}
