import { IconCaretRightFill12 as CaretRight } from "@pond/icons/fill/12";
import {
  IconChevronDownOutline12 as ChevronDown,
  IconChevronLeftOutline12 as ChevronLeft,
  IconChevronRightOutline12 as ChevronRight,
} from "@pond/icons/outline/12";
import {
  IconArchiveContent2Outline18 as Archive,
  IconArchivePlusOutline18 as Plus,
  IconRefresh2Outline18 as Refresh,
  IconWindowSettingsOutline18 as Settings,
  IconArrowUpDownTrailOutline18 as Switch,
  IconTagsOutline18 as Tags,
  IconTrash2Outline18 as Trash2,
} from "@pond/icons/outline/18";
import { Button, Menu, Shell, Sidebar, Tooltip } from "@pond/ui";
import { Outlet, useRouter } from "@tanstack/react-router";
import React from "react";
import { Inspector } from "@/components/library/inspector";
import { SidebarSources } from "@/components/library/sidebar-sources";
import { HeaderToolbar } from "@/components/library/toolbar";
import { LayoutMenuBridge } from "@/effects/layout-menu-bridge";
import { usePonds } from "@/lib/hooks/use-ponds";
import { initials } from "@/lib/utils/initials";
import styles from "./styles.module.css";

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

function Switcher() {
  const { ponds, active, switching, switchTo, refresh } = usePonds();

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) refresh();
      }}
    >
      <Menu.Trigger variant="ghost" className={styles.switcher}>
        <span className={styles.logo} />
        {active?.name ?? "Pond"}
        <ChevronDown style={{ marginLeft: "auto" }} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Item>
              <Menu.ItemIcon>
                <Settings />
              </Menu.ItemIcon>
              Settings
              <Menu.SecondaryLabel>G then S</Menu.SecondaryLabel>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item>
              <Menu.ItemIcon>
                <Plus />
              </Menu.ItemIcon>
              Create Pond
              <Menu.SecondaryLabel>P then C</Menu.SecondaryLabel>
            </Menu.Item>
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger>
                <Menu.ItemIcon>
                  <Switch />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Switch Pond</Menu.ItemLabel>
                <CaretRight
                  width={8}
                  height={8}
                  style={{ marginLeft: "auto" }}
                />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner align="start" sideOffset={4}>
                  <Menu.Popup>
                    {ponds.map((pond) => (
                      <Menu.Item
                        key={pond.path}
                        disabled={switching || pond.active || !pond.exists}
                        onClick={() => switchTo(pond.path)}
                      >
                        <span
                          aria-hidden
                          className={styles.avatar}
                          data-emoji={pond.avatar ? true : undefined}
                          data-missing={!pond.exists || undefined}
                        >
                          {pond.avatar ?? initials(pond.name)}
                        </span>
                        <Menu.ItemLabel>{pond.name}</Menu.ItemLabel>
                        {pond.active ? (
                          <span className={styles.dot} aria-hidden />
                        ) : null}
                      </Menu.Item>
                    ))}
                    {ponds.length === 0 ? (
                      <div className={styles.empty}>No ponds yet.</div>
                    ) : null}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            <Menu.Item>
              <Menu.ItemIcon>
                <Refresh />
              </Menu.ItemIcon>
              Reload Pond
              <Menu.SecondaryLabel>P then R</Menu.SecondaryLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
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
              <Switcher />
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
