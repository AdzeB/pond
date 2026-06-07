import {
  IconCalendarFill18 as Calendar,
  IconFileFill18 as FileIcon,
  IconLinkFill18 as LinkIcon,
  IconColorPaletteFill18 as Palette,
  IconPencilFill18 as Pencil,
  IconRulerFill18 as Ruler,
  IconScaleFill18 as Scale,
  IconShapesFill18 as Shapes,
  IconTagFill18 as Tag,
  IconStopwatchFill18 as Timer,
  IconUploadFill18 as Upload,
  IconUserFill18 as User,
} from "@pond/icons/fill/18";
import type { FieldId } from "@pond/schema/filters/types";
import type { ComponentType } from "react";

type IconType = ComponentType<{
  width?: string | number;
  height?: string | number;
}>;

interface FieldUi {
  icon: IconType;
}

export const FIELD_UI: Record<FieldId, FieldUi> = {
  tags: { icon: Tag },
  source: { icon: LinkIcon },
  type: { icon: FileIcon },
  shape: { icon: Shapes },
  size: { icon: Scale },
  duration: { icon: Timer },
  dimensions: { icon: Ruler },
  creator: { icon: User },
  note: { icon: Pencil },
  color: { icon: Palette },
  savedAt: { icon: Upload },
  publishedAt: { icon: Calendar },
  modifiedAt: { icon: Calendar },
};
