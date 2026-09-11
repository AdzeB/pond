import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import {
  IconDownloadOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import { Accordion, Button, TitleBar } from "@pond/ui";
import type {
  DownloadActivity,
  DownloadTransfer,
} from "@shared/download-activity";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { downloadStatusLabel } from "@/features/downloads/components/page/status";
import {
  useDownloadActivity,
  useDownloadClock,
} from "@/features/downloads/hooks/use-download-activity";
import {
  DOWNLOAD_PHASE_LABELS,
  describeDownloadActivity,
  downloadActivityForSave,
  formatBytes,
  formatDuration,
} from "@/features/downloads/lib/download-progress";
import { projectLiveDownloads } from "@/features/downloads/lib/status-feed/downloads";
import {
  libraryChrome,
  useInspectorMode,
  useRightPane,
} from "@/features/library/state/library-chrome";
import { useMediaPickOptions } from "@/features/saves/hooks/use-media-pick-options";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { pickPrimaryUnit } from "@/features/saves/lib/media/units";
import { openSave } from "@/features/saves/lib/save-nav";
import { pool } from "@/features/saves/state/pool";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./download-inspector.module.css";

export function DownloadInspector({ saveId }: { saveId: string }) {
  const save = useSave(saveId);
  const pane = useRightPane();
  const mode = useInspectorMode();
  const active = pane === "inspector" && mode === "download";
  const hydration = useQuery({
    queryKey: ["downloads.inspectSave", saveId],
    enabled: active && !save,
    queryFn: async () => {
      await ensureSaves([saveId]);
      if (!pool.get(saveId)) throw new Error("Save is unavailable");
      return true;
    },
  });
  const query = useDownloadActivity(active);
  const latestActivity = downloadActivityForSave(query.data ?? [], saveId);
  const activity =
    save?.status === "ingesting" && latestActivity?.state !== "running"
      ? undefined
      : latestActivity;
  const now = useDownloadClock(active && activity?.state === "running");
  const options = useMediaPickOptions();
  const unit = save ? pickPrimaryUnit(save, options) : null;
  const row = save ? projectLiveDownloads([save])[0] : undefined;
  const fallbackStatus = row
    ? downloadStatusLabel(row, false)
    : save?.status === "complete"
      ? "Saved to your library"
      : undefined;
  return (
    <DownloadInspectorView
      title={save?.title?.trim() || save?.url || "Download"}
      thumbnailUrl={(unit?.isVideo ? unit.posterUrl : unit?.url) ?? undefined}
      activity={activity}
      loading={query.isPending}
      error={query.isError}
      saveLoading={!save && hydration.isPending}
      saveError={!save && hydration.isError}
      fallbackStatus={fallbackStatus}
      fallbackError={row?.error ?? undefined}
      now={now}
      onClose={libraryChrome.closeRightPane}
      onOpenSave={() => openSave(saveId)}
      onRetry={() => {
        if (!save) void hydration.refetch();
        void query.refetch();
      }}
    />
  );
}

interface DownloadInspectorViewProps {
  title: string;
  thumbnailUrl?: string;
  activity?: DownloadActivity;
  loading?: boolean;
  error?: boolean;
  saveLoading?: boolean;
  saveError?: boolean;
  fallbackStatus?: string;
  fallbackError?: string;
  now: number;
  onClose: () => void;
  onOpenSave: () => void;
  onRetry: () => void;
}

export function DownloadInspectorView({
  title,
  thumbnailUrl,
  activity,
  loading,
  error,
  saveLoading,
  saveError,
  fallbackStatus,
  fallbackError,
  now,
  onClose,
  onOpenSave,
  onRetry,
}: DownloadInspectorViewProps) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const scrollFade = useScrollFade<HTMLDivElement>();
  const observedAt = error && activity ? activity.updatedAt : now;
  const description = activity
    ? describeDownloadActivity(activity, observedAt)
    : null;
  const activeTransfers =
    activity?.transfers.filter(
      (transfer) =>
        transfer.state === "requesting" || transfer.state === "receiving",
    ) ?? [];
  const lastTransfer = activity?.transfers.at(-1);
  const transfers =
    activeTransfers.length > 0
      ? activeTransfers
      : lastTransfer
        ? [lastTransfer]
        : [];
  return (
    <div className={styles.root}>
      <TitleBar.Root className={styles.header}>
        <TitleBar.Start>
          <TitleBar.Label>Details</TitleBar.Label>
        </TitleBar.Start>
        <TitleBar.End>
          <Button
            type="button"
            icon
            size="xs"
            variant="ghost"
            aria-label="Close download details"
            onClick={onClose}
          >
            <IconXmarkOutline18 />
          </Button>
        </TitleBar.End>
      </TitleBar.Root>
      <div className={styles.scroll} {...scrollFade}>
        <div className={styles.identity}>
          <span className={styles.thumbnail} aria-hidden="true">
            {thumbnailUrl && thumbnailUrl !== failedUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                onError={() => setFailedUrl(thumbnailUrl)}
              />
            ) : (
              <IconDownloadOutline18 />
            )}
          </span>
          <div className={styles.copy}>
            <h2 className={styles.title}>{title}</h2>
            <Button
              type="button"
              size="xs"
              variant="link"
              disabled={saveLoading || saveError}
              onClick={onOpenSave}
            >
              Open Save
            </Button>
          </div>
        </div>
        {saveError ? (
          <div className={styles.notice} role="status">
            <p>Couldn't load this save.</p>
            <Button size="xs" variant="secondary" onClick={onRetry}>
              Try Again
            </Button>
          </div>
        ) : saveLoading ? (
          <p className={styles.empty} role="status">
            Loading save
          </p>
        ) : null}
        {error ? (
          <div className={styles.notice} role="status">
            <p>Download activity is unavailable.</p>
            <Button size="xs" variant="secondary" onClick={onRetry}>
              Try Again
            </Button>
          </div>
        ) : loading ? (
          <p className={styles.empty} role="status">
            Loading download activity
          </p>
        ) : !activity ? (
          <div className={styles.empty}>
            {fallbackStatus ? (
              <p className={styles.fallbackStatus}>{fallbackStatus}</p>
            ) : null}
            {fallbackError ? <p>{fallbackError}</p> : null}
            <p>No recent activity is available for this download.</p>
          </div>
        ) : null}
        {activity && description ? (
          <>
            <section
              className={styles.section}
              aria-label="Current download status"
            >
              <div className={styles.status}>
                <span
                  className={styles.indicator}
                  data-state={activity.state}
                  aria-hidden="true"
                />
                <span>{description.label}</span>
                <span className={styles.elapsed}>
                  {formatDuration(
                    (activity.state === "running"
                      ? observedAt
                      : activity.updatedAt) - activity.phaseStartedAt,
                  )}
                </span>
              </div>
              {description.detail &&
              (description.stalled || activeTransfers.length > 1) ? (
                <p
                  className={styles.detail}
                  data-stalled={description.stalled || undefined}
                >
                  {description.detail}
                </p>
              ) : null}
              {transfers.map((transfer) => (
                <TransferProgress
                  key={transfer.transferId ?? transfer.fileIndex}
                  transfer={transfer}
                  live={activity.state === "running" && !error}
                  now={now}
                />
              ))}
            </section>
            <section className={styles.section} aria-label="Download activity">
              <h3 className={styles.sectionTitle}>Activity</h3>
              <ol className={styles.timeline}>
                {activity.timeline.slice(-8).map((event, index, events) => {
                  const next = events[index + 1];
                  const current =
                    !next && activity.state === "running" && !error;
                  return (
                    <li
                      className={styles.event}
                      key={`${event.at}-${event.phase}-${event.fileIndex ?? "task"}`}
                      data-current={current || undefined}
                    >
                      <span className={styles.eventDot} aria-hidden="true" />
                      <span>
                        {DOWNLOAD_PHASE_LABELS[event.phase]}
                        {event.fileIndex ? (
                          <small>File {event.fileIndex}</small>
                        ) : null}
                      </span>
                      <span className={styles.timing}>
                        {current
                          ? "Now"
                          : formatTiming(
                              (next?.at ?? activity.updatedAt) - event.at,
                            )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
            {transfers.some((transfer) => transfer.request) ? (
              <Accordion.Root
                className={styles.section}
                defaultValue={["request"]}
              >
                <Accordion.Item value="request">
                  <Accordion.Header>
                    <Accordion.Trigger className={styles.requestTrigger}>
                      Request Details
                      <IconChevronDownOutline12 />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Panel className={styles.requestPanel}>
                    {transfers.map((transfer) =>
                      transfer.request ? (
                        <RequestDetails
                          key={transfer.transferId ?? transfer.fileIndex}
                          transfer={transfer}
                          multiple={transfers.length > 1}
                        />
                      ) : null,
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion.Root>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatTiming(ms: number): string {
  return ms < 1_000 ? `${Math.max(0, Math.round(ms))} ms` : formatDuration(ms);
}

function TransferProgress({
  transfer,
  live,
  now,
}: {
  transfer: DownloadTransfer;
  live: boolean;
  now: number;
}) {
  const measured = transfer.receivedBytes != null;
  const percent =
    measured && transfer.totalBytes && transfer.totalBytes > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((transfer.receivedBytes ?? 0) / transfer.totalBytes) * 100,
          ),
        )
      : null;
  const fresh =
    live &&
    transfer.state === "receiving" &&
    now - (transfer.lastByteAt ?? transfer.startedAt) < 3_000;
  return (
    <div className={styles.transfer}>
      {transfer.fileCount && transfer.fileCount > 1 ? (
        <span className={styles.detail}>
          File {transfer.fileIndex} of {transfer.fileCount}
        </span>
      ) : null}
      {measured ? (
        <>
          <div className={styles.metrics}>
            <span>
              {formatBytes(transfer.receivedBytes ?? 0)}
              {transfer.totalBytes
                ? ` / ${formatBytes(transfer.totalBytes)}`
                : " received"}
            </span>
            {percent !== null ? (
              <span className={styles.detail}>{Math.round(percent)}%</span>
            ) : null}
          </div>
          {percent !== null ? (
            <progress
              className={styles.progress}
              aria-label={`File ${transfer.fileIndex} download progress`}
              max={100}
              value={percent}
            />
          ) : null}
          {fresh ? (
            <div className={styles.metrics}>
              <span className={styles.detail}>
                {transfer.bytesPerSecond != null
                  ? `${formatBytes(transfer.bytesPerSecond)}/s`
                  : null}
              </span>
              <span className={styles.detail}>
                {transfer.etaSeconds != null
                  ? `About ${formatDuration(transfer.etaSeconds * 1_000)} left`
                  : null}
              </span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function RequestDetails({
  transfer,
  multiple,
}: {
  transfer: DownloadTransfer;
  multiple: boolean;
}) {
  const request = transfer.request;
  if (!request) return null;
  return (
    <div className={styles.request}>
      {multiple ? (
        <h4 className={styles.sectionTitle}>File {transfer.fileIndex}</h4>
      ) : null}
      <dl className={styles.properties}>
        <dt>Method</dt>
        <dd>{request.method}</dd>
        <dt>Host</dt>
        <dd>{request.host}</dd>
        {request.status != null ? (
          <>
            <dt>Response</dt>
            <dd>{request.status}</dd>
          </>
        ) : null}
        {request.contentType ? (
          <>
            <dt>Content type</dt>
            <dd>{request.contentType}</dd>
          </>
        ) : null}
        {request.responseMs != null ? (
          <>
            <dt>Server response</dt>
            <dd>{formatTiming(request.responseMs)}</dd>
          </>
        ) : null}
        {request.firstByteMs != null ? (
          <>
            <dt>First byte</dt>
            <dd>{formatTiming(request.firstByteMs)}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
