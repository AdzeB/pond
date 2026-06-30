import { IconDotsVerticalFill18 as Kebab } from "@pond/icons/fill/18";
import type { Source } from "@pond/schema/db";
import { Button, Tooltip } from "@pond/ui";
import type { MouseEvent } from "react";
import { cardModel } from "@/components/library-sync-monitor/lib/helpers";
import { buildSourceMenu } from "@/components/library-sync-monitor/lib/source-menu";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";
import { showContextMenu } from "@/lib/ui/native-menu";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import styles from "./styles.module.css";

export function SourceRow({
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
  const needsFix = tone === "err" || tone === "paused";

  const progress = status?.progress;
  const pct =
    running && progress?.total
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  const openMenu = (e: MouseEvent) => {
    e.stopPropagation();
    void showContextMenu(buildSourceMenu(source, model, onOpen));
  };

  const fixLabel = tone === "paused" ? "Reconnect" : "Retry";
  const onFix = (e: MouseEvent) => {
    e.stopPropagation();
    if (tone === "paused") void window.pond.connectSource(source);
    else void window.pond.syncRunNow(source);
  };

  return (
    <div className={styles.row} data-tone={tone}>
      <button
        type="button"
        className={styles.main}
        onClick={() => onOpen(source)}
      >
        <span className={styles.lead}>
          <BrandTile source={source} size={32} />
          <span className={styles.dot} data-tone={tone} aria-hidden />
        </span>
        <span className={styles.body}>
          <span className={styles.name}>{def.label}</span>
          <span className={styles.status} data-tone={tone}>
            {model.statusText}
          </span>
        </span>
        <span className={styles.last}>{model.lastText}</span>
      </button>

      {needsFix ? (
        <Button size="sm" variant="secondary" onClick={onFix}>
          {fixLabel}
        </Button>
      ) : null}

      <Tooltip label={`${def.label} actions`}>
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label={`${def.label} actions`}
          onClick={openMenu}
        >
          <Kebab width={16} height={16} />
        </Button>
      </Tooltip>

      {running ? (
        <span className={styles.track} aria-hidden>
          {pct === null ? (
            <span className={styles.indet} />
          ) : (
            <span className={styles.fill} style={{ width: `${pct}%` }} />
          )}
        </span>
      ) : null}
    </div>
  );
}
