import {
  IconCheckOutline18,
  IconMagnifierOutline18,
  IconSparkleOutline18,
} from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Input, Kbd, Popover } from "@pond/ui";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import { type TagGroupRow, useTagGroups } from "@/pool/tag-groups";
import { useTags } from "@/pool/tags";
import pickerStyles from "./styles.module.css";

const RECENT_CAP = 12;
const RECOMMENDED_CAP = 12;

interface GroupTagAdderProps {
  group: TagGroupRow;
  trigger: ReactElement;
}

interface AdderItem {
  name: string;
  count: number;
  applied: boolean;
}

export function GroupTagAdder({ group, trigger }: GroupTagAdderProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();

  useEffect(() => {
    if (!open) return;
    setQ("");
  }, [open]);

  // Always read the latest group row from the live pool (the prop snapshot
  // can lag behind tagGroups.addTags / removeTag mutations).
  const liveGroup = useMemo(
    () => groups.find((g) => g.id === group.id) ?? group,
    [groups, group],
  );

  const inGroup = useMemo(() => {
    const set = new Set<string>();
    for (const name of liveGroup.tagNames) set.add(name.toLowerCase());
    return set;
  }, [liveGroup]);

  const tagsByLowerName = useMemo(() => {
    const map = new Map<string, (typeof tags)[number]>();
    for (const t of tags) map.set(t.name.toLowerCase(), t);
    return map;
  }, [tags]);

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

  const needle = q.trim().toLowerCase();
  function matchesNeedle(name: string): boolean {
    if (!needle) return true;
    return name.toLowerCase().includes(needle);
  }

  function toItem(name: string): AdderItem {
    const lowered = name.toLowerCase();
    const meta = tagsByLowerName.get(lowered);
    return {
      name: meta?.name ?? name,
      count: counts.get(lowered) ?? 0,
      applied: inGroup.has(lowered),
    };
  }

  const recentItems = useMemo<AdderItem[]>(() => {
    const seen = new Set<string>();
    return tags
      .filter((t) => t.lastUsedAt != null)
      .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
      .filter((t) => {
        const k = t.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return matchesNeedle(t.name);
      })
      .slice(0, RECENT_CAP)
      .map((t) => toItem(t.name));
    // biome-ignore lint/correctness/useExhaustiveDependencies: toItem/matchesNeedle close over the same upstream state already listed.
  }, [tags, toItem, matchesNeedle]);

  const recommendedItems = useMemo<AdderItem[]>(() => {
    return Array.from(counts.entries())
      .filter(([k]) => !inGroup.has(k))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, RECOMMENDED_CAP)
      .map(([k]) => tagsByLowerName.get(k)?.name ?? k)
      .filter((name) => matchesNeedle(name))
      .map((name) => toItem(name));
    // biome-ignore lint/correctness/useExhaustiveDependencies: toItem/matchesNeedle close over the same upstream state already listed.
  }, [counts, inGroup, tagsByLowerName, toItem, matchesNeedle]);

  const exactExists = needle.length > 0 && tagsByLowerName.has(needle);
  const hasAny = recentItems.length + recommendedItems.length > 0;

  async function toggle(rawName: string) {
    const cleaned = normalizeLabelName(rawName);
    if (!cleaned) return;
    const lower = cleaned.toLowerCase();
    setBusy(true);
    try {
      if (inGroup.has(lower)) {
        await window.pond.query("tagGroups.removeTag", {
          tag: cleaned,
          group: liveGroup.name,
        });
        return;
      }
      if (!tagsByLowerName.has(lower)) {
        await window.pond.query("tags.create", { name: cleaned });
      }
      await window.pond.query("tagGroups.addTags", {
        tags: [cleaned],
        group: liveGroup.name,
      });
    } finally {
      setBusy(false);
    }
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!needle) return;
    const exact =
      recentItems.find((t) => t.name.toLowerCase() === needle) ??
      recommendedItems.find((t) => t.name.toLowerCase() === needle);
    if (exact) {
      void toggle(exact.name);
      return;
    }
    void toggle(q);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6}>
          <Popover.Popup className={pickerStyles["tag-picker-popup"]}>
            <div className={pickerStyles["tag-picker-header"]}>
              <span
                className={pickerStyles["tag-picker-header-icon"]}
                aria-hidden
              >
                <IconMagnifierOutline18 width={14} height={14} />
              </span>
              <Input.Field
                data-size="sm"
                className={pickerStyles["tag-picker-search"]}
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onSearchKeyDown}
                autoFocus
                spellCheck={false}
                disabled={busy}
              />
            </div>
            <div className={pickerStyles["tag-picker-body"]} data-layout="list">
              {recentItems.length > 0 ? (
                <Section
                  title="Recently"
                  count={recentItems.length}
                  items={recentItems}
                  onPick={toggle}
                />
              ) : null}
              {recommendedItems.length > 0 ? (
                <Section
                  title="Recommended"
                  count={recommendedItems.length}
                  items={recommendedItems}
                  onPick={toggle}
                />
              ) : null}
              {needle && !exactExists ? (
                <button
                  type="button"
                  className={pickerStyles["tag-picker-item"]}
                  data-create
                  onClick={() => void toggle(q)}
                >
                  <span
                    className={pickerStyles["tag-picker-item-icon"]}
                    aria-hidden
                  >
                    <IconSparkleOutline18 width={12} height={12} />
                  </span>
                  <span className={pickerStyles["tag-picker-item-name"]}>
                    Create "{normalizeLabelName(q) || q}"
                  </span>
                </button>
              ) : null}
              {!hasAny && !needle ? (
                <div className={pickerStyles["tag-picker-empty"]}>
                  No tags yet — type a name to create one.
                </div>
              ) : null}
            </div>
            <div className={pickerStyles["tag-picker-footer"]}>
              <span className={pickerStyles["tag-picker-footer-cell"]}>
                <Kbd.Cluster keys={["↑", "↓", "←", "→"]} />
                <span className={pickerStyles["tag-picker-footer-label"]}>
                  Move
                </span>
              </span>
              <span className={pickerStyles["tag-picker-footer-cell"]}>
                <Kbd.Key>↵</Kbd.Key>
                <span className={pickerStyles["tag-picker-footer-label"]}>
                  Toggle
                </span>
              </span>
              <span className={pickerStyles["tag-picker-footer-cell"]}>
                <Kbd.Key>esc</Kbd.Key>
                <span className={pickerStyles["tag-picker-footer-label"]}>
                  Close
                </span>
              </span>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Section({
  title,
  count,
  items,
  onPick,
}: {
  title: string;
  count: number;
  items: AdderItem[];
  onPick: (name: string) => void;
}) {
  return (
    <section className={pickerStyles["tag-picker-section"]}>
      <h4 className={pickerStyles["tag-picker-section-title"]}>
        {title}{" "}
        <span className={pickerStyles["tag-picker-section-count"]}>
          ({count})
        </span>
      </h4>
      <div className={pickerStyles["tag-picker-list"]}>
        {items.map((item) => (
          <button
            key={item.name}
            type="button"
            className={pickerStyles["tag-picker-item"]}
            data-applied={item.applied || undefined}
            onClick={() => onPick(item.name)}
            title={item.name}
          >
            <span className={pickerStyles["tag-picker-item-icon"]} aria-hidden>
              {item.applied ? (
                <IconCheckOutline18 width={12} height={12} />
              ) : null}
            </span>
            <span className={pickerStyles["tag-picker-item-name"]}>
              {item.name}
            </span>
            {item.count > 0 ? (
              <span className={pickerStyles["tag-picker-item-count"]}>
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
