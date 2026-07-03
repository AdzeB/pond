import { DisplaySection } from "@/components/library-view-menu-display";
import { LayoutSection } from "@/components/library-view-menu-layout";
import { SortSection } from "@/components/library-view-menu-sort";
import { ZoomSection } from "@/components/library-view-menu-zoom";
import styles from "./styles.module.css";

// View options as a dock view: the same flat Sort / Layout / Zoom / Display
// panel that used to float as a popover, now morphed out of the pill. Every
// group is visible at once and applies live to the grid behind the dock.
export function OptionsContent() {
  return (
    // The dock's AnimatePresence wraps this in the swap motion.div; the pill's
    // `layout` owns the size morph, so this is just the card content.
    <div className={styles.card}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>View</span>
      </header>
      <hr className={styles.divider} />
      <LayoutSection />
      <ZoomSection />
      <hr className={styles.divider} />
      <SortSection />
      <hr className={styles.divider} />
      <DisplaySection />
    </div>
  );
}
