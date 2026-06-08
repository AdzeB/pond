import { Input, Select, Settings, Switch } from "@pond/ui";
import { useCallback, useState } from "react";
import { RepeatCustomDialog } from "@/components/dialogs/repeat-custom";
import {
  applyPreset,
  DEFAULT_GLOBAL_SYNC_PREFS,
  DEFAULT_QUIET_HOURS,
  formatRepeatTrigger,
  frequencyHasAnchor,
  type GlobalSyncPrefs,
  presetFromPrefs,
  REPEAT_PRESETS,
  type RepeatPreset,
} from "@/lib/utils/sync-helpers";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

export function ScheduleSection() {
  const [syncPrefs, patchSync, syncReady] = usePrefs("sync");
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  const global = syncReady ? syncPrefs.global : DEFAULT_GLOBAL_SYNC_PREFS;

  const patchGlobal = useCallback(
    (delta: Partial<GlobalSyncPrefs>) => {
      if (!syncReady) return;
      patchSync({ global: { ...syncPrefs.global, ...delta } });
    },
    [patchSync, syncReady, syncPrefs.global],
  );

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

  const quietHoursOn = global.quietHours !== null;
  const quietHours = global.quietHours ?? DEFAULT_QUIET_HOURS;

  return (
    <Settings.Page>
      <Settings.Section>
        <Settings.SectionTitle>Schedule</Settings.SectionTitle>
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
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Conditions</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Quiet hours</Settings.ItemTitle>
              <Settings.ItemDescription>
                Skip syncing during these hours.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                disabled={controlsDisabled}
                checked={quietHoursOn}
                onCheckedChange={(v) =>
                  patchGlobal({ quietHours: v ? DEFAULT_QUIET_HOURS : null })
                }
              />
            </Settings.ItemControl>
          </Settings.Item>

          {quietHoursOn ? (
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Quiet window</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Local start and end of the no-sync window.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <div className={styles["quiet-hours-row"]}>
                  <Input.Field
                    type="time"
                    data-size="sm"
                    aria-label="Quiet hours start"
                    className={styles["inline-time"]}
                    disabled={controlsDisabled}
                    value={quietHours.start}
                    onChange={(e) =>
                      patchGlobal({
                        quietHours: {
                          ...quietHours,
                          start: e.currentTarget.value,
                        },
                      })
                    }
                  />
                  <span className={styles["quiet-hours-sep"]}>to</span>
                  <Input.Field
                    type="time"
                    data-size="sm"
                    aria-label="Quiet hours end"
                    className={styles["inline-time"]}
                    disabled={controlsDisabled}
                    value={quietHours.end}
                    onChange={(e) =>
                      patchGlobal({
                        quietHours: {
                          ...quietHours,
                          end: e.currentTarget.value,
                        },
                      })
                    }
                  />
                </div>
              </Settings.ItemControl>
            </Settings.Item>
          ) : null}

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Only on Wi-Fi</Settings.ItemTitle>
              <Settings.ItemDescription>
                Don&apos;t sync over metered or cellular connections.
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

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Only on power</Settings.ItemTitle>
              <Settings.ItemDescription>
                Pause background sync while running on battery.
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
