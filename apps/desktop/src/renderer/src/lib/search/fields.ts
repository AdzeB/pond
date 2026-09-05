import {
  IconGridLayoutRowsOutline18 as AspectIcon,
  IconCalendarOutline18 as Calendar,
  IconChatBubbleOutline18 as Caption,
  IconMsg2Outline18 as Comment,
  IconFileOutline18 as FileIcon,
  IconClone2Outline18 as FilesIcon,
  IconFolderOutline18 as FolderIcon,
  IconVectorOutline18 as HeightIcon,
  IconLink2Outline18 as LinkIcon,
  IconListFavsOutline18 as ListIcon,
  IconMicrophoneOutline18 as Mic,
  IconColorPaletteOutline18 as Palette,
  IconPencilOutline18 as Pencil,
  IconGridLayoutColsOutline18 as ShapeIcon,
  IconServerOutline18 as SizeIcon,
  IconStarOutline18 as Star,
  IconTagOutline18 as Tag,
  IconStopwatchOutline18 as Timer,
  IconUploadOutline18 as Upload,
  IconGlobeOutline18 as UrlIcon,
  IconUserOutline18 as User,
  IconImageOutline18 as WidthIcon,
} from "@pond/icons/outline/18";
import { COLOR_PRESETS, readColorMatch } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import type {
  ComparatorId,
  FieldId,
  Predicate,
} from "@pond/schema/filters/types";
import type { ComponentType } from "react";
import { accountChipLabel } from "@/lib/search/account-aliases";
import { DATE_PRESETS, serializePredicate } from "@/lib/search/syntax";

type FieldIcon = ComponentType<{
  width?: string | number;
  height?: string | number;
}>;

export const FIELD_ICONS = {
  tags: Tag,
  folder: FolderIcon,
  list: ListIcon,
  source: LinkIcon,
  type: FileIcon,
  format: FileIcon,
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
  rating: Star,
  fileSize: SizeIcon,
  width: WidthIcon,
  height: HeightIcon,
  url: UrlIcon,
  comment: Comment,
} satisfies Record<FieldId, FieldIcon>;

export const FIELD_HINTS = {
  tags: "any tag",
  folder: "any folder",
  list: "liked, saved",
  source: "dribbble.com, instagram.com, local",
  type: "image, video, link, text",
  format: "jpg, png, mp4, pdf",
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
  rating: "0, 3, 5",
  fileSize: "<1mb, >10mb",
  width: ">1920",
  height: ">1080",
  url: "youtube.com",
  comment: "with, without",
} satisfies Partial<Record<FieldId, string>>;

const COMPARATOR_SYMBOL = new Map<ComparatorId, string>([
  ["gt", ">"],
  ["gte", "≥"],
  ["lt", "<"],
  ["lte", "≤"],
  ["neq", "≠"],
]);

interface PredicateChip {
  icon: FieldIcon;
  label: string;
  title: string;
  swatch?: string;
  negated: boolean;
}

function dateLabel(iso: string): string {
  const preset = DATE_PRESETS.find((d) => d.iso === iso);
  return preset ? preset.label : iso;
}

function isDatePreset(iso: string): boolean {
  return DATE_PRESETS.some((d) => d.iso === iso);
}

function shortDateField(field: FieldId): string {
  return FIELD_META[field].label.replace(/^Date\s+/i, "");
}

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
      const list = (Array.isArray(value) ? value : [value]).map((v) =>
        field === "account" ? accountChipLabel(String(v)) : String(v),
      );
      return { ...base, label: list.join(", "), negated };
    }
    case "stringArray": {
      const negated = operator === "none";
      const list = (Array.isArray(value) ? value : [value]).map((v) => {
        const preset = meta.presets?.find((p) => String(p.value) === String(v));
        return preset?.label ?? String(v);
      });
      return { ...base, label: list.join(", "), negated };
    }
    case "optional": {
      if (operator === "contains")
        return {
          ...base,
          label: `${meta.label}: ${String(value)}`,
          negated: false,
        };
      const has = value !== false;
      const noun = meta.label.toLowerCase();
      return {
        ...base,
        label: has ? `has ${noun}` : `no ${noun}`,
        negated: !has,
      };
    }
    case "color": {
      const hex = readColorMatch(value)?.hex ?? "";
      const preset = COLOR_PRESETS.find(
        (c) => c.hex.toLowerCase() === hex.toLowerCase(),
      );
      return {
        ...base,
        label: preset ? preset.label : hex,
        swatch: hex,
        negated: Boolean(predicate.negate),
      };
    }
    case "number": {
      if (operator === "between" && Array.isArray(value)) {
        return { ...base, label: `${value[0]}–${value[1]}`, negated: false };
      }
      const sym = COMPARATOR_SYMBOL.get(operator);
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
          label: `${name} · ${dateLabel(String(value[0] ?? ""))}–${dateLabel(String(value[1] ?? ""))}`,
          negated: false,
        };
      }
      const iso = String(value ?? "");
      const sym = COMPARATOR_SYMBOL.get(operator);
      const text = dateLabel(iso);
      const valuePart =
        sym && !(operator === "gte" && isDatePreset(iso))
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
