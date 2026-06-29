import type { Source } from "@pond/schema/db";
import type { MouseEvent } from "react";
import { cardModel } from "@/components/library-sync-monitor/lib/helpers";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";
import { type NativeMenuItem, showContextMenu } from "@/lib/ui/native-menu";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import styles from "./styles.module.css";

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
  const needsFix = tone === "err" || tone === "paused";
  const progress = status?.progress;
  const fillWidth =
    running && progress?.total
      ? `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`
      : undefined;

  const openMenu = (e: MouseEvent) => {
    e.stopPropagation();
    const items: NativeMenuItem[] = [
      running
        ? {
            label: "Cancel sync",
            onSelect: () => void window.pond.syncCancel(source),
          }
        : tone === "paused"
          ? {
              label: "Reconnect",
              onSelect: () => void window.pond.connectSource(source),
            }
          : tone === "err"
            ? {
                label: "Retry now",
                onSelect: () => void window.pond.syncRunNow(source),
              }
            : !model.connected
              ? {
                  label: "Connect",
                  onSelect: () => void window.pond.connectSource(source),
                }
              : {
                  label: "Sync now",
                  onSelect: () => void window.pond.syncRunNow(source),
                },
    ];
    if (model.connected && !running) {
      items.push(
        {
          label: "Backfill",
          onSelect: () =>
            void window.pond.syncRunNow(source, { forceFull: true }),
        },
        {
          label: "Refresh metadata",
          onSelect: () => void window.pond.refreshBackfillStart({ source }),
        },
        {
          label: "Re-download at full quality",
          onSelect: () =>
            void window.pond.refreshBackfillStart({ source, overwrite: true }),
        },
      );
    }
    items.push(
      { type: "separator" },
      { label: "Open settings", onSelect: () => onOpen(source) },
    );
    void showContextMenu(items);
  };

  const fixLabel = tone === "paused" ? "Re-authenticate" : "Retry now";
  const onFix = (e: MouseEvent) => {
    e.stopPropagation();
    if (tone === "paused") void window.pond.connectSource(source);
    else void window.pond.syncRunNow(source);
  };

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onOpen(source)}
    >
      <div className={styles.cardTop}>
        <span className={styles.ring}>
          <BrandTile source={source} size={36} />
          <span className={`${styles.dot} ${styles[tone]}`} aria-hidden />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className={styles.cardName}>{def.label}</div>
          <div className={`${styles.cardSt} ${styles.st} ${styles[tone]}`}>
            {model.statusText}
          </div>
        </div>
        <button
          type="button"
          className={styles.kebab}
          aria-label={`${def.label} actions`}
          onClick={openMenu}
        >
          ⋯
        </button>
      </div>

      {needsFix ? (
        <div className={styles.fix}>
          <button type="button" onClick={onFix}>
            {fixLabel}
          </button>
          <button
            type="button"
            className={styles.ghost}
            aria-label="Open settings"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(source);
            }}
          >
            ⚙
          </button>
        </div>
      ) : (
        <div className={styles.minibar}>
          {running ? (
            <i
              className={fillWidth ? undefined : styles.liveFill}
              style={
                fillWidth
                  ? { width: fillWidth, background: "var(--run)" }
                  : undefined
              }
            />
          ) : (
            <i
              style={{
                width: "100%",
                background: tone === "ok" ? "var(--ok)" : "var(--bar)",
              }}
            />
          )}
        </div>
      )}

      <div className={styles.cardMeta}>
        <span>{model.meta}</span>
        <span>
          <b>{model.lastText}</b>
        </span>
      </div>
    </button>
  );
}
