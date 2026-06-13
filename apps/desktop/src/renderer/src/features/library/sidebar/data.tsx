import {
  IconArchiveContent2Fill18 as Archive,
  IconClockFill18 as Clock,
  IconTagSlashFill18 as TagSlash,
  IconTrash2Fill18 as Trash2,
} from "@pond/icons/fill/18";
import type { ReactNode } from "react";
import type { SaveListMode } from "@/features/library/lib/save-list";

interface NavItem {
  key: "library" | "untagged" | "recents" | "trash";
  mode: Extract<SaveListMode, "library" | "untagged" | "recents" | "trash">;
  path: "/" | "/$mode";
  params: { mode: string } | undefined;
  icon: ReactNode;
  label: string;
}

const navItems: readonly NavItem[] = [
  {
    key: "library",
    mode: "library",
    path: "/",
    params: undefined,
    icon: <Archive />,
    label: "Library",
  },
  {
    key: "untagged",
    mode: "untagged",
    path: "/$mode",
    params: { mode: "untagged" },
    icon: <TagSlash />,
    label: "Untagged",
  },
  {
    key: "recents",
    mode: "recents",
    path: "/$mode",
    params: { mode: "recents" },
    icon: <Clock />,
    label: "Recently Used",
  },
  {
    key: "trash",
    mode: "trash",
    path: "/$mode",
    params: { mode: "trash" },
    icon: <Trash2 />,
    label: "Trash",
  },
] as const;

export type { NavItem };

export { navItems };
