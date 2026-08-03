import { getSourceIcon } from "@/lib/save/sources-registry";
import { listBaseFromPath } from "@/lib/search/schemas";
import type { Save } from "@/lib/types";
import { saveIdFromPath } from "@/lib/ui/save-nav";
import { SECTION_ICONS } from "@/lib/ui/section-icons";

type TabIcon = React.ComponentType<{ width?: number; height?: number }>;

const ROUTE_ICONS: Record<string, TabIcon> = {
  "/": SECTION_ICONS.library,
  "/sources": SECTION_ICONS.sources,
  "/analytics": SECTION_ICONS.analytics,
  "/trash": SECTION_ICONS.trash,
};

function sourceIcon(path: string): TabIcon | null {
  const m = path.match(/^\/source\/([^/?]+)/);
  if (!m) return null;
  return getSourceIcon(m[1]!) ?? null;
}

export function iconForPath(path: string): TabIcon {
  const clean = listBaseFromPath(path.split("?")[0] ?? path);

  const exact = ROUTE_ICONS[clean];
  if (exact) return exact;

  if (clean.startsWith("/analytics")) return SECTION_ICONS.analytics;

  const source = sourceIcon(clean);
  if (source) return source;

  return SECTION_ICONS.library;
}

export function iconForTab(path: string, save: Save | undefined): TabIcon {
  if (save) {
    const icon = getSourceIcon(save.source);
    if (icon) return icon;
    return SECTION_ICONS.library;
  }
  if (saveIdFromPath(path.split("?")[0] ?? path)) return SECTION_ICONS.library;
  return iconForPath(path);
}
