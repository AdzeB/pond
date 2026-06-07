import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconChevronRightOutline18 as ChevronRight,
} from "@pond/icons/outline/18";
import { Button, Shell, Sidebar, Tooltip } from "@pond/ui";
import { Outlet, useRouter } from "@tanstack/react-router";
import React from "react";
import { Recents } from "@/components/menus/recents";
import {
  DEV_GROUPS,
  GROUP_LABELS,
  GROUP_ORDER,
  sectionsByGroup,
} from "@/components/settings/registry";
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
                    <Sidebar.GroupLabel>{label}</Sidebar.GroupLabel>
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
