import {
  IconArchiveContent2Fill18 as Archive,
  IconUserFill18 as Contact,
  IconWindowDownloadFill18 as Download,
  IconKeyboardFill18 as Keyboard,
  IconOpenInBrowserFill18 as OpenBrowser,
  IconArchivePlusFill18 as Plus,
  IconGearFill18 as Settings,
  IconTagsFill18 as Tags,
  IconTrash2Fill18 as Trash2,
} from "@pond/icons/fill/18";
import {
  IconChevronLeftOutline12 as ChevronLeft,
  IconChevronRightOutline12 as ChevronRight,
  IconAlertQuestionOutline12 as Question,
} from "@pond/icons/outline/12";
import {
  IconDiscord as Discord,
  IconGithub as Github,
  IconXTwitter as Twitter,
} from "@pond/icons/social-media";
import { Button, Menu, Sidebar, Tooltip } from "@pond/ui";
import { useRouter } from "@tanstack/react-router";
import type React from "react";
import { useMemo } from "react";
import { SidebarSources } from "@/components/library/sidebar-sources";
import { PondSwitcher } from "@/components/menus/pond-switcher";
import { useSaves } from "@/pool/hooks";
import { useTags } from "@/pool/tags";

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
];

const social = [
  {
    icon: <Twitter />,
    label: "Twitter",
    secondaryLabel: "G then T",
  },
  {
    icon: <Github />,
    label: "Github",
    secondaryLabel: "G then G",
  },
  {
    icon: <Discord />,
    label: "Discord",
    secondaryLabel: "G then D",
  },
];

export function Library() {
  const router = useRouter();
  const saves = useSaves();
  const tags = useTags();

  const routeCounts = useMemo<Record<string, number>>(() => {
    let library = 0;
    let trash = 0;
    for (const save of saves) {
      if (save.deletedAt) {
        trash++;
        continue;
      }
      if (save.status !== "complete") continue;
      library++;
    }
    return {
      Library: library,
      Tags: tags.length,
      Trash: trash,
    };
  }, [saves, tags]);

  const app = [
    {
      icon: <OpenBrowser />,
      label: "Open Website",
      secondaryLabel: "G then A",
      action: () => {
        window.open("https://www.pond.so", "_blank");
      },
    },
    {
      icon: <Download />,
      label: "Download Extension",
      secondaryLabel: "G then H",
      action: () => {
        window.open("https://www.pond.so/extension", "_blank");
      },
    },
  ];

  const help = [
    {
      icon: <Keyboard />,
      label: "Keyboard Shortcuts",
      secondaryLabel: "G then K",
      action: () => {
        window.open("https://www.pond.so/keyboard-shortcuts", "_blank");
      },
    },
    {
      icon: <Settings />,
      label: "Settings",
      secondaryLabel: "G then S",
      action: () => {
        router.navigate({ to: "/settings" });
      },
    },
    {
      icon: <Contact />,
      label: "Contact Us",
      secondaryLabel: "G then H",
    },
  ];

  return (
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
          {routes.map((route) => {
            const count = routeCounts[route.label] ?? 0;
            return (
              <Sidebar.Anchor
                key={route.path}
                to={route.path}
                params={route.params}
              >
                <Sidebar.Icon>{route.icon}</Sidebar.Icon>
                {route.label}
                {count > 0 ? <Sidebar.Count>{count}</Sidebar.Count> : null}
              </Sidebar.Anchor>
            );
          })}
        </Sidebar.Group>
        <SidebarSources />

        <Sidebar.Footer>
          <Menu.Root>
            <Menu.Trigger icon size="sm" aria-label="Help">
              <Question />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="start" sideOffset={6}>
                <Menu.Popup style={{ width: "250px" }}>
                  {social.map((item) => (
                    <Menu.Item key={item.label} onClick={item.action}>
                      <Menu.ItemIcon>{item.icon}</Menu.ItemIcon>
                      <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
                      <Menu.SecondaryLabel>
                        {item.secondaryLabel}
                      </Menu.SecondaryLabel>
                    </Menu.Item>
                  ))}
                  <Menu.Separator />
                  {app.map((item) => (
                    <Menu.Item key={item.label} onClick={item.action}>
                      <Menu.ItemIcon>{item.icon}</Menu.ItemIcon>
                      <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
                      <Menu.SecondaryLabel>
                        {item.secondaryLabel}
                      </Menu.SecondaryLabel>
                    </Menu.Item>
                  ))}
                  <Menu.Separator />
                  {help.map((item) => (
                    <Menu.Item key={item.label} onClick={item.action}>
                      <Menu.ItemIcon>{item.icon}</Menu.ItemIcon>
                      <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
                      <Menu.SecondaryLabel>
                        {item.secondaryLabel}
                      </Menu.SecondaryLabel>
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </Sidebar.Footer>
      </Sidebar.Root>
    </Sidebar.Provider>
  );
}
