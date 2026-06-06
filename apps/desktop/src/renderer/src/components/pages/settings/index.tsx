import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconChevronRightOutline18 as ChevronRight,
  IconClockRotateAnticlockwiseOutline18 as History,
} from "@pond/icons/outline/18";
import { Button, Menu, Shell, Sidebar, Tooltip } from "@pond/ui";
import { Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import React from "react";
import {
  DEV_GROUPS,
  GROUP_LABELS,
  GROUP_ORDER,
  sectionsByGroup,
} from "@/components/settings/registry";
import { useRecents } from "@/lib/stores/recents";
import { pool } from "@/pool/pool";
import { usePrefs } from "@/pool/prefs";

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

function Recents() {
  const navigate = useNavigate();

  const recents = useRecents();

  const rows = recents.flatMap((entry) => {
    const save = pool.get(entry.saveId);
    return save ? [{ entry, save }] : [];
  });

  return (
    <Menu.Root>
      <Tooltip label="Recently viewed" side="bottom">
        <Menu.Trigger
          icon
          size="sm"
          variant="ghost"
          aria-label="Recently Viewed"
        >
          <History />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup>
            <Menu.Group>
              <Menu.GroupLabel>Recently viewed</Menu.GroupLabel>
              {rows.length === 0 ? (
                <Menu.Item disabled>Nothing yet</Menu.Item>
              ) : (
                rows.map(({ entry, save }) => (
                  <Menu.Item
                    key={entry.saveId}
                    onClick={() =>
                      void navigate({ to: `/save/${entry.saveId}` })
                    }
                  >
                    <Menu.ItemLabel>
                      {save.title?.trim() || save.url || "Untitled save"}
                    </Menu.ItemLabel>
                    {save.source ? (
                      <Menu.ItemLabel>{save.source}</Menu.ItemLabel>
                    ) : null}
                  </Menu.Item>
                ))
              )}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function Settings() {
  const [developer] = usePrefs("developer");
  const developerMode = developer.developerMode === true;

  return (
    <React.Fragment>
      <Shell.Aside>
        <Sidebar.Provider>
          <Sidebar.Root aria-label="Settings">
            <Sidebar.Toolbar>
              <Backwards />
              <Forwards />
              <Recents />
            </Sidebar.Toolbar>

            <Sidebar.Anchor to="/">
              <Sidebar.Icon>
                <ChevronLeft />
              </Sidebar.Icon>
              Library
            </Sidebar.Anchor>

            {GROUP_ORDER.flatMap((group) => {
              if (DEV_GROUPS.includes(group) && !developerMode) return [];
              const items = sectionsByGroup(group);
              if (items.length === 0) return [];
              const label = GROUP_LABELS[group];
              return [
                <Sidebar.Group key={group}>
                  {label ? (
                    <Sidebar.GroupHeader>{label}</Sidebar.GroupHeader>
                  ) : null}
                  {items.map((section) => (
                    <Sidebar.Anchor
                      key={section.id}
                      to={`/settings/$section`}
                      params={{ section: section.path }}
                    >
                      <Sidebar.Icon>
                        <section.icon width={14} height={14} />
                      </Sidebar.Icon>
                      {section.label}
                    </Sidebar.Anchor>
                  ))}
                </Sidebar.Group>,
              ];
            })}
          </Sidebar.Root>
        </Sidebar.Provider>
      </Shell.Aside>
      <Shell.Main>
        <Outlet />
      </Shell.Main>
    </React.Fragment>
  );
}
