import { Input, Select, Settings, Switch } from "@pond/ui";
import React, { useCallback } from "react";
import { type EnumOption, EnumSelect } from "@/components/enum-select";
import {
  ALL_DAYS,
  DEFAULT_GLOBAL_SYNC_PREFS,
  frequencyHasAnchor,
  type GlobalSyncPrefs,
  type SyncFrequency,
  WEEKDAYS,
} from "@/lib/settings-sync-helpers";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

const FREQUENCY_NOUNS: readonly EnumOption<SyncFrequency>[] = [
  { value: "hourly", label: "hour" },
  { value: "daily", label: "day" },
  { value: "weekly", label: "week" },
];

function formatWeekdays(indices: number[]): string {
  return [...indices]
    .sort((a, b) => a - b)
    .map((i) => WEEKDAYS[i]?.full.slice(0, 3).toUpperCase())
    .filter(Boolean)
    .join(", ");
}

export function ScheduleSection() {
  const [syncPrefs, patchSync, syncReady] = usePrefs("sync");

  const global = syncReady ? syncPrefs.global : DEFAULT_GLOBAL_SYNC_PREFS;

  const patchGlobal = useCallback(
    (delta: Partial<GlobalSyncPrefs>) => {
      if (!syncReady) return;
      patchSync({ global: { ...syncPrefs.global, ...delta } });
    },
    [patchSync, syncReady, syncPrefs.global],
  );

  function setFrequency(frequency: SyncFrequency) {
    if (frequency === "weekly") patchGlobal({ frequency });
    else patchGlobal({ frequency, weekdays: ALL_DAYS });
  }

  const showAnchor = frequencyHasAnchor(global.frequency);
  const showDays = global.frequency === "weekly";
  const controlsDisabled = !syncReady || !global.enabled;

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
            <div
              className={styles.sentence}
              data-disabled={controlsDisabled ? "true" : undefined}
            >
              <span className={styles["sentence-word"]}>Every</span>

              <EnumSelect<SyncFrequency>
                value={global.frequency}
                onValueChange={setFrequency}
                options={FREQUENCY_NOUNS}
                disabled={controlsDisabled}
                align="start"
                aria-label="Frequency"
              />

              {showDays ? (
                <React.Fragment>
                  <span className={styles["sentence-word"]}>on</span>
                  <Select.Root<number, true>
                    multiple
                    disabled={controlsDisabled}
                    value={global.weekdays}
                    onValueChange={(next) => {
                      if (!next || next.length === 0) return;
                      patchGlobal({
                        weekdays: [...next].sort((a, b) => a - b),
                      });
                    }}
                  >
                    <Select.Trigger aria-label="Days of the week">
                      <Select.Value>
                        {(value: number[]) => formatWeekdays(value)}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={6} align="start">
                        <Select.Popup>
                          {WEEKDAYS.map((d) => (
                            <Select.Item key={d.index} value={d.index}>
                              <Select.ItemText>{d.full}</Select.ItemText>
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                </React.Fragment>
              ) : null}

              {showAnchor ? (
                <React.Fragment>
                  <span className={styles["sentence-word"]}>at</span>
                  <Input.Field
                    type="time"
                    data-size="sm"
                    aria-label="Time"
                    className={styles["inline-time"]}
                    disabled={controlsDisabled}
                    value={global.anchorTime}
                    onChange={(e) =>
                      patchGlobal({ anchorTime: e.currentTarget.value })
                    }
                  />
                </React.Fragment>
              ) : null}
            </div>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Conditions</Settings.SectionTitle>
        <Settings.List>
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
    </Settings.Page>
  );
}
