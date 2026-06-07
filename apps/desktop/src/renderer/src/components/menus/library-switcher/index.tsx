import {
  IconFinderOutline18 as FolderOpen,
  IconFolderPlusOutline18 as FolderPlus,
  IconFolderSearchOutline18 as FolderSearch,
  IconArrowRightOutline18 as MoveRight,
  IconArrowRotateAnticlockwiseOutline18 as RotateCcw,
  IconTrash2Outline18 as Trash2,
} from "@pond/icons/outline/18";
import { Button, Menu, useToast } from "@pond/ui";
import type { ReactNode } from "react";
import React, { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm";
import { initials } from "@/lib/utils/initials";
import styles from "./styles.module.css";

interface KnownLibraryWire {
  path: string;
  name: string;
  addedAt: number;
  lastOpenedAt: number;
  active: boolean;
  exists: boolean;
  avatar: string | null;
}

interface ListKnownResult {
  active: string;
  libraries: KnownLibraryWire[];
}

type PickResult = { ok: true; path: string } | { ok: false; reason: string };
type ActionResult = { ok: true } | { ok: false; reason: string };

function parentDir(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  return slash <= 0 ? trimmed : trimmed.slice(0, slash);
}

export function LibrarySwitcher({ logo }: { logo: ReactNode }) {
  const toast = useToast();
  const [libraries, setLibraries] = useState<KnownLibraryWire[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<KnownLibraryWire | null>(
    null,
  );

  const refresh = useCallback(async () => {
    const res = (await window.pond
      .query("library.listKnown", {})
      .catch(() => null)) as ListKnownResult | null;
    if (res) setLibraries(res.libraries);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = libraries.find((l) => l.active);

  async function switchTo(path: string) {
    if (busy) return;
    setBusy(true);
    const res = (await window.pond.query("library.switchTo", {
      path,
    })) as ActionResult;
    if (!res.ok) {
      setBusy(false);
      toast.add({
        title: "Couldn't switch library",
        description: res.reason,
        type: "error",
      });
    }
  }

  async function create() {
    if (busy) return;
    setBusy(true);
    const res = (await window.pond.query("library.create", {})) as
      | (ActionResult & { ok: true })
      | { ok: false; reason: string };
    if (!res.ok) {
      setBusy(false);
      if (res.reason !== "cancelled") {
        toast.add({
          title: "Couldn't create library",
          description: res.reason,
          type: "error",
        });
      }
    }
  }

  async function openExisting() {
    if (busy) return;
    setBusy(true);
    const pick = (await window.pond.query(
      "library.pickExisting",
      {},
    )) as PickResult;
    if (!pick.ok) {
      setBusy(false);
      if (pick.reason !== "cancelled") {
        toast.add({
          title: "Couldn't open picker",
          description: pick.reason,
          type: "error",
        });
      }
      return;
    }
    const res = (await window.pond.query("library.switchTo", {
      path: pick.path,
    })) as ActionResult;
    if (!res.ok) {
      setBusy(false);
      toast.add({
        title: "Couldn't open library",
        description: res.reason,
        type: "error",
      });
    }
  }

  function reveal(path: string) {
    void window.pond.query("library.openInFinder", { path });
  }

  async function forget(path: string) {
    const res = (await window.pond.query("library.forget", {
      path,
    })) as ActionResult;
    if (!res.ok) {
      toast.add({
        title: "Couldn't remove library",
        description: res.reason,
        type: "error",
      });
      return;
    }
    await refresh();
  }

  async function deleteFromDisk(path: string, name: string) {
    const res = (await window.pond.query("library.delete", {
      path,
    })) as ActionResult;
    if (!res.ok) {
      toast.add({
        title: "Couldn't delete library",
        description: res.reason,
        type: "error",
      });
      return;
    }
    toast.add({ title: `Moved "${name}" to Trash`, type: "success" });
    await refresh();
  }

  async function emptyCacheAndReload() {
    if (busy) return;
    setBusy(true);
    await window.pond.query("library.emptyCacheAndReload", {}).catch(() => {});
  }

  return (
    <React.Fragment>
      <Menu.Root
        onOpenChange={(open) => {
          if (open) void refresh();
        }}
      >
        <Menu.Trigger variant="ghost">
          <span aria-hidden className={styles.logo} />
          {active?.name ?? "Pond"}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" sideOffset={6}>
            <Menu.Popup className={styles.popup}>
              <Menu.Group>
                <Menu.GroupLabel>Libraries</Menu.GroupLabel>
                {libraries.map((lib) => {
                  return (
                    <Menu.SubmenuRoot key={lib.path}>
                      <Menu.SubmenuTrigger className={styles["library-row"]}>
                        <span
                          aria-hidden
                          className={styles.avatar}
                          data-emoji={lib.avatar ? true : undefined}
                          data-missing={!lib.exists || undefined}
                        >
                          {lib.avatar ?? initials(lib.name)}
                        </span>
                        <Menu.ItemLabel>{lib.name}</Menu.ItemLabel>
                        {lib.active ? (
                          <span className={styles.dot} aria-hidden />
                        ) : null}
                      </Menu.SubmenuTrigger>
                      <Menu.Portal>
                        <Menu.Positioner align="start" sideOffset={4}>
                          <Menu.Popup>
                            <Menu.Group>
                              <Menu.GroupLabel className={styles.path}>
                                {parentDir(lib.path)}
                                {lib.exists ? "" : " (missing)"}
                              </Menu.GroupLabel>
                              <Menu.Item
                                disabled={busy || lib.active || !lib.exists}
                                onClick={() => void switchTo(lib.path)}
                              >
                                <Menu.ItemIcon>
                                  <MoveRight width={14} height={14} />
                                </Menu.ItemIcon>
                                <Menu.ItemLabel>
                                  {lib.active
                                    ? "Current library"
                                    : "Switch to library"}
                                </Menu.ItemLabel>
                              </Menu.Item>
                              <Menu.Item onClick={() => reveal(lib.path)}>
                                <Menu.ItemIcon>
                                  <FolderSearch width={14} height={14} />
                                </Menu.ItemIcon>
                                <Menu.ItemLabel>
                                  Reveal in Finder
                                </Menu.ItemLabel>
                              </Menu.Item>
                            </Menu.Group>
                            <Menu.Separator />
                            <Menu.Item
                              className={styles.danger}
                              disabled={lib.active}
                              onClick={() => setPendingDelete(lib)}
                            >
                              <Menu.ItemIcon>
                                <Trash2 width={14} height={14} />
                              </Menu.ItemIcon>
                              <Menu.ItemLabel>Delete library…</Menu.ItemLabel>
                            </Menu.Item>
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </Menu.SubmenuRoot>
                  );
                })}
                {libraries.length === 0 ? (
                  <div className={styles.empty}>No libraries yet.</div>
                ) : null}
              </Menu.Group>

              <Menu.Separator />

              <Menu.Item disabled={busy} onClick={() => void create()}>
                <Menu.ItemIcon>
                  <FolderPlus width={15} height={15} />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Create library…</Menu.ItemLabel>
              </Menu.Item>
              <Menu.Item disabled={busy} onClick={() => void openExisting()}>
                <Menu.ItemIcon>
                  <FolderOpen width={15} height={15} />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Open library…</Menu.ItemLabel>
              </Menu.Item>

              <Menu.Separator />

              <Menu.Item
                disabled={busy}
                onClick={() => void emptyCacheAndReload()}
              >
                <Menu.ItemIcon>
                  <RotateCcw width={15} height={15} />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Empty cache and reload</Menu.ItemLabel>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`Delete “${pendingDelete?.name}”?`}
        description="Remove it from this list (your files stay on disk), or delete the whole library by moving it to the Trash."
        confirmLabel="Delete from Disk"
        onConfirm={() => {
          if (pendingDelete) {
            void deleteFromDisk(pendingDelete.path, pendingDelete.name);
          }
          setPendingDelete(null);
        }}
        extraActions={
          <Button
            variant="secondary"
            onClick={() => {
              if (pendingDelete) void forget(pendingDelete.path);
              setPendingDelete(null);
            }}
          >
            Remove from List
          </Button>
        }
      />
    </React.Fragment>
  );
}
