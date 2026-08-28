import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SECTION_ICONS_FILL } from "@/lib/ui/section-icons";

export type DockTab = "library" | "sources" | "trash" | "downloads";

interface NavTab {
  id: DockTab;
  label: string;
  to?: LinkProps["to"];
  params?: LinkProps["params"];
  action?: () => void;
  icon: ReactNode;
  match: (pathname: string) => boolean;
}

export const NAV_TABS: readonly NavTab[] = [
  {
    id: "library",
    label: "Library",
    to: "/",
    icon: <SECTION_ICONS_FILL.library />,
    match: (p) => p === "/" || p.startsWith("/save/"),
  },
  {
    id: "trash",
    label: "Trash",
    to: "/$mode",
    params: { mode: "trash" },
    icon: <SECTION_ICONS_FILL.trash />,
    match: (p) => p === "/trash",
  },
  {
    id: "sources",
    label: "Sources",
    to: "/sources",
    icon: <SECTION_ICONS_FILL.sources />,
    match: (p) => p === "/sources",
  },
  {
    id: "downloads",
    label: "Downloads",
    to: "/downloads",
    icon: <SECTION_ICONS_FILL.downloads />,
    match: (p) => p === "/downloads",
  },
] as const;
