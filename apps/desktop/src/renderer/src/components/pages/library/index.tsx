import {
  IconArchiveContent2Fill18 as Archive,
  IconArchivePlusFill18 as Plus,
  IconWindowSettingsFill18 as Settings,
  IconTagsFill18 as Tags,
  IconTrash2Fill18 as Trash2,
} from "@pond/icons/fill/18";
import {
  IconChevronLeftOutline12 as ChevronLeft,
  IconChevronRightOutline12 as ChevronRight,
} from "@pond/icons/outline/12";
import { Button, Shell, Sidebar, Tooltip } from "@pond/ui";
import { Outlet, useRouter } from "@tanstack/react-router";
import React from "react";
import { Inspector } from "@/components/library/inspector";
import { SidebarSources } from "@/components/library/sidebar-sources";
import { HeaderToolbar } from "@/components/library/toolbar";
import { PondSwitcher } from "@/components/menus/pond-switcher";
import { LayoutMenuBridge } from "@/effects/layout-menu-bridge";

function Backwards() {
  const router = useRouter();

  return (
    <Tooltip label="Back" side="bottom">
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Back"
        onClick={() => router.history.back()}
      >
        <ChevronLeft />
      </Button>
    </Tooltip>
  );
}

function Forwards() {
  const router = useRouter();

  return (
    <Tooltip label="Forward" side="bottom">
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Forward"
        onClick={() => router.history.forward()}
      >
        <ChevronRight />
      </Button>
    </Tooltip>
  );
}

function New() {
  return (
    <Button icon size="sm" aria-label="New" onClick={() => {}}>
      <Plus />
    </Button>
  );
}

interface Route {
  path: string;
  params?: Record<string, string>;
  icon: React.ReactNode;
  label: string;
}

const routes: Route[] = [
  {
    path: "/",
    icon: <Archive />,
    label: "Library",
  },
  {
    path: "/tags",
    icon: <Tags />,
    label: "Tags",
  },
  {
    path: "/$mode",
    params: { mode: "trash" },
    icon: <Trash2 />,
    label: "Trash",
  },
  {
    path: "/settings",

    icon: <Settings />,
    label: "Settings",
  },
];

export function Library() {
  return (
    <React.Fragment>
      <Shell.Aside>
        <Sidebar.Provider>
          <Sidebar.Root>
            <Sidebar.Toolbar>
              <Backwards />
              <Forwards />
            </Sidebar.Toolbar>
            <Sidebar.Header>
              <PondSwitcher />
              <New />
            </Sidebar.Header>
            <Sidebar.Group>
              {routes.map((route) => (
                <Sidebar.Anchor
                  key={route.path}
                  to={route.path}
                  params={route.params}
                >
                  <Sidebar.Icon>{route.icon}</Sidebar.Icon>
                  {route.label}
                </Sidebar.Anchor>
              ))}
            </Sidebar.Group>
            <SidebarSources />
          </Sidebar.Root>
        </Sidebar.Provider>
      </Shell.Aside>
      <Shell.Main>
        <Shell.Header>
          <HeaderToolbar />
        </Shell.Header>
        <LayoutMenuBridge />
        <Outlet />
      </Shell.Main>
      <Shell.Aside>
        <Inspector />
      </Shell.Aside>
    </React.Fragment>
  );
}
