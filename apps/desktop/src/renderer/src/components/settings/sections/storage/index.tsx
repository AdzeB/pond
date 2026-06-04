import { IconChevronExpandYOutline18 as ChevronsUpDown } from "@pond/icons/outline/18";
import { Button, Input, Select, Switch, useToast } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings } from "@/components/settings";
import { formatBytes } from "@/lib/format";
import { usePrefs } from "@/pool/prefs";
import type { StorageGuardStatusWire } from "../../../../../../preload";
import styles from "./styles.module.css";

interface IntegrityReport {
  orphans: string[];
  missing: string[];
  errors: Record<string, string>;
  totalIndexed: number;
  totalOnDisk: number;
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

const ACTION_LABELS: Record<
  "warn" | "pauseSync" | "pauseVideo",
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

export function StorageSection() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<IntegrityReport | null>(null);

  const [snapshot, setSnapshot] = useState<StorageSnapshotWire | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [storagePrefs, patchStorage] = usePrefs("storage");

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

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  async function verify() {
    await withBusy("verify", async () => {
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
    });
  }

  function applyStoragePrefsPatch(patch: Partial<typeof storagePrefs>) {
    patchStorage(patch);
    void window.pond.query("storage.applyGuardPrefs", {}).catch(() => {
      // Watcher rearm errors get logged in main; UI stays responsive.
    });
  }

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
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Storage</Settings.Title>
        <Settings.Description>
          How much disk your library uses, your storage cap, and integrity
          checks.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Disk Usage</Settings.SectionTitle>
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
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Storage Limits</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Enforce a Storage Limit</Settings.ItemTitle>
              <Settings.ItemDescription>
                Apply an action when the library crosses your cap.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={storagePrefs.guardsEnabled}
                onCheckedChange={(v) =>
                  applyStoragePrefsPatch({ guardsEnabled: v })
                }
              />
            </Settings.ItemControl>
          </Settings.Item>

          {storagePrefs.guardsEnabled ? (
            <>
              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>No Hard Cap</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    Pond never blocks new saves. Only the warn threshold fires.
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Switch.Root
                    checked={storagePrefs.maxLibraryGb === null}
                    onCheckedChange={(v) =>
                      applyStoragePrefsPatch({
                        maxLibraryGb: v
                          ? null
                          : (storagePrefs.maxLibraryGb ?? 50),
                      })
                    }
                  />
                </Settings.ItemControl>
              </Settings.Item>

              {storagePrefs.maxLibraryGb !== null ? (
                <Settings.Item>
                  <Settings.ItemDetails>
                    <Settings.ItemTitle>Max Library Size</Settings.ItemTitle>
                    <Settings.ItemDescription>
                      The action fires once usage hits this many GB.
                    </Settings.ItemDescription>
                  </Settings.ItemDetails>
                  <Settings.ItemControl>
                    <Input.Field
                      data-size="sm"
                      type="number"
                      min={1}
                      max={1000}
                      value={String(storagePrefs.maxLibraryGb ?? 50)}
                      onChange={(e) =>
                        applyStoragePrefsPatch({
                          maxLibraryGb: clamp(
                            Number(e.target.value) || 50,
                            1,
                            1000,
                          ),
                        })
                      }
                      style={{ width: 96 }}
                    />
                    <span className={styles["usage-stat-label"]}>GB</span>
                  </Settings.ItemControl>
                </Settings.Item>
              ) : null}

              {storagePrefs.maxLibraryGb !== null ? (
                <Settings.Item>
                  <Settings.ItemDetails>
                    <Settings.ItemTitle>Warn At</Settings.ItemTitle>
                    <Settings.ItemDescription>
                      Warn once usage crosses this percentage of the cap.
                    </Settings.ItemDescription>
                  </Settings.ItemDetails>
                  <Settings.ItemControl>
                    <Input.Field
                      data-size="sm"
                      type="number"
                      min={50}
                      max={100}
                      value={String(storagePrefs.warnAtPercent)}
                      onChange={(e) =>
                        applyStoragePrefsPatch({
                          warnAtPercent: clamp(
                            Number(e.target.value) || 80,
                            50,
                            100,
                          ),
                        })
                      }
                      style={{ width: 96 }}
                    />
                    <span className={styles["usage-stat-label"]}>%</span>
                  </Settings.ItemControl>
                </Settings.Item>
              ) : null}

              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>Action When Exceeded</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    {ACTION_LABELS[storagePrefs.action].description}
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Select.Root
                    value={storagePrefs.action}
                    onValueChange={(v) =>
                      applyStoragePrefsPatch({
                        action: v as "warn" | "pauseSync" | "pauseVideo",
                      })
                    }
                  >
                    <Select.Trigger>
                      <Select.Value>
                        {ACTION_LABELS[storagePrefs.action].label}
                      </Select.Value>
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
              </Settings.Item>

              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>Watch Interval</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    {"How often Pond recomputes usage. 1 to 60\u00A0minutes."}
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Input.Field
                    data-size="sm"
                    type="number"
                    min={1}
                    max={60}
                    value={String(storagePrefs.watchIntervalMinutes)}
                    onChange={(e) =>
                      applyStoragePrefsPatch({
                        watchIntervalMinutes: clamp(
                          Number(e.target.value) || 5,
                          1,
                          60,
                        ),
                      })
                    }
                    style={{ width: 96 }}
                  />
                  <span className={styles["usage-stat-label"]}>min</span>
                </Settings.ItemControl>
              </Settings.Item>
            </>
          ) : null}
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Integrity</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Verify Integrity</Settings.ItemTitle>
              <Settings.ItemDescription>
                {report
                  ? `Last run: ${report.totalIndexed} indexed, ${report.totalOnDisk} on disk · ${report.orphans.length} orphan, ${report.missing.length} missing`
                  : "Compare on-disk library items against the SQLite index."}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                disabled={busy === "verify"}
                onClick={() => void verify()}
              >
                {busy === "verify" ? "Checking…" : "Run Check"}
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
