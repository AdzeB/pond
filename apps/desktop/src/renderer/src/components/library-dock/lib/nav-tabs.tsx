import {
  IconChartFill18 as Analytics,
  IconArchiveContent2Fill18 as Library,
  IconGlobeFill18 as Sources,
  IconTrash2ContentFill18 as Trash,
} from "@pond/icons/fill/18";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

export type DockTab = "library" | "sources" | "analytics" | "trash";

interface NavTab {
  id: DockTab;
  label: string;
  to?: LinkProps["to"];
  params?: LinkProps["params"];
  /** Tabs that open an overlay instead of navigating. */
  action?: () => void;
  icon: ReactNode;
  match: (pathname: string) => boolean;
}

export const NAV_TABS: readonly NavTab[] = [
  {
    id: "library",
    label: "Library",
    to: "/",
    icon: <Library />,
    match: (p) => p === "/" || p.startsWith("/save/"),
  },
  {
    id: "trash",
    label: "Trash",
    to: "/$mode",
    params: { mode: "trash" },
    icon: <Trash />,
    match: (p) => p === "/trash",
  },
  {
    id: "sources",
    label: "Sources",
    to: "/sources",
    icon: <Sources />,
    match: (p) => p === "/sources",
  },
  {
    id: "analytics",
    label: "Analytics",
    to: "/analytics",
    icon: <Analytics />,
    match: (p) => p === "/analytics" || p.startsWith("/analytics/"),
  },
] as const;
