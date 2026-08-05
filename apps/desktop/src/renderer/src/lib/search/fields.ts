import {
  IconGridLayoutRowsFill18 as AspectIcon,
  IconCalendarFill18 as Calendar,
  IconChatBubbleFill18 as Caption,
  IconFileFill18 as FileIcon,
  IconCloneFill18 as FilesIcon,
  IconLink2Fill18 as LinkIcon,
  IconMicrophoneFill18 as Mic,
  IconColorPaletteFill18 as Palette,
  IconPencilFill18 as Pencil,
  IconGridLayoutColsFill18 as ShapeIcon,
  IconTagFill18 as Tag,
  IconStopwatchFill18 as Timer,
  IconUploadFill18 as Upload,
  IconUserFill18 as User,
} from "@pond/icons/fill/18";
import { COLOR_PRESETS } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import type {
  ComparatorId,
  FieldId,
  Predicate,
} from "@pond/schema/filters/types";
import type { ComponentType } from "react";
import { DATE_PRESETS, serializePredicate } from "@/lib/search/syntax";

type FieldIcon = ComponentType<{
  width?: string | number;
  height?: string | number;
}>;

/** Shared by the suggestion list and chips. */
export const FIELD_ICONS: Record<FieldId, FieldIcon> = {
  tags: Tag,
  source: LinkIcon,
  type: FileIcon,
  fileCount: FilesIcon,
  duration: Timer,
  shape: ShapeIcon,
  aspect: AspectIcon,
  creator: User,
  account: User,
  note: Pencil,
  caption: Caption,
  transcript: Mic,
  color: Palette,
  savedAt: Upload,
  publishedAt: Calendar,
  modifiedAt: Calendar,
};

export const FIELD_HINTS: Partial<Record<FieldId, string>> = {
  tags: "any tag",
  source: "dribbble.com, instagram.com, local",
  type: "image, video, link, text",
  fileCount: "3, >2, 2..5",
  duration: "<30s, <3min",
  shape: "square, landscape, portrait, panoramic-landscape",
  aspect: "1:1, 4:3, 3:4, 16:9, 9:16",
  creator: "by name",
  account: "@handle",
  note: "with, without",
  caption: "with, without",
  transcript: "with, without",
  color: "red, #ff0000",
  savedAt: "past-week, 2024-01-01",
  publishedAt: "past-week, 2024-01-01",
  modifiedAt: "past-week, 2024-01-01",
};

const COMPARATOR_SYMBOL: Partial<Record<ComparatorId, string>> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  neq: "≠",
};

interface PredicateChip {
  icon: FieldIcon;
  label: string;
  title: string;
  swatch?: string;
  negated: boolean;
}

function dateLabel(value: unknown): string {
  const text = String(value ?? "");
  const preset = DATE_PRESETS.find((d) => d.iso === text);
  return preset ? preset.label : text;
}

function isDatePreset(value: unknown): boolean {
  return DATE_PRESETS.some((d) => d.iso === String(value ?? ""));
}

/** Date fields share a calendar glyph, so chips need the field name; the "Date " prefix is dropped to keep them short. */
function shortDateField(field: FieldId): string {
  return FIELD_META[field].label.replace(/^Date\s+/i, "");
}

/** The field icon carries the "what" and the label the "value", so chips stay short. */
export function describePredicate(predicate: Predicate): PredicateChip {
  const { field, operator, value } = predicate;
  const meta = FIELD_META[field];
  const icon = FIELD_ICONS[field];
  const title = serializePredicate(predicate) ?? meta.label;

  const base: Omit<PredicateChip, "label" | "negated"> & {
    label?: string;
    negated?: boolean;
  } = { icon, title };

  switch (meta.type) {
    case "enum": {
      const negated = operator === "neq" || operator === "nin";
      const list = (Array.isArray(value) ? value : [value]).map(String);
      return { ...base, label: list.join(", "), negated };
    }
    case "stringArray": {
      const negated = operator === "none";
      const list = (Array.isArray(value) ? value : [value]).map(String);
      return { ...base, label: list.join(", "), negated };
    }
    case "optional": {
      const has = value !== false;
      const noun = meta.label.toLowerCase();
      return {
        ...base,
        label: has ? `has ${noun}` : `no ${noun}`,
        negated: !has,
      };
    }
    case "color": {
      const hex = String(value ?? "");
      const preset = COLOR_PRESETS.find(
        (c) => c.hex.toLowerCase() === hex.toLowerCase(),
      );
      return {
        ...base,
        label: preset ? preset.label : hex,
        swatch: hex,
        negated: false,
      };
    }
    case "number": {
      if (operator === "between" && Array.isArray(value)) {
        return { ...base, label: `${value[0]}–${value[1]}`, negated: false };
      }
      const sym = COMPARATOR_SYMBOL[operator];
      return {
        ...base,
        label: sym ? `${sym} ${value}` : String(value),
        negated: operator === "neq",
      };
    }
    case "date": {
      const name = shortDateField(field);
      if (operator === "between" && Array.isArray(value)) {
        return {
          ...base,
          label: `${name} · ${dateLabel(value[0])}–${dateLabel(value[1])}`,
          negated: false,
        };
      }
      const sym = COMPARATOR_SYMBOL[operator];
      const text = dateLabel(value);
      /** A bare preset (operator "gte") already implies a range, so only explicit comparators or raw dates get a symbol. */
      const valuePart =
        sym && !(operator === "gte" && isDatePreset(value))
          ? `${sym} ${text}`
          : text;
      return {
        ...base,
        label: `${name} · ${valuePart}`,
        negated: false,
      };
    }
    default:
      return { ...base, label: String(value ?? ""), negated: false };
  }
}
