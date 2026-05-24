import { AlertDialog, Button, useToast } from "@pond/ui";
import { useCallback, useEffect, useState } from "react";
import type { RelocatePreviewWire } from "../../../../preload";
import styles from "./styles.module.css";

type SyncSource = "twitter";

interface SyncEntry {
  state: "idle" | "running" | "done" | "error" | "auth_required";
  message?: string;
  progress?: { current: number; total: number };
  lastSyncedAt: string | null;
}

const SYNC_SOURCES: ReadonlyArray<{ id: SyncSource; label: string }> = [
  { id: "twitter", label: "Twitter / X bookmarks" },
];

function LibraryLocationStep() {
  const toast = useToast();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<RelocatePreviewWire | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const snap = (await window.pond
        .query("storage.snapshot", {})
        .catch(() => null)) as { libraryRoot?: string } | null;
      if (snap?.libraryRoot) setCurrentPath(snap.libraryRoot);
    })();
  }, []);

  async function chooseLocation() {
    setBusy(true);
    try {
      const pick = (await window.pond.query("library.pickFolder", {})) as
        | { ok: true; path: string }
        | { ok: false; reason: string };
      if (!pick.ok) {
        if (pick.reason !== "cancelled") {
          toast.add({
            title: "Couldn't open picker",
            description: pick.reason,
            type: "error",
          });
        }
        return;
      }
      const res = (await window.pond.query("library.previewRelocate", {
        path: pick.path,
      })) as
        | { ok: true; preview: RelocatePreviewWire }
        | { ok: false; reason: string };
      if (!res.ok) {
        toast.add({
          title: "Couldn't inspect folder",
          description: res.reason,
          type: "error",
        });
        return;
      }
      if (res.preview.samePath) {
        toast.add({
          title: "Already there",
          description: "That's the folder your library already uses.",
          type: "info",
        });
        return;
      }
      if (!res.preview.safety.ok) {
        toast.add({
          title: "Can't use that folder",
          description:
            res.preview.safety.reason === "inside_user_data"
              ? "That folder lives inside Pond's own data directory."
              : "Pond can't write to that folder.",
          type: "error",
        });
        return;
      }
      setPreview(res.preview);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    const res = (await window.pond.query("library.relocate", {
      path: preview.candidatePath,
      mode: preview.suggestedMode,
      restart: true,
    })) as { ok: true; path: string } | { ok: false; reason: string };
    if (!res.ok) {
      setBusy(false);
      toast.add({
        title: "Couldn't change location",
        description: res.reason,
        type: "error",
      });
      return;
    }
    toast.add({
      title: "Switching libraries",
      description: "Pond is restarting…",
      type: "success",
    });
  }

  const mode = preview?.suggestedMode ?? "copy";

  return (
    <div className={styles["location-row"]}>
      <code className={styles["location-current"]}>
        {currentPath ?? "~/Pond/My Pond.library/"}
      </code>
      <Button size="sm" disabled={busy} onClick={() => void chooseLocation()}>
        Change…
      </Button>

      <AlertDialog.Root
        open={preview !== null}
        onOpenChange={(o) => {
          if (!o && !busy) setPreview(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>
              {mode === "adopt"
                ? "Use this Pond library?"
                : "Move your library here?"}
            </AlertDialog.Title>
            <AlertDialog.Description>
              {preview ? (
                <div>
                  <p className={styles["dialog-intro"]}>
                    {mode === "adopt"
                      ? `That folder already looks like a Pond library (${preview.existing.itemCount} item${preview.existing.itemCount === 1 ? "" : "s"}). Pond will use it directly.`
                      : "Pond will move your library to the new location and restart. Your current folder stays put so you can confirm everything before removing it yourself."}
                  </p>
                  <p className={styles["dialog-paths"]}>
                    <strong>From</strong> <code>{preview.currentPath}</code>
                    <br />
                    <strong>To</strong> <code>{preview.candidatePath}</code>
                  </p>
                  {preview.cloudKind ? (
                    <p className={styles["cloud-warning"]}>
                      This folder is inside {preview.cloudKind}. Files will sync
                      across devices; Pond's index stays per-Mac.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </AlertDialog.Description>
            <div className={styles["dialog-actions"]}>
              <AlertDialog.Close
                render={
                  <Button variant="ghost" disabled={busy}>
                    Cancel
                  </Button>
                }
              />
              <Button
                variant="primary"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  void confirm();
                }}
              >
                {busy
                  ? "Relaunching…"
                  : mode === "adopt"
                    ? "Switch and Relaunch"
                    : "Move and Relaunch"}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

function SyncPanel() {
  const toast = useToast();
  const [connections, setConnections] = useState<
    Partial<Record<SyncSource, boolean>>
  >({});
  const [entries, setEntries] = useState<
    Partial<Record<SyncSource, SyncEntry>>
  >({});

  const refreshStatus = useCallback(async (src: SyncSource) => {
    const s = await window.pond.syncStatus(src).catch(() => null);
    if (!s?.ok) return;
    setEntries((prev) => ({
      ...prev,
      [src]: {
        state: s.running ? "running" : "idle",
        lastSyncedAt: s.lastSyncedAt ?? null,
      },
    }));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      for (const { id } of SYNC_SOURCES) {
        const r = await window.pond.sourceStatus(id).catch(() => null);
        if (!active) return;
        setConnections((prev) => ({
          ...prev,
          [id]: r?.ok ? r.connected : false,
        }));
        await refreshStatus(id);
      }
    })();
    const off = window.pond.onSyncStatus((upd) => {
      const src = SYNC_SOURCES.find((s) => s.id === upd.source);
      if (!src) return;
      setEntries((prev) => ({
        ...prev,
        [src.id]: {
          state: upd.state,
          message: upd.message,
          progress: upd.progress,
          lastSyncedAt: upd.lastSyncedAt ?? prev[src.id]?.lastSyncedAt ?? null,
        },
      }));
    });
    return () => {
      active = false;
      off();
    };
  }, [refreshStatus]);

  async function startSync(src: SyncSource) {
    const r = await window.pond.syncRunNow(src);
    if (!r.ok) {
      toast.add({
        title:
          r.reason === "already_running"
            ? "Sync already running"
            : "Couldn't start sync",
        type: r.reason === "already_running" ? "info" : "error",
      });
    }
  }

  async function connect(src: SyncSource) {
    await window.pond.connectSource(src);
    const r = await window.pond.sourceStatus(src).catch(() => null);
    setConnections((prev) => ({
      ...prev,
      [src]: r?.ok ? r.connected : false,
    }));
  }

  return (
    <div>
      {SYNC_SOURCES.map(({ id, label }) => {
        const connected = connections[id];
        const entry = entries[id];
        const isRunning = entry?.state === "running";
        const pct = entry?.progress
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  (entry.progress.current / Math.max(entry.progress.total, 1)) *
                    100,
                ),
              ),
            )
          : null;
        return (
          <div key={id}>
            <div className={styles["backfill-row"]}>
              <div className={styles["backfill-label"]}>
                <span>{label}</span>
                <span className={styles["backfill-status"]}>
                  {connected === false
                    ? "Not connected"
                    : entry?.state === "running"
                      ? (entry.message ?? "Syncing…")
                      : entry?.state === "error"
                        ? `Failed: ${entry.message ?? "unknown"}`
                        : entry?.state === "auth_required"
                          ? "Sign in required"
                          : entry?.lastSyncedAt
                            ? "Up to date"
                            : "Ready"}
                </span>
              </div>
              {connected === false ? (
                <Button size="sm" onClick={() => void connect(id)}>
                  Connect
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={isRunning}
                  onClick={() => void startSync(id)}
                >
                  {isRunning ? "Syncing…" : "Sync all"}
                </Button>
              )}
            </div>
            {pct !== null ? (
              <div className={styles["backfill-bar"]}>
                <span
                  className={styles["backfill-bar-fill"]}
                  style={{ transform: `scaleX(${pct / 100})` }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export const Onboarding = { LibraryLocationStep, SyncPanel };
