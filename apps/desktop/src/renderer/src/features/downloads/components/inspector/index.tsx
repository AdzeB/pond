import {
  IconArrowUpRightOutline18,
  IconBanOutline18,
  IconClone2Outline18,
  IconTrashXmarkOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import { Button, PaneBody, PaneHeader, Tooltip } from "@pond/ui";
import type {
  DownloadActivity,
  DownloadTransfer,
} from "@shared/download-activity";
import { type QueueAttempt, QueueAttemptSchema } from "@shared/queue-contracts";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { z } from "zod";
import {
  canSkipDownload,
  canTrashDownload,
  confirmSkipDownloadRows,
  confirmTrashDownloadRows,
} from "@/features/downloads/components/lib/actions";
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
import {
  SaveInfoSections,
  SaveInfoSectionsSkeleton,
} from "@/features/saves/components/detail/info-sections";
import { Section } from "@/features/saves/components/detail/section";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { openSave } from "@/features/saves/lib/save-nav";
import { pool } from "@/features/saves/state/pool";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import {
  type DownloadInspectorProperty,
  type DownloadInspectorTask,
  downloadInspectorDetails,
} from "./inspector-model";
import styles from "./styles.module.css";

function HeaderIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label} side="bottom">
      <Button
        type="button"
        icon
        size="sm"
        variant="ghost"
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

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
  const attempts = useQuery({
    queryKey: ["queue.attempts", saveId],
    enabled: active,
    queryFn: async () =>
      z
        .array(QueueAttemptSchema)
        .parse(await window.pond.query("queue.attempts", { saveId })),
    refetchInterval: 2_000,
  });
  const latestActivity = downloadActivityForSave(query.data ?? [], saveId);
  const activity =
    save?.status === "ingesting" && latestActivity?.state !== "running"
      ? undefined
      : latestActivity;
  const now = useDownloadClock(active && activity?.state === "running");
  const row = save ? projectLiveDownloads([save])[0] : undefined;
  const fallbackStatus = row
    ? downloadStatusLabel(row, false)
    : save?.status === "complete"
      ? "Completed"
      : undefined;
  const details = save ? downloadInspectorDetails(save, now) : undefined;
  return (
    <DownloadInspectorView
      activity={activity}
      loading={query.isPending}
      error={query.isError}
      saveLoading={!save && hydration.isPending}
      saveError={!save && hydration.isError}
      fallbackStatus={fallbackStatus}
      fallbackError={row?.error ?? undefined}
      tasks={details?.tasks}
      properties={details?.properties}
      attempts={attempts.data}
      details={
        save ? (
          <SaveInfoSections
            save={save}
            pending={save.status === "ingesting"}
            hideActivity
          />
        ) : undefined
      }
      now={now}
      onClose={libraryChrome.closeRightPane}
      onOpenSave={
        save?.status === "complete" ? () => openSave(saveId) : undefined
      }
      onSkip={
        row && canSkipDownload(row)
          ? () => confirmSkipDownloadRows([row])
          : undefined
      }
      onTrash={
        row && canTrashDownload(row)
          ? () => confirmTrashDownloadRows([row])
          : undefined
      }
      onCopyError={
        row?.error
          ? () => {
              void window.pond.query("clipboard.writeText", {
                text: row.error ?? "",
              });
            }
          : undefined
      }
      onRetry={() => {
        if (!save) void hydration.refetch();
        void query.refetch();
      }}
    />
  );
}

interface DownloadInspectorViewProps {
  activity?: DownloadActivity;
  loading?: boolean;
  error?: boolean;
  saveLoading?: boolean;
  saveError?: boolean;
  fallbackStatus?: string;
  fallbackError?: string;
  tasks?: DownloadInspectorTask[];
  properties?: DownloadInspectorProperty[];
  attempts?: QueueAttempt[];
  details?: ReactNode;
  now: number;
  onClose: () => void;
  onOpenSave?: () => void;
  onSkip?: () => void;
  onTrash?: () => void;
  onCopyError?: () => void;
  onRetry: () => void;
}

export function DownloadInspectorView({
  activity,
  loading,
  error,
  saveLoading,
  saveError,
  fallbackStatus,
  fallbackError,
  tasks = [],
  properties = [],
  attempts = [],
  details,
  now,
  onClose,
  onOpenSave,
  onSkip,
  onTrash,
  onCopyError,
  onRetry,
}: DownloadInspectorViewProps) {
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
      <PaneHeader title="Details">
        {onOpenSave && !saveLoading && !saveError ? (
          <HeaderIcon label="Open Save" onClick={onOpenSave}>
            <IconArrowUpRightOutline18 />
          </HeaderIcon>
        ) : null}
        {onSkip ? (
          <HeaderIcon label="Skip Download" onClick={onSkip}>
            <IconBanOutline18 />
          </HeaderIcon>
        ) : null}
        {onTrash ? (
          <HeaderIcon label="Move to Trash" onClick={onTrash}>
            <IconTrashXmarkOutline18 />
          </HeaderIcon>
        ) : null}
        {onCopyError ? (
          <HeaderIcon label="Copy Error" onClick={onCopyError}>
            <IconClone2Outline18 />
          </HeaderIcon>
        ) : null}
        <HeaderIcon label="Close Details" onClick={onClose}>
          <IconXmarkOutline18 />
        </HeaderIcon>
      </PaneHeader>
      <PaneBody className={styles.scroll} {...scrollFade}>
        {saveError ? (
          <div className={styles.notice} role="status">
            <p>Couldn't load this save.</p>
            <Button size="xs" variant="secondary" onClick={onRetry}>
              Try Again
            </Button>
          </div>
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
          fallbackStatus || fallbackError ? (
            <section
              className={styles.overview}
              aria-label="Current download status"
            >
              {fallbackStatus ? (
                <p className={styles["fallback-status"]}>{fallbackStatus}</p>
              ) : null}
              {fallbackError ? (
                <p className={styles.detail}>{fallbackError}</p>
              ) : null}
            </section>
          ) : tasks.length === 0 && properties.length === 0 ? (
            <div className={styles.empty}>
              <p>No recent activity is available for this download.</p>
            </div>
          ) : null
        ) : null}
        {activity && description ? (
          <>
            <section
              className={styles.overview}
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
              {fallbackError ? (
                <p className={styles.detail}>{fallbackError}</p>
              ) : null}
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
            <Section title="Activity">
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
                      <span
                        className={styles["event-dot"]}
                        aria-hidden="true"
                      />
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
              <ActivityProperties properties={properties} />
            </Section>
            {transfers.some((transfer) => transfer.request) ? (
              <Section title="Request Details">
                {transfers.map((transfer) =>
                  transfer.request ? (
                    <RequestDetails
                      key={transfer.transferId ?? transfer.fileIndex}
                      transfer={transfer}
                      multiple={transfers.length > 1}
                    />
                  ) : null,
                )}
              </Section>
            ) : null}
          </>
        ) : tasks.length > 0 || properties.length > 0 ? (
          <Section title="Activity">
            {tasks.length > 0 ? (
              <ol className={styles.timeline}>
                {tasks.map((task) => (
                  <li
                    className={styles.event}
                    key={task.id}
                    data-current={task.current || undefined}
                  >
                    <span className={styles["event-dot"]} aria-hidden="true" />
                    <span>
                      {task.label}
                      {task.error ? <small>{task.error}</small> : null}
                    </span>
                    <span className={styles.timing}>{task.statusLabel}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            <ActivityProperties properties={properties} />
          </Section>
        ) : null}
        {attempts.length > 0 ? (
          <Section title="Attempt History">
            <ol className={styles.timeline}>
              {attempts.map((attempt) => (
                <li className={styles.event} key={attempt.id}>
                  <span className={styles["event-dot"]} aria-hidden="true" />
                  <span>
                    {attempt.op ?? "Source gate"}: {attempt.outcome}
                    {attempt.errorMessage ? (
                      <small>{attempt.errorMessage}</small>
                    ) : null}
                  </span>
                  <span className={styles.timing}>
                    {new Date(attempt.ts).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}
        {saveLoading ? <SaveInfoSectionsSkeleton /> : details}
      </PaneBody>
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
        <h4 className={styles["section-title"]}>File {transfer.fileIndex}</h4>
      ) : null}
      <dl className={styles.rows}>
        <Property label="Method" value={request.method} />
        <Property label="Host" value={request.host} />
        {request.status != null ? (
          <Property label="Response" value={String(request.status)} />
        ) : null}
        {request.contentType ? (
          <Property label="Content type" value={request.contentType} />
        ) : null}
        {request.responseMs != null ? (
          <Property
            label="Server response"
            value={formatTiming(request.responseMs)}
          />
        ) : null}
        {request.firstByteMs != null ? (
          <Property
            label="First byte"
            value={formatTiming(request.firstByteMs)}
          />
        ) : null}
      </dl>
    </div>
  );
}

function Property({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles["property-label"]}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}

function ActivityProperties({
  properties,
}: {
  properties: DownloadInspectorProperty[];
}) {
  if (properties.length === 0) return null;
  return (
    <dl className={styles["activity-properties"]}>
      {properties.map((property) => (
        <Property
          key={property.label}
          label={property.label}
          value={property.value}
        />
      ))}
    </dl>
  );
}
