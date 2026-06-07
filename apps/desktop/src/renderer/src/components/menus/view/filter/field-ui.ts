import {
  IconCalendarOutline18 as Calendar,
  IconFileOutline18 as FileIcon,
  IconLinkOutline18 as LinkIcon,
  IconColorPaletteOutline18 as Palette,
  IconPencilOutline18 as Pencil,
  IconRulerOutline18 as Ruler,
  IconScaleOutline18 as Scale,
  IconShapesOutline18 as Shapes,
  IconTagOutline18 as Tag,
  IconStopwatchOutline18 as Timer,
  IconUploadOutline18 as Upload,
  IconUserOutline18 as User,
} from "@pond/icons/outline/18";
import type { FieldId } from "@pond/schema/filters/types";
import type { ComponentType } from "react";

type IconType = ComponentType<{
  width?: string | number;
  height?: string | number;
}>;

interface FieldUi {
  icon: IconType;
}

// Renderer-side presentation for each filter field. The schema package stays
// framework-free, so icons live here keyed by the same FieldId union.
export const FIELD_UI: Record<FieldId, FieldUi> = {
  tags: { icon: Tag },
  source: { icon: LinkIcon },
  type: { icon: FileIcon },
  shape: { icon: Shapes },
  size: { icon: Scale },
  duration: { icon: Timer },
  dimensions: { icon: Ruler },
  creator: { icon: User },
  url: { icon: LinkIcon },
  note: { icon: Pencil },
  color: { icon: Palette },
  savedAt: { icon: Upload },
  publishedAt: { icon: Calendar },
  modifiedAt: { icon: Calendar },
};
