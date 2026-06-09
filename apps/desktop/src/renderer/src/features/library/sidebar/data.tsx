import {
  IconArchiveContent2Fill18 as Archive,
  IconPuzzlePieceFill18 as Extension,
  IconGearFill18 as Settings,
  IconInboxStackFill18 as Sources,
  IconTrash2Fill18 as Trash2,
} from "@pond/icons/fill/18";

const routes = {
  main: {
    id: "main",
    routes: [
      {
        path: "/",
        params: undefined,
        icon: <Archive />,
        label: "Library",
      },
      {
        path: "/$mode",
        params: { mode: "recents" },
        icon: <Sources />,
        label: "Recents",
      },
      {
        path: "/$mode",
        params: { mode: "trash" },
        icon: <Trash2 />,
        label: "Trash",
      },
    ],
  },
  extra: {
    id: "extra",
    routes: [
      {
        path: "/extension",
        params: undefined,
        icon: <Extension />,
        label: "Extension",
      },
      {
        path: "/settings",
        params: undefined,
        icon: <Settings />,
        label: "Settings",
      },
    ],
  },
} as const;

type SidebarRoutes = typeof routes;

export type { SidebarRoutes };

export { routes };
