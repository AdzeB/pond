import {
  IconChartPieOutline18,
  IconFolderOutline18,
  IconImageOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import { getSourceIcon } from "@/lib/save/sources-registry";
import { listBaseFromPath } from "@/lib/search/schemas";
import type { Save } from "@/lib/types";
import { saveIdFromPath } from "@/lib/ui/save-nav";

type TabIcon = React.ComponentType<{ width?: number; height?: number }>;

const ROUTE_ICONS: Record<string, TabIcon> = {
  "/": IconImageOutline18,
  "/sources": IconFolderOutline18,
  "/analytics": IconChartPieOutline18,
  "/trash": IconTrash2Outline18,
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

  if (clean.startsWith("/analytics")) return IconChartPieOutline18;

  const source = sourceIcon(clean);
  if (source) return source;

  return IconImageOutline18;
}

export function iconForTab(path: string, save: Save | undefined): TabIcon {
  if (save) {
    const icon = getSourceIcon(save.source);
    if (icon) return icon;
    return IconImageOutline18;
  }
  if (saveIdFromPath(path.split("?")[0] ?? path)) return IconImageOutline18;
  return iconForPath(path);
}
