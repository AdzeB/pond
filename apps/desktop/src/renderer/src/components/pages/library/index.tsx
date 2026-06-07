import {
  IconChevronLeftOutline12 as ChevronLeft,
  IconChevronRightOutline12 as ChevronRight,
} from "@pond/icons/outline/12";
import {
  IconArchiveContent2Outline18 as Archive,
  IconArchivePlusOutline18 as Plus,
  IconWindowSettingsOutline18 as Settings,
  IconTagsOutline18 as Tags,
  IconTrash2Outline18 as Trash2,
} from "@pond/icons/outline/18";
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
              <Sidebar.Anchor to="/">
                <Sidebar.Icon>
                  <Archive />
                </Sidebar.Icon>
                Library
              </Sidebar.Anchor>
              <Sidebar.Anchor to="/tags">
                <Sidebar.Icon>
                  <Tags />
                </Sidebar.Icon>
                Tags
              </Sidebar.Anchor>
              <Sidebar.Anchor to="/$mode" params={{ mode: "trash" }}>
                <Sidebar.Icon>
                  <Trash2 />
                </Sidebar.Icon>
                Trash
              </Sidebar.Anchor>
              <Sidebar.Anchor to="/settings">
                <Sidebar.Icon>
                  <Settings />
                </Sidebar.Icon>
                Settings
              </Sidebar.Anchor>
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
