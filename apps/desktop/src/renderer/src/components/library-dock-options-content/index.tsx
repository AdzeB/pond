import { TrayCard } from "@pond/ui";
import type { ViewMenuSection } from "@/components/library-dock/lib/types";
import { ConnectSourceSection } from "@/components/library-dock-connect-content";
import { ConnectWaitSection } from "@/components/library-dock-connect-content/wait";
import { AccountDetailSection } from "@/components/library-dock-detail-content";
import { FrequencySection } from "@/components/library-dock-detail-content/frequency";
import { WatchDetailSection } from "@/components/library-dock-detail-content/watch";
import { SourceNewSection } from "@/components/library-dock-source-new-content";
import { WatchSourceSection } from "@/components/library-dock-watch-content";
import { WatchTargetSection } from "@/components/library-dock-watch-content/target";
import { DisplaySection } from "@/components/library-view-menu-display";
import { LayoutSection } from "@/components/library-view-menu-layout";
import {
  SortGroupSection,
  SortSection,
} from "@/components/library-view-menu-sort";
import { ZoomSection } from "@/components/library-view-menu-zoom";
import { SearchHelpSection } from "@/components/search-bar/lib/help";
import styles from "./styles.module.css";

const SECTIONS: Record<ViewMenuSection, () => React.JSX.Element> = {
  layout: LayoutSection,
  zoom: ZoomSection,
  sort: SortSection,
  "sort-date": () => <SortGroupSection group="date" />,
  "sort-content": () => <SortGroupSection group="content" />,
  "sort-file": () => <SortGroupSection group="file" />,
  display: DisplaySection,
  "search-help": SearchHelpSection,
  "connect-source": ConnectSourceSection,
  "connect-wait": ConnectWaitSection,
  "watch-source": WatchSourceSection,
  "watch-target": WatchTargetSection,
  "account-detail": AccountDetailSection,
  "watch-detail": WatchDetailSection,
  "sync-frequency": FrequencySection,
  "source-new": SourceNewSection,
};

export function OptionsContent({ section }: { section: ViewMenuSection }) {
  const Section = SECTIONS[section];
  return (
    /** The dock's AnimatePresence and the pill's `layout` own the morph, so this is just the card content. */
    <TrayCard.Root className={styles.card} data-section={section}>
      <Section />
    </TrayCard.Root>
  );
}
