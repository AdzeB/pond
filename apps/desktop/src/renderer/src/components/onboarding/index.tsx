import { Button, Collapsible, Field, Input, useToast } from "@pond/ui";
import { useCallback, useEffect, useState } from "react";
import { NumberFieldStepper } from "@/components/_primitives/number-field-stepper";
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

type PickResult = { ok: true; path: string } | { ok: false; reason: string };

function Intro() {
  return (
    <p className={styles.prose}>
      Pond keeps everything you save on your own machine: no cloud, no accounts,
      no lock-in. Save a page from your browser and it lands in a pond you fully
      control. This setup takes about a minute.
    </p>
  );
}

interface LibraryLocationStepProps {
  chosenPath: string | null;
  onChoose: (path: string) => void;
}

// Onboarding only *picks* a target here; it never creates or switches
// mid-wizard. The pickers just return a path with no side effects, so
// choosing a spot can't relaunch the app and bounce the user back to step
// one. The wizard applies the choice on finish (`switchTo` creates the
// bundle at a fresh path, or adopts an existing one).
function LibraryLocationStep({
  chosenPath,
  onChoose,
}: LibraryLocationStepProps) {
  const toast = useToast();
  const [name, setName] = useState("My Pond");
  const [mode, setMode] = useState<"create" | "open" | null>(null);

  async function createNew() {
    const pick = (await window.pond.query("library.pickNewLocation", {
      name,
    })) as PickResult;
    if (pick.ok) {
      setMode("create");
      onChoose(pick.path);
    } else if (pick.reason !== "cancelled") {
      toast.add({
        title: "Couldn't open picker",
        description: pick.reason,
        type: "error",
      });
    }
  }

  async function openExisting() {
    const pick = (await window.pond.query(
      "library.pickExisting",
      {},
    )) as PickResult;
    if (pick.ok) {
      setMode("open");
      onChoose(pick.path);
    } else if (pick.reason !== "cancelled") {
      toast.add({
        title: "Couldn't open picker",
        description: pick.reason,
        type: "error",
      });
    }
  }

  return (
    <div className={styles.location}>
      <Field.Root>
        <Field.Label>Pond name</Field.Label>
        <Input.Field
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="My Pond"
        />
      </Field.Root>

      {chosenPath ? (
        <>
          <code className={styles["location-current"]}>{chosenPath}</code>
          <p className={styles["location-note"]}>
            {mode === "open"
              ? "Pond will open this when you finish setup."
              : "Pond will be created here when you finish setup."}
          </p>
        </>
      ) : (
        <p className={styles["location-note"]}>
          Name your pond, then choose where it lives. Pick a folder in iCloud
          Drive (or Dropbox, Google Drive) to sync your saves across machines.
        </p>
      )}

      <div className={styles["location-actions"]}>
        <Button
          size="sm"
          variant="primary"
          disabled={!name.trim()}
          onClick={() => void createNew()}
        >
          Create pond…
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void openExisting()}
        >
          Open an existing pond…
        </Button>
      </div>
    </div>
  );
}

function ExtensionStep() {
  return (
    <p className={styles.prose}>
      Install Pond from the Chrome or Firefox store. If you're a developer, load{" "}
      <code>apps/extension</code> as an unpacked extension.
    </p>
  );
}

function PairingStep() {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [pairing, setPairing] = useState<string | null>(null);
  const [port, setPort] = useState<number>(41610);

  useEffect(() => {
    void (async () => {
      const t = (await window.pond.query("settings.ingestToken")) as {
        token: string | null;
      };
      setToken(t.token ?? null);
      if (t.token) {
        const url = new URL("pond://pair");
        url.searchParams.set("port", String(port));
        url.searchParams.set("token", t.token);
        setPairing(url.toString());
      }
    })();
  }, [port]);

  async function copy(text: string, what: string) {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `Copied ${what}`, type: "success" });
  }

  return (
    <div className={styles.pairing}>
      <p className={styles.prose}>
        Click the Pond icon in your browser, then paste this pairing link:
      </p>
      <Field.Root>
        <Field.Label className={styles["sr-only"]}>Pairing link</Field.Label>
        <div className={styles.row}>
          <Input.Field
            data-variant="code"
            readOnly
            value={pairing ?? "generating…"}
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            disabled={!pairing}
            onClick={() => pairing && copy(pairing, "pairing link")}
          >
            Copy link
          </Button>
        </div>
      </Field.Root>

      <Collapsible.Root>
        <Collapsible.Trigger>Or copy token manually</Collapsible.Trigger>
        <Collapsible.Panel>
          <div className={styles["token-row"]}>
            <code>{token ?? "…"}</code>
            <Button
              size="sm"
              disabled={!token}
              onClick={() => token && copy(token, "token")}
            >
              Copy token
            </Button>
          </div>
          <p className={styles.hint}>
            Endpoint: <code>http://127.0.0.1:{port}/api/v2/item/add</code>
          </p>
          <Field.Root>
            <Field.Label>Port</Field.Label>
            <NumberFieldStepper
              value={port}
              onValueChange={(v) => setPort(v ?? 41610)}
              min={1024}
              max={65535}
            />
            <Field.Description>
              Change only if 41610 is taken on your machine.
            </Field.Description>
          </Field.Root>
        </Collapsible.Panel>
      </Collapsible.Root>
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

export const Onboarding = {
  Intro,
  LibraryLocationStep,
  ExtensionStep,
  PairingStep,
  SyncPanel,
};
