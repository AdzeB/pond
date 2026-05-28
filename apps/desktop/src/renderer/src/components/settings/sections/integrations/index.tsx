import {
  Button,
  Dialog,
  Field,
  Input,
  Select,
  Switch,
  useToast,
} from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronsUpDown } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Settings } from "@/components/settings";
import { patchSearch } from "@/lib/navigate-path";
import {
  ALL_DAYS,
  applyPreset,
  DEFAULT_GLOBAL_SYNC_PREFS,
  formatRepeatTrigger,
  formatScheduleFooter,
  frequencyHasAnchor,
  FREQUENCY_OPTIONS,
  type GlobalSyncPrefs,
  presetFromPrefs,
  REPEAT_PRESETS,
  type RepeatPreset,
  type ScheduleStatus,
  type SyncFrequency,
  WEEKDAYS,
} from "@/lib/sync-helpers";
import { usePrefs } from "@/pool/prefs";
import { ALL_SOURCES, type AnySource, SOURCE_DESCRIPTIONS } from "../_types";
import styles from "./styles.module.css";

function emptyConnectedRecord(): Record<AnySource, boolean> {
  return Object.fromEntries(ALL_SOURCES.map((s) => [s.id, false])) as Record<
    AnySource,
    boolean
  >;
}

export function IntegrationsSection() {
  const toast = useToast();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const [syncPrefs, patchSync, syncReady] = usePrefs("sync");
  const [pendingSource, setPendingSource] = useState<AnySource | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  const qc = useQueryClient();
  const { data: connected = emptyConnectedRecord(), isSuccess: statusReady } =
    useQuery<Record<AnySource, boolean>>({
      queryKey: ["sources", "status"],
      queryFn: async () => {
        const entries = await Promise.all(
          ALL_SOURCES.map(async ({ id }) => {
            const r = await window.pond.sourceStatus(id).catch(() => null);
            return [id, r?.ok ? r.connected : false] as const;
          }),
        );
        const next = emptyConnectedRecord();
        for (const [id, isConnected] of entries) {
          next[id] = isConnected;
        }
        return next;
      },
    });

  useEffect(() => {
    return window.pond.onSourceStatus((update) => {
      qc.setQueryData<Record<AnySource, boolean> | undefined>(
        ["sources", "status"],
        (prev) => ({
          ...(prev ?? emptyConnectedRecord()),
          [update.source as AnySource]: update.connected,
        }),
      );
      if (update.connected) {
        toast.add({
          title: `Connected ${update.source}`,
          description: "Pond received your session from the browser extension.",
          type: "success",
        });
      }
    });
  }, [qc, toast]);

  const connectSource = useCallback(
    async (source: AnySource) => {
      setPendingSource(source);
      try {
        const res = await window.pond.connectSource(source);
        if (res.ok) {
          toast.add({
            title: `Sign in to ${source} in your browser`,
            description:
              "After signing in, open the Pond extension popup and click " +
              `"Push session". Pond will pick the cookies up automatically.`,
            type: "info",
          });
        } else {
          toast.add({
            title: `Couldn't open ${source} in your browser`,
            type: "error",
          });
        }
      } catch {
        toast.add({
          title: `Couldn't open ${source} in your browser`,
          type: "error",
        });
      } finally {
        setPendingSource(null);
      }
    },
    [toast],
  );

  const autoConnectFired = useRef(false);
  useEffect(() => {
    const wanted = search.connect as string | undefined;
    if (!wanted || autoConnectFired.current) return;
    const match = ALL_SOURCES.find((s) => s.id === wanted);
    if (!match) return;
    autoConnectFired.current = true;
    void connectSource(match.id);
    patchSearch(
      navigate,
      (prev) => {
        const out = { ...prev };
        delete out.connect;
        return out;
      },
      { replace: true },
    );
  }, [search.connect, navigate, connectSource]);

  const global = syncReady ? syncPrefs.global : DEFAULT_GLOBAL_SYNC_PREFS;
  const scheduleKey = useMemo(
    () =>
      `${global.enabled}|${global.frequency}|${global.anchorTime}|${(
        global.weekdays ?? []
      ).join(
        ",",
      )}|${global.quietHours?.start ?? ""}-${global.quietHours?.end ?? ""}`,
    [global],
  );
  const schedule = useScheduleStatus(scheduleKey);
  const runningSources = useRunningSources();
  const anyRunning = runningSources.size > 0;

  const patchGlobal = useCallback(
    (delta: Partial<GlobalSyncPrefs>) => {
      if (!syncReady) return;
      patchSync({ global: { ...syncPrefs.global, ...delta } });
    },
    [patchSync, syncReady, syncPrefs.global],
  );

  function toggleQuietHours(on: boolean) {
    patchGlobal({ quietHours: on ? { start: "22:00", end: "07:00" } : null });
  }

  async function syncNow() {
    try {
      await window.pond.syncRunAll();
      toast.add({
        title: "Sync started",
        description: "Pond is checking every connected source.",
        type: "info",
      });
    } catch {
      toast.add({ title: "Couldn't start sync", type: "error" });
    }
  }

  function handlePresetChange(value: RepeatPreset) {
    if (value === "custom") {
      setCustomDialogOpen(true);
      return;
    }
    patchGlobal(applyPreset(value));
  }

  const activePreset = presetFromPrefs(global);
  const showAnchor = frequencyHasAnchor(global.frequency);
  const controlsDisabled = !syncReady || !global.enabled;

  async function disconnect(source: AnySource) {
    setPendingSource(source);
    try {
      await window.pond.disconnectSource(source);
      await qc.invalidateQueries({ queryKey: ["sources", "status"] });
    } finally {
      setPendingSource(null);
    }
  }

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Connected Apps</Settings.Title>
        <Settings.Description>
          Connect your apps to enable seamless background syncing.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <div className={styles["section-header"]}>
          <Settings.SectionTitle>Configuration</Settings.SectionTitle>
          <Button
            size="sm"
            disabled={!syncReady || anyRunning}
            onClick={() => void syncNow()}
          >
            {anyRunning ? "Syncing\u2026" : "Sync now"}
          </Button>
        </div>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Background Sync</Settings.ItemTitle>
              <Settings.ItemDescription>
                Automatically check for new saves on the schedule below.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                disabled={!syncReady}
                checked={global.enabled}
                onCheckedChange={(v) => patchGlobal({ enabled: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Frequency</Settings.ItemTitle>
              <Settings.ItemDescription>
                How often Pond checks for new saves.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root<RepeatPreset>
                disabled={controlsDisabled}
                value={activePreset}
                onValueChange={(v) =>
                  handlePresetChange((v ?? "every_day") as RepeatPreset)
                }
              >
                <Select.Trigger>
                  <Select.Value>{formatRepeatTrigger(global)}</Select.Value>
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      {REPEAT_PRESETS.map((o) => (
                        <Select.Item key={o.value} value={o.value}>
                          <span className={styles["preset-label"]}>
                            {o.label}
                          </span>
                          {o.secondary ? (
                            <span className={styles["preset-secondary"]}>
                              {o.secondary}
                            </span>
                          ) : null}
                        </Select.Item>
                      ))}
                      <div className={styles["preset-separator"]} aria-hidden />
                      <Select.Item value="custom">
                        <span className={styles["preset-label"]}>
                          {"Custom\u2026"}
                        </span>
                      </Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>

          {showAnchor ? (
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Time</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Local time of day when the sync runs.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Input.Field
                  type="time"
                  data-size="sm"
                  className={styles["inline-time"]}
                  disabled={controlsDisabled}
                  value={global.anchorTime}
                  onChange={(e) =>
                    patchGlobal({ anchorTime: e.currentTarget.value })
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
          ) : null}

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Quiet hours</Settings.ItemTitle>
              <Settings.ItemDescription>
                Don't sync between these hours, even when due.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <div className={styles["quiet-hours-row"]}>
                <Switch.Root
                  disabled={controlsDisabled}
                  checked={Boolean(global.quietHours)}
                  onCheckedChange={(v) => toggleQuietHours(v)}
                />
                {global.quietHours ? (
                  <>
                    <Input.Field
                      type="time"
                      data-size="sm"
                      className={styles["inline-time"]}
                      disabled={controlsDisabled}
                      value={global.quietHours.start}
                      onChange={(e) =>
                        patchGlobal({
                          quietHours: {
                            start: e.currentTarget.value,
                            end:
                              global.quietHours?.end ??
                              DEFAULT_GLOBAL_SYNC_PREFS.anchorTime,
                          },
                        })
                      }
                    />
                    <span className={styles["quiet-hours-sep"]}>to</span>
                    <Input.Field
                      type="time"
                      data-size="sm"
                      className={styles["inline-time"]}
                      disabled={controlsDisabled}
                      value={global.quietHours.end}
                      onChange={(e) =>
                        patchGlobal({
                          quietHours: {
                            start:
                              global.quietHours?.start ??
                              DEFAULT_GLOBAL_SYNC_PREFS.anchorTime,
                            end: e.currentTarget.value,
                          },
                        })
                      }
                    />
                  </>
                ) : null}
              </div>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Only when plugged in</Settings.ItemTitle>
              <Settings.ItemDescription>
                Skip scheduled syncs while running on battery.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                disabled={controlsDisabled}
                checked={global.onlyOnAcPower}
                onCheckedChange={(v) => patchGlobal({ onlyOnAcPower: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Only on Wi-Fi</Settings.ItemTitle>
              <Settings.ItemDescription>
                Skip scheduled syncs on cellular or tethered networks.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                disabled={controlsDisabled}
                checked={global.onlyOnWifi}
                onCheckedChange={(v) => patchGlobal({ onlyOnWifi: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
        <p className={styles["status-footer"]}>
          {formatScheduleFooter(schedule, global.enabled)}
        </p>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Apps</Settings.SectionTitle>
        <Settings.List>
          {ALL_SOURCES.map((entry) => {
            const isConnected = connected[entry.id];
            const isPending = pendingSource === entry.id;
            return (
              <Fragment key={entry.id}>
                <Settings.Item className={styles["app-row"]}>
                  <Settings.ItemDetails>
                    <Settings.ItemTitle>{entry.label}</Settings.ItemTitle>
                    <Settings.ItemDescription>
                      {SOURCE_DESCRIPTIONS[entry.id]}
                    </Settings.ItemDescription>
                  </Settings.ItemDetails>
                  <Settings.ItemControl>
                    {!statusReady ? (
                      <span
                        className={styles["app-row-skeleton-button"]}
                        aria-hidden
                      />
                    ) : isConnected ? (
                      <ConnectedButton
                        disabled={isPending}
                        onClick={() => void disconnect(entry.id)}
                      />
                    ) : (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => void connectSource(entry.id)}
                      >
                        {isPending ? "Opening\u2026" : "Sign in"}
                      </Button>
                    )}
                  </Settings.ItemControl>
                </Settings.Item>
              </Fragment>
            );
          })}
          {!statusReady ? (
            <Settings.Item className={styles["app-row-skeleton"]} aria-hidden>
              <span className={styles["app-row-skeleton-badge"]} />
              <Settings.ItemDetails>
                <span className={styles["app-row-skeleton-line"]} />
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <span className={styles["app-row-skeleton-button"]} />
              </Settings.ItemControl>
            </Settings.Item>
          ) : null}
        </Settings.List>
      </Settings.Section>

      <RepeatCustomDialog
        open={customDialogOpen}
        initial={global}
        onClose={() => setCustomDialogOpen(false)}
        onSubmit={(next) => {
          patchGlobal(next);
          setCustomDialogOpen(false);
        }}
      />
    </Settings.Page>
  );
}

function useScheduleStatus(refreshKey: string): ScheduleStatus {
  const qc = useQueryClient();
  const { data } = useQuery<ScheduleStatus>({
    queryKey: ["sync", "schedule", refreshKey],
    queryFn: async () => {
      const res = await window.pond.syncSchedulePeek();
      if (!res.ok) return { lastFireAt: null, nextDueAt: null };
      return { lastFireAt: res.lastFireAt, nextDueAt: res.nextDueAt };
    },
  });

  useEffect(() => {
    const off = window.pond.onSyncSchedule((u) => {
      qc.setQueryData<ScheduleStatus>(["sync", "schedule", refreshKey], {
        lastFireAt: u.lastFireAt,
        nextDueAt: u.nextDueAt,
      });
    });
    return off;
  }, [qc, refreshKey]);

  return data ?? { lastFireAt: null, nextDueAt: null };
}

function useRunningSources(): Set<string> {
  const [running, setRunning] = useState<Set<string>>(new Set());
  useEffect(() => {
    return window.pond.onSyncStatus((u) => {
      setRunning((prev) => {
        const next = new Set(prev);
        if (u.state === "running") next.add(u.source);
        else next.delete(u.source);
        return next;
      });
    });
  }, []);
  return running;
}

function ConnectedButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={styles["connected-button"]}
      data-state={hover ? "hover" : "idle"}
    >
      {disabled ? "\u2026" : hover ? "Disconnect" : "Connected"}
    </Button>
  );
}

function RepeatCustomDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: GlobalSyncPrefs;
  onClose: () => void;
  onSubmit: (next: Partial<GlobalSyncPrefs>) => void;
}) {
  const [draftFrequency, setDraftFrequency] = useState<SyncFrequency>(
    initial.frequency,
  );
  const [draftWeekdays, setDraftWeekdays] = useState<number[]>(
    initial.weekdays ?? ALL_DAYS,
  );

  useEffect(() => {
    if (open) {
      setDraftFrequency(initial.frequency);
      setDraftWeekdays(initial.weekdays ?? ALL_DAYS);
    }
  }, [open, initial.frequency, initial.weekdays]);

  function toggleDraftWeekday(index: number) {
    setDraftWeekdays((prev) => {
      const set = new Set(prev);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      const next = Array.from(set).sort((a, b) => a - b);
      return next.length === 0 ? prev : next;
    });
  }

  const showDays = draftFrequency === "weekly";
  const canSubmit = !showDays || draftWeekdays.length > 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Title>Custom schedule</Dialog.Title>
          <Dialog.Description>
            Pick a cadence and the days Pond should run on.
          </Dialog.Description>
          <form
            className={styles["handle-form"]}
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              onSubmit({
                frequency: draftFrequency,
                weekdays:
                  draftFrequency === "weekly" ? draftWeekdays : ALL_DAYS,
              });
            }}
          >
            <Field.Root>
              <Field.Label>Frequency</Field.Label>
              <Select.Root<SyncFrequency>
                value={draftFrequency}
                onValueChange={(v) =>
                  setDraftFrequency((v ?? "daily") as SyncFrequency)
                }
              >
                <Select.Trigger>
                  <Select.Value>
                    {FREQUENCY_OPTIONS.find((o) => o.value === draftFrequency)
                      ?.label ?? "Daily"}
                  </Select.Value>
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      {FREQUENCY_OPTIONS.map((o) => (
                        <Select.Item key={o.value} value={o.value}>
                          {o.label}
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Field.Root>

            {showDays ? (
              <Field.Root>
                <Field.Label>Days</Field.Label>
                <div className={styles["weekday-chips"]}>
                  {WEEKDAYS.map((d) => {
                    const on = draftWeekdays.includes(d.index);
                    return (
                      <button
                        key={d.index}
                        type="button"
                        aria-label={d.full}
                        aria-pressed={on}
                        className={styles["weekday-chip"]}
                        data-on={on ? "true" : "false"}
                        onClick={() => toggleDraftWeekday(d.index)}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
                <Field.Description>
                  Sync runs at the time set on the main page, on the days you
                  pick here.
                </Field.Description>
              </Field.Root>
            ) : null}

            <div className={styles["handle-actions"]}>
              <Dialog.Close render={<Button size="sm" variant="ghost" />}>
                Cancel
              </Dialog.Close>
              <Button size="sm" type="submit" disabled={!canSubmit}>
                Save
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
