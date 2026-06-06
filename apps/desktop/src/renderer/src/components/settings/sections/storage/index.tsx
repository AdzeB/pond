import { IconChevronExpandYOutline18 as ChevronsUpDown } from "@pond/icons/outline/18";
import type { Prefs } from "@pond/schema/db";
import { Button, Select, Settings, Switch, useToast } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Binding } from "@/components/settings/engine";
import { formatBytes } from "@/lib/format";
import type { StorageGuardStatusWire } from "../../../../../../preload";
import styles from "./styles.module.css";

type StoragePrefs = Prefs["storage"];
type StorageAction = StoragePrefs["action"];

const applyGuard = () => {
  // Watcher rearm errors get logged in main; UI stays responsive.
  void window.pond.query("storage.applyGuardPrefs", {}).catch(() => {});
};

const ACTION_LABELS: Record<
  StorageAction,
  { label: string; description: string }
> = {
  warn: { label: "Notify Me", description: "Show a warning only." },
  pauseSync: {
    label: "Pause Source Syncs",
    description: "Stop background syncs until usage drops.",
  },
  pauseVideo: {
    label: "Pause Auto Video Downloads",
    description: "Skip yt-dlp until usage drops.",
  },
};

export function NoHardCapRow({ binding }: { binding: Binding }) {
  const values = binding.values as Partial<StoragePrefs>;
  const patch = binding.patch as (delta: Partial<StoragePrefs>) => void;
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>No Hard Cap</Settings.ItemTitle>
        <Settings.ItemDescription>
          Pond never blocks new saves. Only the warn threshold fires.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Switch.Root
          checked={values.maxLibraryGb === null}
          onCheckedChange={(v) => {
            patch({ maxLibraryGb: v ? null : (values.maxLibraryGb ?? 50) });
            applyGuard();
          }}
        />
      </Settings.ItemControl>
    </>
  );
}

export function ActionRow({ binding }: { binding: Binding }) {
  const values = binding.values as Partial<StoragePrefs>;
  const patch = binding.patch as (delta: Partial<StoragePrefs>) => void;
  const action = values.action ?? "warn";
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Action When Exceeded</Settings.ItemTitle>
        <Settings.ItemDescription>
          {ACTION_LABELS[action].description}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Select.Root
          value={action}
          onValueChange={(v) => {
            patch({ action: v as StorageAction });
            applyGuard();
          }}
        >
          <Select.Trigger>
            <Select.Value>{ACTION_LABELS[action].label}</Select.Value>
            <Select.Icon>
              <ChevronsUpDown />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={6}>
              <Select.Popup>
                <Select.Item value="warn">
                  {ACTION_LABELS.warn.label}
                </Select.Item>
                <Select.Item value="pauseSync">
                  {ACTION_LABELS.pauseSync.label}
                </Select.Item>
                <Select.Item value="pauseVideo">
                  {ACTION_LABELS.pauseVideo.label}
                </Select.Item>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </Settings.ItemControl>
    </>
  );
}

interface StorageSnapshotWire {
  pondBytes: number;
  breakdown: {
    items: number;
    videoCache: number;
    thumbs: number;
    meta: number;
    db: number;
    other: number;
  };
  deviceTotalBytes: number;
  deviceFreeBytes: number;
  deviceUsedByOthersBytes: number;
  libraryRoot: string;
  computedAt: string;
}

type BreakdownKey = keyof StorageSnapshotWire["breakdown"];

const BREAKDOWN_LABELS: Record<BreakdownKey, string> = {
  items: "Items",
  videoCache: "Video cache",
  thumbs: "Thumbnails",
  meta: "Metadata",
  db: "Database",
  other: "Other",
};

const BREAKDOWN_SEGMENT_CLASS: Record<BreakdownKey, string> = {
  items: styles["usage-bar-segment-items"] ?? "",
  videoCache: styles["usage-bar-segment-video-cache"] ?? "",
  thumbs: styles["usage-bar-segment-thumbs"] ?? "",
  meta: styles["usage-bar-segment-meta"] ?? "",
  db: styles["usage-bar-segment-db"] ?? "",
  other: styles["usage-bar-segment-other"] ?? "",
};

const BREAKDOWN_ORDER: BreakdownKey[] = [
  "items",
  "videoCache",
  "thumbs",
  "meta",
  "db",
  "other",
];

export function DiskUsage() {
  const [snapshot, setSnapshot] = useState<StorageSnapshotWire | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const next = (await window.pond.query(
        "storage.snapshot",
        {},
      )) as StorageSnapshotWire;
      setSnapshot(next);
    } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : String(err));
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  const qc = useQueryClient();
  useQuery<StorageGuardStatusWire | null>({
    queryKey: ["storage", "guardState"],
    queryFn: async () => {
      const s = await window.pond.query("storage.guardState", {});
      return s ? (s as StorageGuardStatusWire) : null;
    },
  });

  useEffect(() => {
    return window.pond.onStorageStatus((s) => {
      qc.setQueryData<StorageGuardStatusWire | null>(
        ["storage", "guardState"],
        s,
      );
    });
  }, [qc]);

  const usagePercents = useMemo(() => {
    if (!snapshot || snapshot.deviceTotalBytes <= 0) return null;
    const total = snapshot.deviceTotalBytes;
    const segments: { key: string; pct: number; className: string }[] = [];
    for (const key of BREAKDOWN_ORDER) {
      const bytes = snapshot.breakdown[key];
      if (bytes <= 0) continue;
      segments.push({
        key,
        pct: (bytes / total) * 100,
        className: BREAKDOWN_SEGMENT_CLASS[key],
      });
    }
    const otherDevice = Math.max(0, snapshot.deviceUsedByOthersBytes);
    if (otherDevice > 0) {
      segments.push({
        key: "device-others",
        pct: (otherDevice / total) * 100,
        className: styles["usage-bar-segment-device"] ?? "",
      });
    }
    return segments;
  }, [snapshot]);

  return (
    <>
      <div className={styles["usage-headline"]}>
        <div className={styles["usage-stat"]}>
          <span className={styles["usage-stat-value"]}>
            {snapshot ? formatBytes(snapshot.pondBytes) : "…"}
          </span>
          <span className={styles["usage-stat-label"]}>used by Pond</span>
        </div>
        <div className={styles["usage-stat"]}>
          <span className={styles["usage-stat-value"]}>
            {snapshot ? formatBytes(snapshot.deviceFreeBytes) : "…"}
          </span>
          <span className={styles["usage-stat-label"]}>
            free on this device
          </span>
        </div>
        {snapshot ? (
          <div className={styles["usage-stat"]}>
            <span className={styles["usage-stat-value"]}>
              {formatBytes(snapshot.deviceTotalBytes)}
            </span>
            <span className={styles["usage-stat-label"]}>
              total on this device
            </span>
          </div>
        ) : null}
      </div>
      <div className={styles["usage-bar"]} aria-hidden>
        {usagePercents
          ? usagePercents.map((seg) => (
              <div
                key={seg.key}
                className={[styles["usage-bar-segment"], seg.className]
                  .filter(Boolean)
                  .join(" ")}
                style={{ flexBasis: `${seg.pct}%` }}
                title={`${seg.key}: ${seg.pct.toFixed(1)}%`}
              />
            ))
          : null}
      </div>
      <div className={styles["usage-legend"]}>
        {BREAKDOWN_ORDER.map((key) => (
          <div className={styles["usage-legend-item"]} key={key}>
            <span className={styles["usage-legend-label"]}>
              <span
                className={[
                  styles["usage-legend-swatch"],
                  BREAKDOWN_SEGMENT_CLASS[key],
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
              {BREAKDOWN_LABELS[key]}
            </span>
            <span className={styles["usage-legend-value"]}>
              {snapshot
                ? formatBytes(snapshot.breakdown[key])
                : snapshotLoading
                  ? "Calculating…"
                  : "…"}
            </span>
          </div>
        ))}
        <div className={styles["usage-legend-item"]}>
          <span className={styles["usage-legend-label"]}>
            <span
              className={[
                styles["usage-legend-swatch"],
                styles["usage-bar-segment-device"],
              ]
                .filter(Boolean)
                .join(" ")}
            />
            Other apps
          </span>
          <span className={styles["usage-legend-value"]}>
            {snapshot ? formatBytes(snapshot.deviceUsedByOthersBytes) : "…"}
          </span>
        </div>
      </div>
      {snapshotError ? (
        <p className={styles["usage-error"]}>{snapshotError}</p>
      ) : null}
      <div className={styles["usage-refresh-row"]}>
        <Button
          size="sm"
          variant="ghost"
          disabled={snapshotLoading}
          onClick={() => void fetchSnapshot()}
          className={styles["usage-refresh-button"]}
        >
          {snapshotLoading ? "Calculating…" : "Refresh Usage"}
        </Button>
      </div>
    </>
  );
}

interface IntegrityReport {
  orphans: string[];
  missing: string[];
  errors: Record<string, string>;
  totalIndexed: number;
  totalOnDisk: number;
}

export function VerifyRow() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<IntegrityReport | null>(null);

  async function verify() {
    setBusy(true);
    try {
      const res = (await window.pond.query("library.verifyIntegrity", {})) as
        | (IntegrityReport & { ok: true })
        | { ok: false; reason: string };
      if (!res.ok) {
        toast.add({
          title: "Verification failed",
          description: res.reason,
          type: "error",
        });
        return;
      }
      setReport({
        orphans: res.orphans,
        missing: res.missing,
        errors: res.errors,
        totalIndexed: res.totalIndexed,
        totalOnDisk: res.totalOnDisk,
      });
      const drift = res.orphans.length + res.missing.length;
      toast.add({
        title: drift === 0 ? "Library is clean" : "Drift detected",
        description:
          drift === 0
            ? `${res.totalIndexed}\u00A0items match on disk and in the index.`
            : `${res.orphans.length} on disk only · ${res.missing.length} indexed only.`,
        type: drift === 0 ? "success" : "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Verify Integrity</Settings.ItemTitle>
        <Settings.ItemDescription>
          {report
            ? `Last run: ${report.totalIndexed} indexed, ${report.totalOnDisk} on disk · ${report.orphans.length} orphan, ${report.missing.length} missing`
            : "Compare on-disk library items against the SQLite index."}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button size="sm" disabled={busy} onClick={() => void verify()}>
          {busy ? "Checking…" : "Run Check"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}
