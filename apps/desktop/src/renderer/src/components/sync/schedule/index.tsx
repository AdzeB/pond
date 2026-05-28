import { Input, Select, Switch } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings } from "@/components/settings";
import {
  applyPreset,
  DEFAULT_GLOBAL_SYNC_PREFS,
  formatRepeatTrigger,
  formatScheduleFooter,
  frequencyHasAnchor,
  type GlobalSyncPrefs,
  presetFromPrefs,
  REPEAT_PRESETS,
  type RepeatPreset,
  type ScheduleStatus,
} from "@/lib/sync-helpers";
import { usePrefs } from "@/pool/prefs";
import { RepeatCustomDialog } from "./repeat-custom-dialog";
import styles from "./styles.module.css";

export function Schedule() {
  const [syncPrefs, patchSync, syncReady] = usePrefs("sync");
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  const global = syncReady ? syncPrefs.global : DEFAULT_GLOBAL_SYNC_PREFS;
  const scheduleKey = useMemo(
    () =>
      `${global.enabled}|${global.frequency}|${global.anchorTime}|${(
        global.weekdays ?? []
      ).join(",")}|${global.quietHours?.start ?? ""}-${global.quietHours?.end ?? ""}`,
    [global],
  );
  const schedule = useScheduleStatus(scheduleKey);

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

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Schedule</h2>
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
      <p className={styles.footer}>
        {formatScheduleFooter(schedule, global.enabled)}
      </p>

      <RepeatCustomDialog
        open={customDialogOpen}
        initial={global}
        onClose={() => setCustomDialogOpen(false)}
        onSubmit={(next) => {
          patchGlobal(next);
          setCustomDialogOpen(false);
        }}
      />
    </section>
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
    return window.pond.onSyncSchedule((u) => {
      qc.setQueryData<ScheduleStatus>(["sync", "schedule", refreshKey], {
        lastFireAt: u.lastFireAt,
        nextDueAt: u.nextDueAt,
      });
    });
  }, [qc, refreshKey]);
  return data ?? { lastFireAt: null, nextDueAt: null };
}
