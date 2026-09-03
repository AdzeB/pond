import {
  IconClone2Outline18,
  IconFolderOutline18,
  IconMagnifierOutline18,
  IconMinusOutline18,
  IconTagsOutline18,
  IconVersionsOutline18,
} from "@pond/icons/outline/18";
import type { Predicate } from "@pond/schema/filters/types";
import { Menu, Toggle, ToggleGroup, Tooltip } from "@pond/ui";
import { useMemo, useState } from "react";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import type { FilterOption } from "./options";
import {
  changeChoiceMode,
  isChoiceSelected,
  selectChoice,
  selectedChoiceMode,
} from "./selection";
import styles from "./styles.module.css";
import { useChoiceCounts } from "./use-choice-counts";

export interface FilterTagGroup {
  id: string;
  name: string;
  tagNames: readonly string[];
}

type TagScope = "all" | "selected" | string;

export function TagChoiceFilter({
  options,
  groups,
  rows,
  onChange,
}: {
  options: FilterOption[];
  groups: readonly FilterTagGroup[];
  rows: Predicate[];
  onChange: (rows: Predicate[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<TagScope>("all");
  const [action, setAction] = useState<"include" | "exclude">("include");
  const [match, setMatch] = useState(selectedChoiceMode(rows, "tags"));
  const { counts, empty } = useChoiceCounts("tags");
  const navFade = useScrollFade<HTMLDivElement>();
  const listFade = useScrollFade<HTMLDivElement>();
  const mode = action === "exclude" ? "exclude" : match;
  const needle = search.trim().toLowerCase();

  const selectedOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          isChoiceSelected(rows, option.predicate, "any") ||
          isChoiceSelected(rows, option.predicate, "exclude"),
      ),
    [options, rows],
  );
  const groupNames = useMemo(
    () =>
      new Map(
        groups.map((group) => [
          group.id,
          new Set(group.tagNames.map((name) => name.toLowerCase())),
        ]),
      ),
    [groups],
  );
  const scoped = options.filter((option) => {
    if (scope === "selected") return selectedOptions.includes(option);
    if (scope === "all") return true;
    return groupNames.get(scope)?.has(option.label.toLowerCase()) ?? false;
  });
  const visible = scoped.filter((option) =>
    option.label.toLowerCase().includes(needle),
  );
  const showUntagged =
    (scope === "all" || scope === "selected") && "untagged".includes(needle);
  const untaggedSelected = rows.some(
    (row) => row.field === "tags" && row.operator === "empty",
  );
  const navItems = [
    { id: "all", label: "All Tags", count: options.length },
    { id: "selected", label: "Selected", count: selectedOptions.length },
    ...groups.map((group) => ({
      id: group.id,
      label: group.name,
      count: options.filter((option) =>
        groupNames.get(group.id)?.has(option.label.toLowerCase()),
      ).length,
    })),
  ];

  const renderOption = (option: FilterOption) => {
    const excluded = isChoiceSelected(rows, option.predicate, "exclude");
    const checked = isChoiceSelected(rows, option.predicate, mode);
    const raw = Array.isArray(option.predicate.value)
      ? option.predicate.value[0]
      : option.predicate.value;
    return (
      <Menu.CheckboxItem
        key={String(raw)}
        closeOnClick={false}
        checked={checked}
        onCheckedChange={(next) =>
          onChange(selectChoice(rows, option.predicate, next, mode))
        }
      >
        <Menu.CheckboxItemIndicator />
        <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
        {excluded ? <Menu.SecondaryLabel>Excluded</Menu.SecondaryLabel> : null}
        <Menu.SecondaryLabel>
          {counts.get(String(raw).toLowerCase()) ?? 0}
        </Menu.SecondaryLabel>
      </Menu.CheckboxItem>
    );
  };

  const rule = action === "exclude" ? "exclude" : match;
  const setRule = (next: string) => {
    if (next === "exclude") {
      setAction("exclude");
      return;
    }
    if (next !== "any" && next !== "all") return;
    setAction("include");
    setMatch(next);
    onChange(changeChoiceMode(rows, "tags", next));
  };

  return (
    <div className={styles["tag-picker"]}>
      <div className={styles["tag-header"]}>
        <div className={styles["tag-search"]}>
          <IconMagnifierOutline18 aria-hidden />
          <Menu.Input
            aria-label="Filter Tags"
            placeholder="Search tags…"
            value={search}
            onValueChange={setSearch}
          />
        </div>
        <div className={styles["tag-rules"]}>
          <span className={styles["tag-rules-label"]}>Rule:</span>
          <ToggleGroup
            className={styles["tag-rule-toggle"]}
            aria-label="Tag Filter Rules"
            value={[rule]}
            onValueChange={(next) => {
              const value = next[0];
              if (value) setRule(value);
            }}
          >
            <Tooltip label="Any Selected" side="top">
              <Toggle
                className={styles["tag-rule-button"]}
                size="sm"
                value="any"
                aria-label="Any Selected"
              >
                <IconClone2Outline18 />
              </Toggle>
            </Tooltip>
            <Tooltip label="All Selected" side="top">
              <Toggle
                className={styles["tag-rule-button"]}
                size="sm"
                value="all"
                aria-label="All Selected"
              >
                <IconVersionsOutline18 />
              </Toggle>
            </Tooltip>
            <Tooltip label="Exclude Selected" side="top">
              <Toggle
                className={styles["tag-rule-button"]}
                size="sm"
                value="exclude"
                aria-label="Exclude Selected"
              >
                <IconMinusOutline18 />
              </Toggle>
            </Tooltip>
          </ToggleGroup>
        </div>
      </div>
      <div className={styles["tag-body"]}>
        <div
          className={styles["tag-nav"]}
          role="radiogroup"
          aria-label="Tag Group"
          {...navFade}
        >
          {navItems.map((item, index) => (
            <Menu.Row
              key={item.id}
              role="radio"
              highlighted={item.id === scope}
              aria-checked={item.id === scope}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setScope(item.id)}
            >
              <Menu.ItemIcon>
                {index < 2 ? <IconTagsOutline18 /> : <IconFolderOutline18 />}
              </Menu.ItemIcon>
              <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
              <Menu.SecondaryLabel>{item.count}</Menu.SecondaryLabel>
            </Menu.Row>
          ))}
        </div>
        <div className={styles["tag-list"]} {...listFade}>
          {showUntagged && (scope !== "selected" || untaggedSelected) ? (
            <Menu.CheckboxItem
              closeOnClick={false}
              checked={
                untaggedSelected &&
                rows.some(
                  (row) =>
                    row.field === "tags" &&
                    row.operator === "empty" &&
                    (row.negate ?? false) === (action === "exclude"),
                )
              }
              onCheckedChange={(checked) =>
                onChange([
                  ...rows.filter((row) => row.field !== "tags"),
                  ...(checked
                    ? [
                        {
                          field: "tags" as const,
                          operator: "empty" as const,
                          value: true,
                          ...(action === "exclude" ? { negate: true } : {}),
                        },
                      ]
                    : []),
                ])
              }
            >
              <Menu.CheckboxItemIndicator />
              <Menu.ItemLabel>Untagged</Menu.ItemLabel>
              {rows.some(
                (row) =>
                  row.field === "tags" &&
                  row.operator === "empty" &&
                  row.negate,
              ) ? (
                <Menu.SecondaryLabel>Excluded</Menu.SecondaryLabel>
              ) : null}
              <Menu.SecondaryLabel>{empty}</Menu.SecondaryLabel>
            </Menu.CheckboxItem>
          ) : null}
          {visible.map(renderOption)}
          {!visible.length &&
          !(showUntagged && (scope !== "selected" || untaggedSelected)) ? (
            <div className={styles["tag-empty"]}>
              {needle ? "No matches" : "No tags in this group"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
