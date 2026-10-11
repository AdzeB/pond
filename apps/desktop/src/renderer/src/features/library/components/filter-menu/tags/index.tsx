import { IconBookmark, IconFolder } from "@pond/icons";
import type { Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { useMemo, useState } from "react";
import { EmptyChoice } from "../choice/empty";
import { ChoiceOption } from "../choice/option";
import type { FilterOption } from "../options";
import { isChoiceSelected } from "../selection";
import { useChoiceCounts } from "../use-choice-counts";
import styles from "./styles.module.css";

export interface FilterTagGroup {
  id: string;
  name: string;
  tagNames: readonly string[];
}

type TagScope = "all" | "selected" | string;

export function TagChoiceFilter({
  options,
  groups,
  matching = "any",
  rows,
  search,
  onChange,
}: {
  options: FilterOption[];
  groups: readonly FilterTagGroup[];
  matching?: "any" | "all";
  rows: Predicate[];
  search: string;
  onChange: (rows: Predicate[]) => void;
}) {
  const [scope, setScope] = useState<TagScope>("all");
  const { counts, empty } = useChoiceCounts("tags");
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
  const showEmpty = showUntagged && (scope !== "selected" || untaggedSelected);
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

  return (
    <div className={styles.root}>
      <Menu.Input aria-label="Filter Tags" placeholder="Search tags…" />
      <div className={styles.body}>
        <div className={styles.nav} role="radiogroup" aria-label="Tag Group">
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
                {index < 2 ? <IconBookmark /> : <IconFolder />}
              </Menu.ItemIcon>
              <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
              <Menu.SecondaryLabel>{item.count}</Menu.SecondaryLabel>
            </Menu.Row>
          ))}
        </div>
        <Menu.FilterList className={styles.list}>
          {showEmpty ? (
            <EmptyChoice
              field="tags"
              label="Untagged"
              count={empty}
              rows={rows}
              onChange={onChange}
            />
          ) : null}
          {visible.map((option) => {
            const raw = Array.isArray(option.predicate.value)
              ? option.predicate.value[0]
              : option.predicate.value;
            return (
              <ChoiceOption
                key={String(raw)}
                option={option}
                rows={rows}
                matching={matching}
                count={counts.get(String(raw).toLowerCase()) ?? 0}
                onChange={onChange}
              />
            );
          })}
          {!visible.length && !showEmpty ? (
            <div className={styles.empty}>
              {needle ? "No matches" : "No tags in this group"}
            </div>
          ) : null}
        </Menu.FilterList>
      </div>
    </div>
  );
}
