import {
  IconCircleUserOutline18 as Account,
  IconApertureOutline18 as ApertureIcon,
  IconGridLayoutRowsOutline18 as AspectIcon,
  IconCalendarCheckOutline18 as CalendarCheck,
  IconCalendarDateOutline18 as CalendarDate,
  IconCalendarPenOutline18 as CalendarPen,
  IconCalendarPlusOutline18 as CalendarPlus,
  IconCameraOutline18 as CameraMakeIcon,
  IconCamera2Outline18 as CameraModelIcon,
  IconChatBubbleOutline18 as Caption,
  IconMsg2Outline18 as Comment,
  IconFileOutline18 as FileIcon,
  IconClone2Outline18 as FilesIcon,
  IconFocusOutline18 as FocalLengthIcon,
  IconFolderOutline18 as FolderIcon,
  IconSpellCheckOutline18 as FontActivatedIcon,
  IconDesignFileOutline18 as FormatIcon,
  IconHeading1Outline18 as Heading,
  IconVectorOutline18 as HeightIcon,
  IconEyeLensOutline18 as LensIcon,
  IconLink2Outline18 as LinkIcon,
  IconListFavsOutline18 as ListIcon,
  IconMicrophoneOutline18 as Mic,
  IconMusicOutline18 as Music,
  IconGridLayoutColsOutline18 as OrientationIcon,
  IconColorPaletteOutline18 as Palette,
  IconPencilOutline18 as Pencil,
  IconShieldCheckOutline18 as SafetyIcon,
  IconCameraSparkleOutline18 as SensitivityIcon,
  IconServerOutline18 as SizeIcon,
  IconStarOutline18 as Star,
  IconBookmarkOutline18 as Tag,
  IconTextOutline18 as TextIcon,
  IconStopwatchOutline18 as Timer,
  IconGlobeOutline18 as UrlIcon,
  IconUserOutline18 as User,
  IconImageOutline18 as WidthIcon,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import { COLOR_PRESETS, readColorMatch } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import type {
  ComparatorId,
  FieldId,
  Predicate,
} from "@pond/schema/filters/types";
import { accountChipLabel } from "@/features/search/lib/account-aliases";
import { DATE_PRESETS, serializePredicate } from "@/features/search/lib/syntax";

const orientationField = "shape";
const FIELD_ICONS = {
  title: Heading,
  tags: Tag,
  folder: FolderIcon,
  list: ListIcon,
  source: LinkIcon,
  type: FileIcon,
  format: FormatIcon,
  fileCount: FilesIcon,
  duration: Timer,
  fontFamily: TextIcon,
  fontActivated: FontActivatedIcon,
  bpm: Music,
  cameraMake: CameraMakeIcon,
  cameraModel: CameraModelIcon,
  lensModel: LensIcon,
  focalLength: FocalLengthIcon,
  aperture: ApertureIcon,
  iso: SensitivityIcon,
  [orientationField]: OrientationIcon,
  aspect: AspectIcon,
  creator: User,
  account: Account,
  note: Pencil,
  caption: Caption,
  transcript: Mic,
  sensitiveContent: SafetyIcon,
  color: Palette,
  savedAt: CalendarPlus,
  publishedAt: CalendarCheck,
  modifiedAt: CalendarPen,
  takenAt: CalendarDate,
  rating: Star,
  fileSize: SizeIcon,
  width: WidthIcon,
  height: HeightIcon,
  url: UrlIcon,
  comment: Comment,
} satisfies Record<FieldId, IconComponent>;
export function fieldIcon(field: FieldId): IconComponent {
  return FIELD_ICONS[field];
}

const COMPARATOR_SYMBOL = new Map<ComparatorId, string>([
  ["gt", ">"],
  ["gte", "≥"],
  ["lt", "<"],
  ["lte", "≤"],
  ["neq", "≠"],
]);

interface PredicateChip {
  icon: IconComponent;
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
