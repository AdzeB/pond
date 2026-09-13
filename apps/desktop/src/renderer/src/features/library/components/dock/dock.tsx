import { Tray } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  downloadsSelection,
  useDownloadsSelectionSize,
} from "@/features/downloads/state/downloads-selection";
import { DownloadsSelectionContent } from "@/features/library/components/dock/selection/downloads";
import { selection } from "@/features/library/state/selection";
import { sourcesSelection } from "@/features/sources/state/sources-selection";
import styles from "./dock.module.css";

export function LibraryTray() {
  const downloadsSelectionSize = useDownloadsSelectionSize();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDownloads = pathname.startsWith("/downloads");
  const isSources = pathname.startsWith("/sources");

  useEffect(() => {
    if (isDownloads) {
      selection.clear();
      sourcesSelection.clear();
      return () => downloadsSelection.clear();
    }
    if (isSources) {
      selection.clear();
      downloadsSelection.clear();
      return () => sourcesSelection.clear();
    }
  }, [isDownloads, isSources]);

  if (!isDownloads || downloadsSelectionSize === 0) return null;

  return (
    <div className={styles.dock}>
      <div className={styles.shell}>
        <div className={styles.hit}>
          <Tray.Pill className={styles.pill}>
            <DownloadsSelectionContent />
          </Tray.Pill>
        </div>
      </div>
    </div>
  );
}
