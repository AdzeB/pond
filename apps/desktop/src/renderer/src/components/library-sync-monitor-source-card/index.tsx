import { IconFillLoaderOutline18 as Loader } from "@pond/icons/outline/18";
import type { Source } from "@pond/schema/db";
import type { MouseEvent } from "react";
import { cardModel } from "@/components/library-sync-monitor/lib/helpers";
import { buildSourceMenu } from "@/components/library-sync-monitor/lib/source-menu";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";
import { showContextMenu } from "@/lib/ui/native-menu";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import styles from "./styles.module.css";

// A single source rendered as an app-icon tile: brand icon + name label, like a
// launcher grid. Status is surfaced only when it needs attention (running,
// error, paused) so healthy/idle sources read as a calm icon grid. Click opens
// the source dialog; right-click opens the same action menu as the list row.
export function SourceCard({
  source,
  status,
  onOpen,
}: {
  source: Source;
  status: SyncSourceStatus | undefined;
  onOpen: (source: Source) => void;
}) {
  const def = getSourceDef(source);
  const model = cardModel(status);
  const { tone } = model;
  const running = tone === "run";
  const flagged = tone === "err" || tone === "paused";

  const openMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void showContextMenu(buildSourceMenu(source, model, onOpen));
  };

  return (
    <button
      type="button"
      className={styles.tile}
      data-tone={tone}
      title={model.statusText}
      onClick={() => onOpen(source)}
      onContextMenu={openMenu}
    >
      <span className={styles.iconWrap}>
        <BrandTile source={source} size={56} />
        {running ? (
          <span className={styles.badge} aria-hidden>
            <Loader className={styles.spinner} width={12} height={12} />
          </span>
        ) : flagged ? (
          <span className={styles.dot} data-tone={tone} aria-hidden />
        ) : null}
      </span>
      <span className={styles.label}>{def.label}</span>
    </button>
  );
}
