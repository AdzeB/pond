import { Menu, Popover, ScrollArea, useToast } from "@pond/ui";
import {
  Check,
  ChevronsUpDown,
  Ellipsis,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  GripVertical,
  Library,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import type { DragEvent, ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import styles from "./styles.module.css";

interface KnownLibraryWire {
  path: string;
  name: string;
  addedAt: number;
  lastOpenedAt: number;
  active: boolean;
  exists: boolean;
}

interface ListKnownResult {
  active: string;
  libraries: KnownLibraryWire[];
}

type PickResult = { ok: true; path: string } | { ok: false; reason: string };
type ActionResult = { ok: true } | { ok: false; reason: string };

// The folder that holds the `.pond` bundle, shown under the name like
// Eagle's path column. Drops the bundle segment itself.
function parentDir(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  return slash <= 0 ? trimmed : trimmed.slice(0, slash);
}

export function LibrarySwitcher({ logo }: { logo: ReactNode }) {
  const toast = useToast();
  const [libraries, setLibraries] = useState<KnownLibraryWire[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Latest order, read on drop so persistence doesn't see a stale
  // closure from the render where the drag started.
  const orderRef = useRef<KnownLibraryWire[]>([]);
  orderRef.current = libraries;

  const refresh = useCallback(async () => {
    const res = (await window.pond
      .query("library.listKnown", {})
      .catch(() => null)) as ListKnownResult | null;
    if (res) setLibraries(res.libraries);
  }, []);

  const active = libraries.find((l) => l.active);

  const filter = query.trim().toLowerCase();
  const visible = filter
    ? libraries.filter(
        (l) =>
          l.name.toLowerCase().includes(filter) ||
          l.path.toLowerCase().includes(filter),
      )
    : libraries;
  const canReorder = filter.length === 0 && libraries.length > 1;

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
    // On success the main process relaunches into the new library.
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

  async function emptyCacheAndReload() {
    if (busy) return;
    setBusy(true);
    await window.pond.query("library.emptyCacheAndReload", {}).catch(() => {});
    // The main process reloads every window right after, so there's no
    // need to clear `busy`; this view is about to be torn down.
  }

  function onDragStart(e: DragEvent, index: number) {
    if (!canReorder) return;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function onDragOver(e: DragEvent, index: number) {
    if (!canReorder || dragIndex === null || dragIndex === index) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setLibraries((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      if (!moved) return prev;
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  }

  function onDragEnd() {
    if (dragIndex === null) return;
    setDragIndex(null);
    const paths = orderRef.current.map((l) => l.path);
    void window.pond.query("library.reorder", { paths }).catch(() => {});
  }

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) void refresh();
        else setQuery("");
      }}
    >
      <Popover.Trigger
        render={
          <button
            type="button"
            className={styles.trigger}
            aria-label="Switch library"
          />
        }
      >
        <span aria-hidden className={styles.logo}>
          {logo}
        </span>
        <span className={styles.name}>{active?.name ?? "Pond"}</span>
        <ChevronsUpDown className={styles.chevron} aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={6}>
          <Popover.Popup className={styles.popup}>
            <div className={styles.search}>
              <Search className={styles["search-icon"]} aria-hidden />
              <input
                className={styles["search-field"]}
                type="text"
                placeholder="Search libraries…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
              {query ? (
                <button
                  type="button"
                  className={styles["search-clear"]}
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X width={13} height={13} />
                </button>
              ) : null}
            </div>

            <ScrollArea.Root className={styles.list}>
              <ScrollArea.Viewport className={styles["list-viewport"]}>
                <ScrollArea.Content>
                  {visible.map((lib, index) => {
                    const dragging =
                      canReorder &&
                      dragIndex !== null &&
                      libraries[dragIndex]?.path === lib.path;
                    const interactive = !busy && !lib.active && lib.exists;
                    return (
                      // biome-ignore lint/a11y/noStaticElementInteractions: drop target for drag-reorder; the row's actions live on real buttons inside it
                      <div
                        key={lib.path}
                        className={styles.row}
                        data-active={lib.active || undefined}
                        data-dragging={dragging || undefined}
                        data-disabled={
                          busy || (!lib.exists && !lib.active) || undefined
                        }
                        onDragOver={(e) => onDragOver(e, index)}
                        onDrop={(e) => {
                          if (canReorder) e.preventDefault();
                        }}
                      >
                        {canReorder ? (
                          <span
                            className={styles.handle}
                            aria-hidden
                            draggable
                            onDragStart={(e) => onDragStart(e, index)}
                            onDragEnd={onDragEnd}
                          >
                            <GripVertical width={14} height={14} />
                          </span>
                        ) : (
                          <span
                            className={styles["handle-spacer"]}
                            aria-hidden
                          />
                        )}

                        <button
                          type="button"
                          className={styles["row-main"]}
                          disabled={busy || (!lib.exists && !lib.active)}
                          onClick={() => {
                            if (interactive) void switchTo(lib.path);
                          }}
                        >
                          <span className={styles["row-icon"]} aria-hidden>
                            <Library width={16} height={16} />
                          </span>

                          <span className={styles["row-text"]}>
                            <span className={styles["row-name"]}>
                              {lib.name}
                            </span>
                            <span className={styles["row-path"]}>
                              {parentDir(lib.path)}
                              {lib.exists ? "" : " (missing)"}
                            </span>
                          </span>

                          <span className={styles["row-check"]} aria-hidden>
                            {lib.active ? (
                              <Check width={15} height={15} />
                            ) : null}
                          </span>
                        </button>

                        <Menu.Root>
                          <Menu.Trigger
                            variant="ghost"
                            size="sm"
                            icon
                            className={styles["row-menu-trigger"]}
                            aria-label={`More actions for ${lib.name}`}
                          >
                            <Ellipsis width={15} height={15} />
                          </Menu.Trigger>
                          <Menu.Portal>
                            <Menu.Positioner align="end" sideOffset={4}>
                              <Menu.Popup>
                                <Menu.Item onClick={() => reveal(lib.path)}>
                                  <Menu.ItemIcon>
                                    <FolderSearch width={14} height={14} />
                                  </Menu.ItemIcon>
                                  <Menu.ItemLabel>
                                    Reveal in Finder
                                  </Menu.ItemLabel>
                                </Menu.Item>
                                <Menu.Item
                                  disabled={lib.active}
                                  onClick={() => void forget(lib.path)}
                                >
                                  <Menu.ItemIcon>
                                    <X width={14} height={14} />
                                  </Menu.ItemIcon>
                                  <Menu.ItemLabel>
                                    Remove from list
                                  </Menu.ItemLabel>
                                </Menu.Item>
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.Root>
                      </div>
                    );
                  })}

                  {visible.length === 0 ? (
                    <div className={styles.empty}>
                      {libraries.length === 0
                        ? "No libraries yet."
                        : "No libraries match your search."}
                    </div>
                  ) : null}
                </ScrollArea.Content>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar>
                <ScrollArea.Thumb />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.action}
                onClick={() => void create()}
                disabled={busy}
              >
                <span className={styles["action-icon"]} aria-hidden>
                  <FolderPlus width={15} height={15} />
                </span>
                <span className={styles["action-label"]}>Create Library…</span>
              </button>
              <button
                type="button"
                className={styles.action}
                onClick={() => void openExisting()}
                disabled={busy}
              >
                <span className={styles["action-icon"]} aria-hidden>
                  <FolderOpen width={15} height={15} />
                </span>
                <span className={styles["action-label"]}>Switch Library…</span>
              </button>
              <button
                type="button"
                className={styles.action}
                onClick={() => void emptyCacheAndReload()}
                disabled={busy}
              >
                <span className={styles["action-icon"]} aria-hidden>
                  <RotateCcw width={15} height={15} />
                </span>
                <span className={styles["action-label"]}>
                  Empty cache and reload
                </span>
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
