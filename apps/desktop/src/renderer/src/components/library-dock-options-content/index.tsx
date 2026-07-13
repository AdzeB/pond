import type { ViewMenuSection } from "@/components/library-dock/lib/types";
import { DisplaySection } from "@/components/library-view-menu-display";
import { LayoutSection } from "@/components/library-view-menu-layout";
import { SortSection } from "@/components/library-view-menu-sort";
import { ZoomSection } from "@/components/library-view-menu-zoom";
import styles from "./styles.module.css";

const SECTIONS: Record<ViewMenuSection, () => React.JSX.Element> = {
  layout: LayoutSection,
  zoom: ZoomSection,
  sort: SortSection,
  display: DisplaySection,
};

export function OptionsContent({ section }: { section: ViewMenuSection }) {
  const Section = SECTIONS[section];
  return (
    /** The dock's AnimatePresence and the pill's `layout` own the morph, so this is just the card content. */
    <div className={styles.card}>
      <Section />
    </div>
  );
}
