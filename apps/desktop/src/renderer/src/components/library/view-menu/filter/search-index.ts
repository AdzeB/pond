import type { FieldId } from "@pond/schema/filters/types";
import {
  Calendar,
  File as FileIcon,
  Link as LinkIcon,
  Palette,
  Pencil,
  Ruler,
  Scale,
  Shapes,
  Tag,
  Timer,
  Upload,
  User,
} from "lucide-react";
import type { ComponentType } from "react";

type IconType = ComponentType<{
  width?: string | number;
  height?: string | number;
}>;

export const FIELD_ICONS: Record<FieldId, IconType> = {
  tags: Tag,
  source: LinkIcon,
  type: FileIcon,
  shape: Shapes,
  size: Scale,
  duration: Timer,
  dimensions: Ruler,
  creator: User,
  url: LinkIcon,
  note: Pencil,
  color: Palette,
  savedAt: Upload,
  publishedAt: Calendar,
  modifiedAt: Calendar,
};
