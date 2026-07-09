import {
  IconChartActivity2Fill18 as Analytics,
  IconArchiveContent2Fill18 as Library,
  IconTrash2ContentFill18 as Trash,
} from "@pond/icons/fill/18";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

// "sources" is a dock view (the sources tray), not a route — it lives in
// DockTab so previews can still mark it active, but not in NAV_TABS.
export type DockTab =
  | "library"
  | "sources"
  | "analytics"
  | "trash"
  | "settings";

interface NavTab {
  id: DockTab;
  label: string;
  to: LinkProps["to"];
  params?: LinkProps["params"];
  icon: ReactNode;
  match: (pathname: string) => boolean;
}

export const NAV_TABS: readonly NavTab[] = [
  {
    id: "library",
    label: "Library",
    to: "/",
    icon: <Library />,
    match: (p) => p === "/",
  },
  {
    id: "analytics",
    label: "Analytics",
    to: "/analytics",
    icon: <Analytics />,
    match: (p) => p === "/analytics",
  },
  {
    id: "trash",
    label: "Trash",
    to: "/$mode",
    params: { mode: "trash" },
    icon: <Trash />,
    match: (p) => p === "/trash",
  },
] as const;
