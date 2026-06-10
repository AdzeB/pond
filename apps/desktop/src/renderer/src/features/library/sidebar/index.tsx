import {
  IconUserFill18 as Contact,
  IconWindowDownloadFill18 as Download,
  IconOpenInBrowserFill18 as OpenBrowser,
  IconArchivePlusFill18 as Plus,
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
import { formatNumber } from "@/core/lib/format";
import { PondSwitcher } from "@/features/library/menus/pond-switcher";
import { extraRoutes } from "./data";
import { useSidebarNav } from "./use-sidebar-nav";

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
  {
    icon: <Contact />,
    label: "Contact Us",
    secondaryLabel: "G then H",
  },
];

export function Library() {
  const { visibleItems } = useSidebarNav();

  const app = [
    {
      icon: <OpenBrowser />,
      label: "Visit Homepage",
      secondaryLabel: "G then A",
      action: () => {
        window.open("https://www.pond.so", "_blank");
      },
    },
    {
      icon: <Download />,
      label: "Install Extension",
      secondaryLabel: "G then H",
      action: () => {
        window.open("https://www.pond.so/extension", "_blank");
      },
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
          {visibleItems.map(({ item, count }) => (
            <Sidebar.Anchor key={item.key} to={item.path} params={item.params}>
              <Sidebar.Icon>{item.icon}</Sidebar.Icon>
              {item.label}
              {count > 0 ? (
                <Sidebar.Count>{formatNumber(count)}</Sidebar.Count>
              ) : null}
            </Sidebar.Anchor>
          ))}
        </Sidebar.Group>

        <Sidebar.Group key={extraRoutes.id}>
          {extraRoutes.routes.map((route) => (
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

        <Sidebar.Footer>
          <Menu.Root>
            <Menu.Trigger icon size="sm" aria-label="Help">
              <Question />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="start" sideOffset={6}>
                <Menu.Popup style={{ width: "250px" }}>
                  {social.map((item) => (
                    <Menu.Item key={item.label} onClick={() => void null}>
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
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </Sidebar.Footer>
      </Sidebar.Root>
    </Sidebar.Provider>
  );
}
