import {
  IconConnectedDotsFillDuo18,
  IconSliderFillDuo18,
} from "@pond/icons/fill-duo";
import {
  IconArchiveContent2Outline18 as Archive,
  IconArrowUpRightOutline18 as ArrowUpRight,
  IconCircleQuestionOutline18,
  IconKeyboardOutline18,
  IconPlusOutline18 as Plus,
  IconRefreshClockwiseOutline18 as RefreshCw,
  IconTagsOutline18 as Tags,
  IconTrash2Outline18 as Trash2,
} from "@pond/icons/outline/18";
import { IconGithub, IconXTwitter } from "@pond/icons/social-media";
import { AlertDialog, Button, ContextMenu, Menu, useToast } from "@pond/ui";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { ElementType, KeyboardEvent, SVGProps } from "react";
import { useCallback, useState } from "react";
import { LibrarySwitcher } from "@/components/library/library-switcher";
import { Aside } from "@/components/shell/aside";
import { Sidebar } from "@/components/shell/sidebar";
import { SidebarTools } from "@/components/shell/sidebar-tools";
import { navigateTo } from "@/lib/navigate-path";
import { useSidebar } from "@/lib/shell-state";
import { openCapture, setTrashView, useTrashView } from "@/lib/view-store";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

// `<a>` without href isn't keyboard-activatable on its own; mirror the
// native link affordance so the store-driven entries stay reachable.
function activateOnKey(handler: () => void) {
  return (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}

const REPO_URL = "https://github.com/raphaelsalaja/pond";
const DISCUSSIONS_URL = `${REPO_URL}/discussions`;

interface Route {
  path: string;
  label: string;
  icon: ElementType;
}

const routes: Route[] = [
  { path: "/", label: "Library", icon: Archive },
  { path: "/tags", label: "Tags", icon: Tags },
  { path: "/trash", label: "Trash", icon: Trash2 },
];

export function LibrarySidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const trashView = useTrashView();
  const { open } = useSidebar();

  const openQuickCapture = useCallback(() => {
    openCapture();
  }, []);

  const goLibrary = useCallback(() => {
    setTrashView(false);
    navigateTo(navigate, "/");
  }, [navigate]);

  const libraryActive = location.pathname === "/" && !trashView;

  function openUrl(url: string) {
    void window.pond.openExternal(url);
  }

  return (
    <Aside side="left" open={open}>
      <Sidebar.Root aria-label="Library navigation">
        <Sidebar.Scroll>
          <Sidebar.Toolbar>
            <SidebarTools />
          </Sidebar.Toolbar>

          <Sidebar.Header>
            <LibrarySwitcher logo={<PondLogo />} />
            <Sidebar.HeaderActions>
              <Button
                variant="ghost"
                size="sm"
                icon
                aria-label="Quick capture"
                onClick={openQuickCapture}
              >
                <Plus />
              </Button>
            </Sidebar.HeaderActions>
          </Sidebar.Header>

          <Sidebar.Group>
            {routes.map((route) => {
              if (route.path === "/") {
                return (
                  <Sidebar.Anchor
                    key={route.path}
                    role="button"
                    tabIndex={0}
                    active={libraryActive}
                    onClick={goLibrary}
                    onKeyDown={activateOnKey(goLibrary)}
                  >
                    <Sidebar.LinkIcon>
                      <route.icon />
                    </Sidebar.LinkIcon>
                    <Sidebar.LinkLabel>{route.label}</Sidebar.LinkLabel>
                  </Sidebar.Anchor>
                );
              }
              if (route.path === "/trash") {
                return (
                  <TrashLink
                    key={route.path}
                    route={route}
                    navigate={navigate}
                    active={trashView}
                  />
                );
              }
              return (
                <Sidebar.Link key={route.path} to={route.path}>
                  <Sidebar.LinkIcon>
                    <route.icon />
                  </Sidebar.LinkIcon>
                  <Sidebar.LinkLabel>{route.label}</Sidebar.LinkLabel>
                </Sidebar.Link>
              );
            })}
          </Sidebar.Group>
        </Sidebar.Scroll>
        <HelpButton openUrl={openUrl} navigate={navigate} />
      </Sidebar.Root>
    </Aside>
  );
}

interface TrashLinkProps {
  route: Route;
  navigate: ReturnType<typeof useNavigate>;
  active: boolean;
}

function TrashLink({ route, navigate, active }: TrashLinkProps) {
  const toast = useToast();
  const [trashPrefs] = usePrefs("trash");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [busy, setBusy] = useState(false);

  const onToggle = useCallback(() => {
    if (active) {
      setTrashView(false);
      return;
    }
    setTrashView(true);
    navigateTo(navigate, "/");
  }, [active, navigate]);

  const restoreAll = useCallback(async () => {
    setBusy(true);
    try {
      await window.pond.query("saves.restoreAll");
      toast.add({ title: "Restored everything", type: "success" });
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const emptyTrash = useCallback(async () => {
    setBusy(true);
    try {
      await window.pond.query("saves.emptyTrash");
      toast.add({ title: "Trash emptied", type: "success" });
    } finally {
      setBusy(false);
      setConfirmEmpty(false);
    }
  }, [toast]);

  const onEmptyTrashClick = useCallback(() => {
    if (trashPrefs.confirmBeforeEmpty) {
      setConfirmEmpty(true);
    } else {
      void emptyTrash();
    }
  }, [emptyTrash, trashPrefs.confirmBeforeEmpty]);

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={
            <Sidebar.Anchor
              role="button"
              tabIndex={0}
              active={active}
              onClick={onToggle}
              onKeyDown={activateOnKey(onToggle)}
            >
              <Sidebar.LinkIcon>
                <route.icon />
              </Sidebar.LinkIcon>
              <Sidebar.LinkLabel>{route.label}</Sidebar.LinkLabel>
            </Sidebar.Anchor>
          }
        />
        <ContextMenu.Portal>
          <ContextMenu.Backdrop />
          <ContextMenu.Positioner>
            <ContextMenu.Popup>
              <ContextMenu.Item onClick={onEmptyTrashClick}>
                <ContextMenu.ItemIcon>
                  <Trash2 width={14} height={14} />
                </ContextMenu.ItemIcon>
                <ContextMenu.ItemLabel>Empty Trash</ContextMenu.ItemLabel>
              </ContextMenu.Item>
              <ContextMenu.Item onClick={() => void restoreAll()}>
                <ContextMenu.ItemIcon>
                  <RefreshCw width={14} height={14} />
                </ContextMenu.ItemIcon>
                <ContextMenu.ItemLabel>Restore All Items</ContextMenu.ItemLabel>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <AlertDialog.Root open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Empty trash?</AlertDialog.Title>
            <AlertDialog.Description>
              Permanently delete every trashed save. This cannot be undone.
            </AlertDialog.Description>
            <AlertDialog.Actions>
              <AlertDialog.Close
                render={<Button variant="ghost">Cancel</Button>}
              />
              <AlertDialog.Close
                render={
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={(e) => {
                      e.preventDefault();
                      void emptyTrash();
                    }}
                  >
                    Delete forever
                  </Button>
                }
              />
            </AlertDialog.Actions>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

interface HelpButtonProps {
  openUrl: (url: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}

function HelpButton({ openUrl, navigate }: HelpButtonProps) {
  return (
    <div className={styles["help-footer"]}>
      <Menu.Root>
        <Menu.Trigger
          aria-label="Help and resources"
          className={styles["help-trigger"]}
        >
          <IconCircleQuestionOutline18 width={16} height={16} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" align="start" sideOffset={6}>
            <Menu.Popup>
              <Menu.Item>
                <Menu.ItemIcon>
                  <IconKeyboardOutline18 />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Keyboard Shortcuts</Menu.ItemLabel>
                <Menu.ItemKbd>⌘ /</Menu.ItemKbd>
              </Menu.Item>

              <Menu.Item
                onClick={() =>
                  navigateTo(navigate, "/settings", { viewTransition: true })
                }
              >
                <Menu.ItemIcon>
                  <IconSliderFillDuo18 />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Settings</Menu.ItemLabel>
                <Menu.ItemKbd>G then S</Menu.ItemKbd>
              </Menu.Item>

              <Menu.Separator />

              <Menu.Item onClick={() => openUrl(DISCUSSIONS_URL)}>
                <Menu.ItemIcon>
                  <IconConnectedDotsFillDuo18 />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Community</Menu.ItemLabel>
                <Menu.ItemKbd>
                  <ArrowUpRight width={12} height={12} />
                </Menu.ItemKbd>
              </Menu.Item>

              <Menu.Item onClick={() => openUrl("https://x.com/raphaelsalaja")}>
                <Menu.ItemIcon>
                  <IconXTwitter width={16} height={16} />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Twitter</Menu.ItemLabel>
                <Menu.ItemKbd>
                  <ArrowUpRight width={12} height={12} />
                </Menu.ItemKbd>
              </Menu.Item>

              <Menu.Item
                onClick={() => openUrl("https://github.com/raphaelsalaja/pond")}
              >
                <Menu.ItemIcon>
                  <IconGithub width={16} height={16} />
                </Menu.ItemIcon>
                <Menu.ItemLabel>GitHub</Menu.ItemLabel>
                <Menu.ItemKbd>
                  <ArrowUpRight width={12} height={12} />
                </Menu.ItemKbd>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

function PondLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      role="img"
      {...props}
    >
      <title>Pond</title>
      <path
        d="M9 1.75a7.25 7.25 0 1 0 0 14.5A7.25 7.25 0 0 0 9 1.75Zm0 4a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
