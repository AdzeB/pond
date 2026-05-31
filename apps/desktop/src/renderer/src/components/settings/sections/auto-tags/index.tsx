import type { AutoTagRule, Source } from "@pond/schema/db";
import { SOURCES } from "@pond/schema/db";
import { Button, Input, Select, Switch } from "@pond/ui";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { ulid } from "ulid";
import { Settings } from "@/components/settings";
import { getSourceLabel } from "@/lib/source-labels";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

export function AutoTagsSection() {
  const [autoTag, patch] = usePrefs("autoTag");
  const rules = autoTag.rules ?? [];

  const update = (next: AutoTagRule[]) => patch({ rules: next });

  const addRule = () =>
    update([
      ...rules,
      {
        id: ulid(),
        enabled: true,
        source: null,
        urlContains: null,
        authorContains: null,
        titleContains: null,
        addTags: [],
      },
    ]);

  const editRule = (id: string, delta: Partial<AutoTagRule>) =>
    update(rules.map((r) => (r.id === id ? { ...r, ...delta } : r)));

  const removeRule = (id: string) => update(rules.filter((r) => r.id !== id));

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Auto Tags</Settings.Title>
        <Settings.Description>
          Apply tags automatically when a save matches one of your rules.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Rules</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Enable Auto Tagging</Settings.ItemTitle>
              <Settings.ItemDescription>
                Run these rules on every new save. Turn off to pause without
                losing your rules.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={autoTag.enabled ?? false}
                onCheckedChange={(v) => patch({ enabled: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>

        <div className={styles.rules}>
          {rules.length === 0 ? (
            <p className={styles.empty}>
              No rules yet. Add one to tag matching saves automatically.
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={styles.rule}
                data-off={!rule.enabled}
              >
                <div className={styles["rule-head"]}>
                  <Switch.Root
                    checked={rule.enabled}
                    onCheckedChange={(v) => editRule(rule.id, { enabled: v })}
                  />
                  <span className={styles["rule-label"]}>
                    {rule.addTags.length > 0
                      ? rule.addTags.map((t) => `#${t}`).join(" ")
                      : "New rule"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon
                    aria-label="Remove rule"
                    onClick={() => removeRule(rule.id)}
                  >
                    <Trash2 width={14} height={14} />
                  </Button>
                </div>

                <div className={styles["rule-grid"]}>
                  <div className={styles.field}>
                    <span className={styles["field-label"]}>Source</span>
                    <Select.Root
                      value={rule.source ?? "any"}
                      onValueChange={(v) =>
                        editRule(rule.id, {
                          source: v === "any" ? null : (v as Source),
                        })
                      }
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Icon>
                          <ChevronsUpDown />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Positioner sideOffset={6}>
                          <Select.Popup>
                            <Select.Item value="any">Any source</Select.Item>
                            {SOURCES.map((s) => (
                              <Select.Item key={s} value={s}>
                                {getSourceLabel(s)}
                              </Select.Item>
                            ))}
                          </Select.Popup>
                        </Select.Positioner>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  <div className={styles.field}>
                    <span className={styles["field-label"]}>URL contains</span>
                    <Input.Field
                      value={rule.urlContains ?? ""}
                      placeholder="dribbble.com"
                      onChange={(e) =>
                        editRule(rule.id, {
                          urlContains: e.target.value || null,
                        })
                      }
                    />
                  </div>

                  <div className={styles.field}>
                    <span className={styles["field-label"]}>
                      Author contains
                    </span>
                    <Input.Field
                      value={rule.authorContains ?? ""}
                      placeholder="@handle"
                      onChange={(e) =>
                        editRule(rule.id, {
                          authorContains: e.target.value || null,
                        })
                      }
                    />
                  </div>

                  <div className={styles.field}>
                    <span className={styles["field-label"]}>
                      Title contains
                    </span>
                    <Input.Field
                      value={rule.titleContains ?? ""}
                      placeholder="tutorial"
                      onChange={(e) =>
                        editRule(rule.id, {
                          titleContains: e.target.value || null,
                        })
                      }
                    />
                  </div>

                  <div className={`${styles.field} ${styles["field-wide"]}`}>
                    <span className={styles["field-label"]}>Add tags</span>
                    <Input.Field
                      value={rule.addTags.join(", ")}
                      placeholder="design, inspiration"
                      onChange={(e) =>
                        editRule(rule.id, {
                          addTags: e.target.value
                            .split(/[\s,]+/)
                            .map((t) => t.replace(/^#+/, "").toLowerCase())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          <div className={styles.actions}>
            <Button size="sm" onClick={addRule}>
              Add rule
            </Button>
          </div>
        </div>
      </Settings.Section>
    </Settings.Page>
  );
}
