import { IconGithub, IconXTwitter } from "@pond/icons/social-media";
import type { SmartFolder } from "@pond/schema/db";
import { AlertDialog, Button, ContextMenu, Menu, useToast } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArrowUpRight,
  Folder,
  Network,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Tags,
  Trash2,
} from "lucide-react";
import type { ElementType, SVGProps } from "react";
import { useCallback, useMemo, useState } from "react";
import { LibrarySwitcher } from "@/components/library/library-switcher";
import { Aside } from "@/components/shell/aside";
import { Sidebar } from "@/components/shell/sidebar";
import { SidebarTools } from "@/components/shell/sidebar-tools";
import { navigateTo } from "@/lib/navigate-path";
import { useSidebar } from "@/lib/shell-state";
import { queryEquals, sortFolders } from "@/lib/smart-folders";
import { openCapture, setQuery, useFilterQuery } from "@/lib/view-store";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

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
  const { open } = useSidebar();
  const [smartFolders, patchFolders] = usePrefs("smartFolders");
  const currentQuery = useFilterQuery();

  const folders = useMemo(
    () => sortFolders(smartFolders.items ?? []),
    [smartFolders.items],
  );
  const pinned = folders.filter((f) => f.pinned);
  const unpinned = folders.filter((f) => !f.pinned);

  const goTo = useCallback(
    (folder: SmartFolder) => {
      setQuery(folder.query);
      navigateTo(navigate, "/", { viewTransition: true });
    },
    [navigate],
  );

  const removeFolder = useCallback(
    (id: string) =>
      patchFolders({
        items: (smartFolders.items ?? []).filter((f) => f.id !== id),
      }),
    [patchFolders, smartFolders.items],
  );

  const togglePin = useCallback(
    (id: string) =>
      patchFolders({
        items: (smartFolders.items ?? []).map((f) =>
          f.id === id ? { ...f, pinned: !f.pinned } : f,
        ),
      }),
    [patchFolders, smartFolders.items],
  );

  const openQuickCapture = useCallback(() => {
    openCapture();
  }, []);

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
              if (route.path === "/trash") {
                return <TrashLink key={route.path} route={route} />;
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

          {pinned.length > 0 ? (
            <Sidebar.Group>
              <Sidebar.GroupLabel>Quick Access</Sidebar.GroupLabel>
              {pinned.map((f) => (
                <SmartFolderLink
                  key={f.id}
                  folder={f}
                  active={queryEquals(currentQuery, f.query)}
                  onOpen={goTo}
                  onUnpin={() => togglePin(f.id)}
                  onRemove={() => removeFolder(f.id)}
                />
              ))}
            </Sidebar.Group>
          ) : null}

          {unpinned.length > 0 ? (
            <Sidebar.Group>
              <Sidebar.GroupLabel>Smart Folders</Sidebar.GroupLabel>
              {unpinned.map((f) => (
                <SmartFolderLink
                  key={f.id}
                  folder={f}
                  active={queryEquals(currentQuery, f.query)}
                  onOpen={goTo}
                  onPin={() => togglePin(f.id)}
                  onRemove={() => removeFolder(f.id)}
                />
              ))}
            </Sidebar.Group>
          ) : null}
        </Sidebar.Scroll>
        <HelpButton openUrl={openUrl} navigate={navigate} />
      </Sidebar.Root>
    </Aside>
  );
}

interface SmartFolderLinkProps {
  folder: SmartFolder;
  active: boolean;
  onOpen: (folder: SmartFolder) => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onRemove: () => void;
}

function SmartFolderLink({
  folder,
  active,
  onOpen,
  onPin,
  onUnpin,
  onRemove,
}: SmartFolderLinkProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={
          <Sidebar.Anchor active={active} onClick={() => onOpen(folder)}>
            <Sidebar.LinkIcon>
              <Folder />
            </Sidebar.LinkIcon>
            <Sidebar.LinkLabel>{folder.name}</Sidebar.LinkLabel>
          </Sidebar.Anchor>
        }
      />
      <ContextMenu.Portal>
        <ContextMenu.Backdrop />
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            {onPin ? (
              <ContextMenu.Item onClick={onPin}>
                <ContextMenu.ItemIcon>
                  <Pin width={14} height={14} />
                </ContextMenu.ItemIcon>
                <ContextMenu.ItemLabel>
                  Pin to Quick Access
                </ContextMenu.ItemLabel>
              </ContextMenu.Item>
            ) : null}
            {onUnpin ? (
              <ContextMenu.Item onClick={onUnpin}>
                <ContextMenu.ItemIcon>
                  <PinOff width={14} height={14} />
                </ContextMenu.ItemIcon>
                <ContextMenu.ItemLabel>Unpin</ContextMenu.ItemLabel>
              </ContextMenu.Item>
            ) : null}
            <ContextMenu.Item onClick={onRemove}>
              <ContextMenu.ItemIcon>
                <Trash2 width={14} height={14} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Remove</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

interface TrashLinkProps {
  route: Route;
}

function TrashLink({ route }: TrashLinkProps) {
  const toast = useToast();
  const [trashPrefs] = usePrefs("trash");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [busy, setBusy] = useState(false);

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
            <Sidebar.Link to={route.path}>
              <Sidebar.LinkIcon>
                <route.icon />
              </Sidebar.LinkIcon>
              <Sidebar.LinkLabel>{route.label}</Sidebar.LinkLabel>
            </Sidebar.Link>
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
          <QuestionMarkIcon />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" align="start" sideOffset={6}>
            <Menu.Popup>
              <Menu.Item>
                <Menu.ItemIcon>
                  <KeyboardIcon />
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
                  <SlidersHorizontal fill="currentColor" fillOpacity={0.2} />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Settings</Menu.ItemLabel>
                <Menu.ItemKbd>G then S</Menu.ItemKbd>
              </Menu.Item>

              <Menu.Separator />

              <Menu.Item onClick={() => openUrl(DISCUSSIONS_URL)}>
                <Menu.ItemIcon>
                  <Network fill="currentColor" fillOpacity={0.2} />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Community</Menu.ItemLabel>
                <Menu.ItemKbd>
                  <ArrowUpRight width={12} height={12} />
                </Menu.ItemKbd>
              </Menu.Item>

              <Menu.Item onClick={() => openUrl("https://x.com/raphaelsalaja")}>
                <Menu.ItemIcon>
                  <IconXTwitter />
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
                  <IconGithub />
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

function QuestionMarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="none"
      {...props}
    >
      <title>Help</title>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth={1.3} />
      <path
        d="M6.25 6.5a1.75 1.75 0 1 1 2.37 1.64c-.39.15-.62.52-.62.93V9.5"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="11.25" r="0.75" fill="currentColor" />
    </svg>
  );
}

function KeyboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      {...props}
    >
      <title>Keyboard</title>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
      >
        <rect x="2.25" y="4.75" width="13.5" height="8.5" rx="1.6" />
        <circle cx="5" cy="7.75" r="0.4" fill="currentColor" stroke="none" />
        <circle cx="7.5" cy="7.75" r="0.4" fill="currentColor" stroke="none" />
        <circle cx="10" cy="7.75" r="0.4" fill="currentColor" stroke="none" />
        <circle cx="12.5" cy="7.75" r="0.4" fill="currentColor" stroke="none" />
        <circle cx="5" cy="10" r="0.4" fill="currentColor" stroke="none" />
        <circle cx="7.5" cy="10" r="0.4" fill="currentColor" stroke="none" />
        <circle cx="10" cy="10" r="0.4" fill="currentColor" stroke="none" />
        <circle cx="12.5" cy="10" r="0.4" fill="currentColor" stroke="none" />
        <line x1="5.75" y1="11.5" x2="12.25" y2="11.5" />
      </g>
    </svg>
  );
}
