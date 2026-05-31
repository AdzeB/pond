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
