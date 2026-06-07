import { IconStarFill18 as Star } from "@pond/icons/fill/18";
import { IconCheckOutline18 as Check } from "@pond/icons/outline/18";
import { Menu } from "@pond/ui";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import { useTagGroups } from "@/pool/tag-groups";
import { useTags } from "@/pool/tags";
import styles from "../styles.module.css";
import type { BodyProps } from "../types";

interface TagEntry {
  name: string;
  count: number;
  starred: boolean;
}

interface TagSection {
  key: string;
  label: string | null;
  starred?: boolean;
  items: TagEntry[];
}

export function TagsBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const s of saves) {
      if (s.deletedAt) continue;
      for (const t of s.tags) {
        const k = t.toLowerCase();
        c.set(k, (c.get(k) ?? 0) + 1);
      }
    }
    return c;
  }, [saves]);

  const tagByLower = useMemo(() => {
    const map = new Map<string, (typeof tags)[number]>();
    for (const t of tags) map.set(t.name.toLowerCase(), t);
    return map;
  }, [tags]);

  const selected = useMemo(() => {
    const v = predicate.value;
    if (Array.isArray(v)) return new Set(v.map(String));
    if (typeof v === "string" && v) return new Set([v]);
    return new Set<string>();
  }, [predicate.value]);

  const entryFor = useCallback(
    (name: string): TagEntry => {
      const lower = name.toLowerCase();
      const meta = tagByLower.get(lower);
      return {
        name,
        count: counts.get(lower) ?? 0,
        starred: Boolean(meta?.starred),
      };
    },
    [tagByLower, counts],
  );

  const needle = q.trim().toLowerCase();
  const sections = useMemo<TagSection[]>(() => {
    const matchesTag = (e: TagEntry, headerLabel: string | null = null) =>
      !needle ||
      e.name.toLowerCase().includes(needle) ||
      (headerLabel ?? "").toLowerCase().includes(needle);

    const starredItems = tags
      .filter((t) => t.starred)
      .map((t) => entryFor(t.name))
      .filter((e) => matchesTag(e))
      .sort((a, b) => a.name.localeCompare(b.name));

    const grouped: TagSection[] = [];
    const taggedIds = new Set<string>();
    for (const g of groups) {
      for (const id of g.tagIds) taggedIds.add(id);
      const items = g.tagNames
        .map((name) => entryFor(name))
        .filter((e) => matchesTag(e, g.name))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (items.length > 0) {
        grouped.push({ key: `g:${g.id}`, label: g.name, items });
      }
    }

    const uncategorisedItems = tags
      .filter((t) => !taggedIds.has(t.id))
      .map((t) => entryFor(t.name))
      .filter((e) => matchesTag(e))
      .sort((a, b) => a.name.localeCompare(b.name));
    const uncatSection: TagSection | null =
      uncategorisedItems.length > 0
        ? {
            key: "uncategorised",
            label: groups.length === 0 ? null : "Uncategorized",
            items: uncategorisedItems,
          }
        : null;

    const out: TagSection[] = [];
    if (starredItems.length > 0)
      out.push({
        key: "starred",
        label: "Starred",
        starred: true,
        items: starredItems,
      });
    out.push(...grouped);
    if (uncatSection) out.push(uncatSection);
    return out;
  }, [tags, groups, needle, entryFor]);

  function toggle(tag: string) {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    onChange({
      ...predicate,
      value: Array.from(next),
    });
  }

  const flat = sections.flatMap((s) => s.items);

  return (
    <div className={styles.body} data-variant="scroll">
      <Menu.Input
        value={q}
        placeholder="Filter tags…"
        autoFocus
        onChange={(e) => setQ(e.target.value)}
      />
      {flat.length === 0 ? (
        <div className={styles.empty}>
          {needle ? "No matches." : "No tags yet."}
        </div>
      ) : (
        sections.map((section) => (
          <Fragment key={section.key}>
            {section.label ? (
              <div className={styles["section-header"]}>
                {section.starred ? (
                  <Star
                    fill="currentColor"
                    width={11}
                    height={11}
                    aria-hidden
                  />
                ) : null}
                <span>{section.label}</span>
              </div>
            ) : null}
            {section.items.map((entry) => {
              const checked = selected.has(entry.name);
              return (
                <Menu.CheckboxItem
                  key={`${section.key}:${entry.name}`}
                  closeOnClick={false}
                  checked={checked}
                  onCheckedChange={() => toggle(entry.name)}
                >
                  <span className={styles.check} aria-hidden>
                    {checked ? <Check width="0.85em" height="0.85em" /> : null}
                  </span>
                  {entry.starred ? (
                    <span className={styles["star-flag"]} aria-hidden>
                      <Star fill="currentColor" width="0.8em" height="0.8em" />
                    </span>
                  ) : null}
                  <Menu.ItemLabel>{entry.name}</Menu.ItemLabel>
                  <span className={styles.count}>{entry.count}</span>
                </Menu.CheckboxItem>
              );
            })}
          </Fragment>
        ))
      )}
    </div>
  );
}
