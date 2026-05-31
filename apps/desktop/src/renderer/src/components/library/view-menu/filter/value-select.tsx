import { COLOR_PRESETS } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { Predicate } from "@pond/schema/filters/types";
import { Input, Menu } from "@pond/ui";
import { Check, Star } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import { useTagGroups } from "@/pool/tag-groups";
import { useTags } from "@/pool/tags";
import { useView } from "../context";
import { DATE_PRESETS } from "./date-presets";
import styles from "./value-select.module.css";

interface ValueSelectProps {
  index: number;
  predicate: Predicate;
}

export function ValueSelect({ index, predicate }: ValueSelectProps) {
  const { actions } = useView();
  const meta = FIELD_META[predicate.field];
  const summary = summariseValue(predicate);
  const isEmpty = summary === "Select";

  const onChange = useCallback(
    (next: Predicate) => actions.updatePredicate(index, next),
    [actions, index],
  );

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger
        render={
          <button
            type="button"
            className={styles["popover-trigger"]}
            aria-label={`${meta.label} value`}
            data-empty={isEmpty ? "true" : undefined}
          >
            {summary}
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup>
            <Body predicate={predicate} onChange={onChange} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

interface BodyProps {
  predicate: Predicate;
  onChange: (next: Predicate) => void;
}

export function Body({ predicate, onChange }: BodyProps) {
  const meta = FIELD_META[predicate.field];
  switch (meta.type) {
    case "stringArray":
      return <TagsBody predicate={predicate} onChange={onChange} />;
    case "enum":
      return <EnumBody predicate={predicate} onChange={onChange} />;
    case "number":
      return <NumberBody predicate={predicate} onChange={onChange} />;
    case "date":
      return <DateBody predicate={predicate} onChange={onChange} />;
    case "optional":
      return <OptionalBody predicate={predicate} onChange={onChange} />;
    case "color":
      return <ColorBody predicate={predicate} onChange={onChange} />;
    default:
      return <StringBody predicate={predicate} onChange={onChange} />;
  }
}

function ColorBody({ predicate, onChange }: BodyProps) {
  const active = typeof predicate.value === "string" ? predicate.value : "";

  return (
    <div className={styles.body} data-variant="narrow">
      <div className={styles.swatches}>
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.label}
            aria-label={c.label}
            className={styles.swatch}
            style={{ background: c.hex }}
            data-active={
              active.toLowerCase() === c.hex.toLowerCase() ? "true" : undefined
            }
            onClick={() =>
              onChange({ ...predicate, cmp: "near", value: c.hex })
            }
          />
        ))}
      </div>
    </div>
  );
}

function StringBody({ predicate, onChange }: BodyProps) {
  const meta = FIELD_META[predicate.field];
  const value = typeof predicate.value === "string" ? predicate.value : "";

  return (
    <div className={styles.body} data-variant="narrow">
      <Input.Field
        type="search"
        value={value}
        autoFocus
        placeholder={meta.label}
        spellCheck={false}
        onChange={(e) => onChange({ ...predicate, value: e.target.value })}
      />
    </div>
  );
}

interface OptionalChoice {
  id: string;
  label: string;
  value: boolean;
}

const OPTIONAL_CHOICES: readonly OptionalChoice[] = [
  { id: "with", label: "With note", value: true },
  { id: "without", label: "Without note", value: false },
];

function OptionalBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const value = predicate.value !== false;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return OPTIONAL_CHOICES;
    return OPTIONAL_CHOICES.filter((c) =>
      c.label.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <div className={styles.body} data-variant="narrow">
      <div className={styles.search}>
        <Input.Field
          type="search"
          value={q}
          placeholder="Filter…"
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          spellCheck={false}
        />
      </div>
      {filtered.map((choice) => (
        <Menu.Item
          key={choice.id}
          onClick={() =>
            onChange({ ...predicate, cmp: "exists", value: choice.value })
          }
          data-active={value === choice.value ? "true" : undefined}
        >
          <Menu.ItemLabel>{choice.label}</Menu.ItemLabel>
        </Menu.Item>
      ))}
      {filtered.length === 0 ? (
        <div className={styles.empty}>No matches.</div>
      ) : null}
    </div>
  );
}

function EnumBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const meta = FIELD_META[predicate.field];
  const presets = meta.presets ?? [];

  const selected = useMemo(() => {
    const v = predicate.value;
    if (Array.isArray(v)) return new Set(v.map(String));
    if (typeof v === "string" && v) return new Set([v]);
    return new Set<string>();
  }, [predicate.value]);

  const filtered = presets.filter((p) =>
    p.label.toLowerCase().includes(q.trim().toLowerCase()),
  );

  function toggle(value: unknown) {
    const next = new Set(selected);
    const key = String(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const list = Array.from(next);
    if (list.length === 1) {
      onChange({
        ...predicate,
        cmp: predicate.cmp === "neq" || predicate.cmp === "nin" ? "neq" : "eq",
        value: list[0] ?? "",
      });
      return;
    }
    onChange({
      ...predicate,
      cmp: predicate.cmp === "neq" || predicate.cmp === "nin" ? "nin" : "in",
      value: list,
    });
  }

  if (!presets.length) {
    return (
      <div className={styles.body}>
        <div className={styles.empty}>Nothing to pick.</div>
      </div>
    );
  }

  return (
    <div className={styles.body} data-variant="scroll">
      <div className={styles.search}>
        <Input.Field
          type="search"
          value={q}
          placeholder={`Filter ${meta.label.toLowerCase()}…`}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          spellCheck={false}
        />
      </div>
      {filtered.map((p) => {
        const checked = selected.has(String(p.value));
        return (
          <Menu.CheckboxItem
            key={p.id}
            closeOnClick={false}
            checked={checked}
            onCheckedChange={() => toggle(p.value)}
          >
            <span className={styles.check} aria-hidden>
              {checked ? <Check width="0.85em" height="0.85em" /> : null}
            </span>
            <Menu.ItemLabel>{p.label}</Menu.ItemLabel>
          </Menu.CheckboxItem>
        );
      })}
      {filtered.length === 0 ? (
        <div className={styles.empty}>No matches.</div>
      ) : null}
    </div>
  );
}

function NumberBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const meta = FIELD_META[predicate.field];
  const presets = meta.presets ?? [];
  const value = predicate.value;
  const [min, max] =
    Array.isArray(value) && value.length === 2 ? value : [null, null];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return presets;
    return presets.filter((p) => p.label.toLowerCase().includes(needle));
  }, [presets, q]);

  function applyPreset(presetValue: unknown) {
    const n =
      typeof presetValue === "number" ? presetValue : Number(presetValue);
    if (!Number.isFinite(n)) return;
    onChange({ ...predicate, cmp: "lte", value: n });
  }

  function setRange(nextMin: string, nextMax: string) {
    const lo = nextMin === "" ? null : Number(nextMin);
    const hi = nextMax === "" ? null : Number(nextMax);
    if (lo !== null && hi !== null) {
      onChange({ ...predicate, cmp: "between", value: [lo, hi] });
      return;
    }
    if (lo !== null) {
      onChange({ ...predicate, cmp: "gte", value: lo });
      return;
    }
    if (hi !== null) {
      onChange({ ...predicate, cmp: "lte", value: hi });
      return;
    }
    onChange({ ...predicate, cmp: "between", value: [0, 0] });
  }

  return (
    <div className={styles.body}>
      <div className={styles.search}>
        <Input.Field
          type="search"
          value={q}
          placeholder="Filter…"
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          spellCheck={false}
        />
      </div>
      {filtered.map((p) => (
        <Menu.Item key={p.id} onClick={() => applyPreset(p.value)}>
          <Menu.ItemLabel>{p.label}</Menu.ItemLabel>
        </Menu.Item>
      ))}
      {filtered.length === 0 ? (
        <div className={styles.empty}>No matches.</div>
      ) : null}
      <Menu.Separator />
      <div className={styles.range}>
        <Input.Field
          type="number"
          inputMode="numeric"
          placeholder="min"
          value={min == null ? "" : String(min)}
          onChange={(e) =>
            setRange(e.target.value, max == null ? "" : String(max))
          }
        />
        <span className={styles.dash} aria-hidden>
          –
        </span>
        <Input.Field
          type="number"
          inputMode="numeric"
          placeholder="max"
          value={max == null ? "" : String(max)}
          onChange={(e) =>
            setRange(min == null ? "" : String(min), e.target.value)
          }
        />
      </div>
    </div>
  );
}

function DateBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const value = predicate.value;
  const [from, to] =
    Array.isArray(value) && value.length === 2
      ? (value as [string, string])
      : ["", ""];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return DATE_PRESETS;
    return DATE_PRESETS.filter((p) => p.label.toLowerCase().includes(needle));
  }, [q]);

  function applyPreset(iso: string) {
    onChange({ ...predicate, cmp: "gte", value: iso });
  }

  function setRange(nextFrom: string, nextTo: string) {
    if (nextFrom && nextTo) {
      onChange({
        ...predicate,
        cmp: "between",
        value: [`${nextFrom}T00:00:00.000Z`, `${nextTo}T23:59:59.999Z`],
      });
      return;
    }
    if (nextFrom) {
      onChange({
        ...predicate,
        cmp: "gte",
        value: `${nextFrom}T00:00:00.000Z`,
      });
      return;
    }
    if (nextTo) {
      onChange({
        ...predicate,
        cmp: "lte",
        value: `${nextTo}T23:59:59.999Z`,
      });
    }
  }

  function isoToYmd(raw: string): string {
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return "";
  }

  return (
    <div className={styles.body}>
      <div className={styles.search}>
        <Input.Field
          type="search"
          value={q}
          placeholder="Filter…"
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          spellCheck={false}
        />
      </div>
      {filtered.map((p) => (
        <Menu.Item key={p.id} onClick={() => applyPreset(p.iso)}>
          <Menu.ItemLabel>{p.label}</Menu.ItemLabel>
        </Menu.Item>
      ))}
      {filtered.length === 0 ? (
        <div className={styles.empty}>No matches.</div>
      ) : null}
      <Menu.Separator />
      <Menu.Item
        closeOnClick={false}
        onClick={() => setShowCustom((v) => !v)}
        data-active={showCustom ? "true" : undefined}
      >
        <Menu.ItemLabel>Custom date or timeframe…</Menu.ItemLabel>
      </Menu.Item>
      {showCustom ? (
        <div className={styles.range}>
          <Input.Field
            type="date"
            value={isoToYmd(from)}
            onChange={(e) => setRange(e.target.value, isoToYmd(to))}
          />
          <span className={styles.dash} aria-hidden>
            –
          </span>
          <Input.Field
            type="date"
            value={isoToYmd(to)}
            onChange={(e) => setRange(isoToYmd(from), e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

interface TagEntry {
  name: string;
  count: number;
  starred: boolean;
  description: string | null;
}

interface TagSection {
  key: string;
  label: string | null;
  starred?: boolean;
  items: TagEntry[];
}

function TagsBody({ predicate, onChange }: BodyProps) {
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
        description: meta?.description ?? null,
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
      <div className={styles.search}>
        <Input.Field
          type="search"
          value={q}
          placeholder="Filter tags…"
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          spellCheck={false}
        />
      </div>
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
                  title={entry.description ?? undefined}
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

export function summariseValue(p: Predicate): string {
  const v = p.value;
  if (p.cmp === "exists") return v === false ? "Without" : "With";
  if (p.field === "color" && typeof v === "string" && v) {
    const preset = COLOR_PRESETS.find(
      (c) => c.hex.toLowerCase() === v.toLowerCase(),
    );
    return preset?.label ?? v;
  }
  if (Array.isArray(v)) {
    if (p.cmp === "between") {
      const [lo, hi] = v;
      if (lo == null && hi == null) return "Select";
      return `${lo ?? ""}–${hi ?? ""}`;
    }
    if (v.length === 0) return "Select";
    if (v.length === 1) return String(v[0]);
    return `${v.length} values`;
  }
  if (typeof v === "string") return v || "Select";
  if (typeof v === "number") return String(v);
  return "Select";
}
