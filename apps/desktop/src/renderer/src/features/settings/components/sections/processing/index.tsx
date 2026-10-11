import { IconCircleInfoOutline12 } from "@pond/icons/outline/12";
import {
  IconCheckOutline18,
  IconCircleWarningOutline18,
  IconLoaderOutline18,
  IconPowerOffOutline18,
  IconTaskOutline18,
} from "@pond/icons/outline/18";
import { Button, Settings } from "@pond/ui";
import { useState } from "react";
import { useEnrichmentStatus } from "@/features/enrichment/status";
import { usePrefs } from "@/shared/state/prefs";
import styles from "./styles.module.css";

async function checkLibrary(): Promise<void> {
  if (window.pondSettings) {
    await window.pondSettings.checkLibrary();
    return;
  }
  const { runEnrichment } = await import("@/features/enrichment");
  runEnrichment();
}

export function ProcessingStatus() {
  const status = useEnrichmentStatus();
  const [ai, , loaded] = usePrefs("ai");
  const enabled =
    ai.semanticSearch ||
    ai.enableCaption ||
    ai.enableOcr ||
    ai.enableTranscript ||
    ai.enableClip ||
    ai.enableSensitiveContent ||
    ai.enableAutoTitle;
  return (
    <ProcessingStatusCard
      status={status}
      enabled={enabled}
      loaded={loaded}
      onCheck={checkLibrary}
    />
  );
}

export function ProcessingStatusCard({
  status,
  enabled,
  loaded = true,
  onCheck,
}: {
  status: ReturnType<typeof useEnrichmentStatus>;
  enabled: boolean;
  loaded?: boolean;
  onCheck: () => Promise<void>;
}) {
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const busy = checking || status.inflight > 0;
  const failed = status.failedKeys.size;
  const state =
    !loaded || busy
      ? "processing"
      : checkFailed || failed
        ? "attention"
        : enabled
          ? "ready"
          : "off";
  const title = !loaded
    ? "Loading processing settings"
    : checking
      ? "Checking your library"
      : status.inflight > 0
        ? "Processing your library"
        : checkFailed
          ? "Couldn't check your library"
          : failed
            ? "Processing needs attention"
            : enabled
              ? "Ready for new items"
              : "Local processing is off";
  const description = !loaded
    ? "Getting your processing preferences."
    : checking
      ? "Looking for saves that need processing."
      : status.inflight > 0
        ? "Pond is adding details to your saves."
        : checkFailed
          ? "Try checking the library again."
          : failed
            ? "Some tasks couldn't finish."
            : enabled
              ? "New saves are processed on this Mac."
              : "Turn on a processing option below to get started.";

  async function handleCheck() {
    setChecking(true);
    setCheckFailed(false);
    try {
      await onCheck();
    } catch {
      setCheckFailed(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Settings.List className={styles.card} data-state={state}>
      <div>
        <div className={styles.summary}>
          <span className={styles.indicator} aria-hidden="true">
            {state === "processing" ? (
              <IconLoaderOutline18 className={styles.spinner} />
            ) : state === "attention" ? (
              <IconCircleWarningOutline18 />
            ) : state === "off" ? (
              <IconPowerOffOutline18 />
            ) : (
              <IconCheckOutline18 />
            )}
          </span>
          <div className={styles.copy} aria-live="polite" aria-atomic="true">
            <Settings.ItemTitle className={styles.status}>
              {title}
            </Settings.ItemTitle>
            <p className={styles.description}>{description}</p>
          </div>
          <Button
            className={styles.action}
            size="sm"
            variant="secondary"
            disabled={!loaded || !enabled || busy}
            onClick={() => void handleCheck()}
          >
            {checking
              ? "Checking Library"
              : failed
                ? "Retry Processing"
                : "Check Library"}
          </Button>
        </div>
        <dl className={styles.metrics} aria-live="polite">
          <div className={styles.metric}>
            <dt>
              <IconTaskOutline18 aria-hidden />
              Tasks Running
            </dt>
            <dd>{status.inflight}</dd>
          </div>
          <div className={styles.metric}>
            <dt>
              <IconCircleWarningOutline18 aria-hidden />
              Need Retry
            </dt>
            <dd>{failed}</dd>
          </div>
        </dl>
      </div>
      <p className={styles.note}>
        <IconCircleInfoOutline12 aria-hidden />
        <span>Local processing pauses when the window is hidden.</span>
      </p>
    </Settings.List>
  );
}
