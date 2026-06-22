import { IconXmarkOutline18 as X } from "@pond/icons/outline/18";
import { COLOR_PRESETS } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { Predicate, Query } from "@pond/schema/filters/types";
import { Button, Dialog, Field, RangeField } from "@pond/ui";
import { type ReactNode, useMemo, useState } from "react";
import { type EnumOption, EnumSelect } from "@/components/enum-select";
import { useSaves } from "@/hooks/use-saves";
import { predicateIsActive } from "@/lib/filter-helpers";
import { FIELD_ICONS } from "@/lib/search-fields";
import { DATE_PRESETS, parseSearchInput } from "@/lib/search-syntax";
import { recordSearch } from "@/stores/search-history";
import { setQuery, useFilterQuery, useSearchText } from "@/stores/view-store";
import styles from "./styles.module.css";

type Preset = { id: string; label: string; value: unknown };

function presetsFor(field: "source" | "type" | "duration"): readonly Preset[] {
  return (FIELD_META[field].presets ?? []) as readonly Preset[];
}

// Each duration preset encodes a comparison in its label; map the preset id to
// the comparison the typed grammar understands.
function durationToken(id: string): string | null {
  const preset = presetsFor("duration").find((p) => p.id === id);
  if (!preset) return null;
  const value = Number(preset.value);
  return id === "longer" ? `duration>=${value}` : `duration<${value}`;
}

function durationPresetId(predicate: Predicate): string {
  const value = Number(predicate.value);
  if (predicate.operator === "gte") return "longer";
  const match = presetsFor("duration").find(
    (p) => Number(p.value) === value && p.id !== "longer",
  );
  return match?.id ?? "";
}

type FilesMode = "" | "gte" | "lte";

interface FormState {
  tags: string[];
  source: string;
  type: string;
  creator: string;
  saved: string;
  filesMode: FilesMode;
  filesCount: number;
  duration: string;
  color: string;
  note: "" | "with" | "without";
}

const EMPTY_FORM: FormState = {
  tags: [],
  source: "",
  type: "",
  creator: "",
  saved: "",
  filesMode: "",
  filesCount: 2,
  duration: "",
  color: "",
  note: "",
};

const ISO_TO_SLUG = new Map(DATE_PRESETS.map((d) => [d.iso, d.slug]));

function seedForm(predicates: Predicate[]): FormState {
  const form: FormState = { ...EMPTY_FORM, tags: [] };
  for (const predicate of predicates) {
    const { field, operator, value } = predicate;
    switch (field) {
      case "tags":
        if (Array.isArray(value)) form.tags = value.map(String);
        break;
      case "source":
        if (typeof value === "string") form.source = value;
        break;
      case "type":
        if (typeof value === "string") form.type = value;
        break;
      case "creator":
        form.creator = String(value ?? "");
        break;
      case "savedAt": {
        const slug = ISO_TO_SLUG.get(String(value));
        if (slug) form.saved = slug;
        break;
      }
      case "fileCount": {
        if (operator === "lt" || operator === "lte") {
          form.filesMode = "lte";
          form.filesCount = Number(value) || EMPTY_FORM.filesCount;
        } else if (operator === "gt" || operator === "gte") {
          form.filesMode = "gte";
          form.filesCount = Number(value) || EMPTY_FORM.filesCount;
        }
        break;
      }
      case "duration":
        form.duration = durationPresetId(predicate);
        break;
      case "color":
        form.color = String(value ?? "").toLowerCase();
        break;
      case "note":
        form.note = value === false ? "without" : "with";
        break;
      default:
        break;
    }
  }
  return form;
}

function quoteValue(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

function formToTokens(form: FormState): string {
  const tokens: string[] = [];
  if (form.tags.length > 0) {
    tokens.push(`tag:${form.tags.map(quoteValue).join(",")}`);
  }
  if (form.source) tokens.push(`source:${form.source}`);
  if (form.type) tokens.push(`type:${form.type}`);
  if (form.creator) tokens.push(`by:${quoteValue(form.creator)}`);
  if (form.saved) tokens.push(`saved:${form.saved}`);
  if (form.filesMode === "gte") tokens.push(`files>=${form.filesCount}`);
  if (form.filesMode === "lte") tokens.push(`files<=${form.filesCount}`);
  if (form.duration) {
    const token = durationToken(form.duration);
    if (token) tokens.push(token);
  }
  if (form.color) tokens.push(`color:${form.color}`);
  if (form.note) tokens.push(`note:${form.note}`);
  return tokens.join(" ");
}

interface LiveLists {
  tags: string[];
  creators: string[];
}

function computeLive(saves: ReturnType<typeof useSaves>): LiveLists {
  const tags = new Map<string, number>();
  const creators = new Map<string, number>();
  for (const save of saves) {
    if (save.deletedAt) continue;
    for (const tag of save.tags ?? []) {
      const key = tag.toLowerCase();
      tags.set(key, (tags.get(key) ?? 0) + 1);
    }
    const author = save.author?.trim();
    if (author) creators.set(author, (creators.get(author) ?? 0) + 1);
  }
  const byCount = (a: [string, number], b: [string, number]) =>
    b[1] - a[1] || a[0].localeCompare(b[0]);
  return {
    tags: Array.from(tags.entries())
      .sort(byCount)
      .map(([t]) => t),
    creators: Array.from(creators.entries())
      .sort(byCount)
      .map(([c]) => c),
  };
}

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LibraryFilterDialog({ open, onOpenChange }: FilterDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open ? <FilterForm onClose={() => onOpenChange(false)} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FilterForm({ onClose }: { onClose: () => void }) {
  const query = useFilterQuery();
  const q = useSearchText();
  const saves = useSaves();
  const live = useMemo(() => computeLive(saves), [saves]);

  const predicates = useMemo(
    () => query.rules.filter((rule): rule is Predicate => !("rules" in rule)),
    [query],
  );

  // FilterForm mounts fresh each time the dialog opens, so seeding the initial
  // state from the current query here is sufficient.
  const [form, setForm] = useState<FormState>(() => seedForm(predicates));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const apply = () => {
    const parsed = parseSearchInput(formToTokens(form));
    const rules = parsed.predicates.filter(predicateIsActive);
    const next: Query = { combinator: "and", rules };
    setQuery(next);
    recordSearch(next, q);
    onClose();
  };

  const sourceOptions = optionsFrom(presetsFor("source"));
  const typeOptions = optionsFrom(presetsFor("type"));
  // Duration presets are keyed by id (two share the same numeric value).
  const durationOptions: EnumOption<string>[] = presetsFor("duration").map(
    (p) => ({ value: p.id, label: p.label }),
  );
  const savedOptions: EnumOption<string>[] = [
    { value: "", label: "Any time" },
    ...DATE_PRESETS.map((d) => ({ value: d.slug, label: d.label })),
  ];
  const creatorOptions: EnumOption<string>[] = [
    { value: "", label: "Anyone" },
    ...live.creators.slice(0, 30).map((c) => ({ value: c, label: c })),
  ];
  const filesOptions: EnumOption<FilesMode>[] = [
    { value: "", label: "Any" },
    { value: "gte", label: "At least" },
    { value: "lte", label: "At most" },
  ];
  const noteOptions: EnumOption<FormState["note"]>[] = [
    { value: "", label: "Any" },
    { value: "with", label: "With a note" },
    { value: "without", label: "Without a note" },
  ];

  return (
    <Dialog.Popup className={styles.popup}>
      <header className={styles.header}>
        <Dialog.Title className={styles.title}>Filters</Dialog.Title>
        <Dialog.Close
          render={<Button icon size="sm" variant="ghost" aria-label="Close" />}
        >
          <X />
        </Dialog.Close>
      </header>

      <div className={styles.body}>
        {live.tags.length > 0 ? (
          <Section field="tags" label="Tags">
            <div className={styles.pills}>
              {live.tags.slice(0, 16).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.pill}
                  data-selected={form.tags.includes(tag) || undefined}
                  aria-pressed={form.tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        <Section field="source" label="Source">
          <EnumSelect
            value={form.source}
            onValueChange={(v) => set("source", v)}
            options={[{ value: "", label: "Any source" }, ...sourceOptions]}
            aria-label="Source"
            className={styles.select}
          />
        </Section>

        <Section field="type" label="Type">
          <EnumSelect
            value={form.type}
            onValueChange={(v) => set("type", v)}
            options={[{ value: "", label: "Any type" }, ...typeOptions]}
            aria-label="Type"
            className={styles.select}
          />
        </Section>

        <Section field="creator" label="Creator">
          <EnumSelect
            value={form.creator}
            onValueChange={(v) => set("creator", v)}
            options={creatorOptions}
            aria-label="Creator"
            className={styles.select}
          />
        </Section>

        <Section field="savedAt" label="Date saved">
          <EnumSelect
            value={form.saved}
            onValueChange={(v) => set("saved", v)}
            options={savedOptions}
            aria-label="Date saved"
            className={styles.select}
          />
        </Section>

        <Section field="fileCount" label="Files">
          <div className={styles.inline}>
            <EnumSelect
              value={form.filesMode}
              onValueChange={(v) => set("filesMode", v)}
              options={filesOptions}
              aria-label="File count comparison"
              className={styles.select}
            />
            {form.filesMode ? (
              <RangeField
                value={form.filesCount}
                min={1}
                max={50}
                aria-label="File count"
                onValueChange={(v) => set("filesCount", v)}
                className={styles.range}
              />
            ) : null}
          </div>
        </Section>

        <Section field="duration" label="Duration">
          <EnumSelect
            value={form.duration}
            onValueChange={(v) => set("duration", v)}
            options={[{ value: "", label: "Any length" }, ...durationOptions]}
            aria-label="Duration"
            className={styles.select}
          />
        </Section>

        <Section field="color" label="Color">
          <div className={styles.swatches}>
            {COLOR_PRESETS.map((c) => {
              const hex = c.hex.toLowerCase();
              const selected = form.color === hex;
              return (
                <button
                  key={hex}
                  type="button"
                  className={styles.swatch}
                  style={{ background: c.hex }}
                  data-selected={selected || undefined}
                  aria-label={c.label}
                  aria-pressed={selected}
                  onClick={() => set("color", selected ? "" : hex)}
                />
              );
            })}
          </div>
        </Section>

        <Section field="note" label="Note">
          <EnumSelect
            value={form.note}
            onValueChange={(v) => set("note", v)}
            options={noteOptions}
            aria-label="Note"
            className={styles.select}
          />
        </Section>
      </div>

      <Dialog.Footer className={styles.footer}>
        <Button variant="ghost" onClick={() => setForm(EMPTY_FORM)}>
          Clear filters
        </Button>
        <div className={styles.footerEnd}>
          <Dialog.Close render={<Button variant="ghost">Cancel</Button>} />
          <Button variant="primary" onClick={apply}>
            Apply filters
          </Button>
        </div>
      </Dialog.Footer>
    </Dialog.Popup>
  );
}

function optionsFrom(presets: readonly Preset[]): EnumOption<string>[] {
  return presets.map((p) => ({ value: String(p.value), label: p.label }));
}

interface SectionProps {
  field: keyof typeof FIELD_ICONS;
  label: string;
  children: ReactNode;
}

function Section({ field, label, children }: SectionProps) {
  const Icon = FIELD_ICONS[field];
  return (
    <Field.Root className={styles.section}>
      <Field.Label className={styles.sectionLabel}>
        <span className={styles.sectionIcon}>
          <Icon width={15} height={15} />
        </span>
        {label}
      </Field.Label>
      {children}
    </Field.Root>
  );
}
