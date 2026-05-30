import { Menu, useToast } from "@pond/ui";
import {
  Check,
  ChevronsUpDown,
  FolderOpen,
  FolderPlus,
  FolderSearch,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
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
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = (await window.pond
      .query("library.listKnown", {})
      .catch(() => null)) as ListKnownResult | null;
    if (res) setLibraries(res.libraries);
  }, []);

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

  function reveal() {
    void window.pond.query("library.openInFinder", {});
  }

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) void refresh();
      }}
    >
      <Menu.Trigger
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
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={6}>
          <Menu.Popup className={styles.popup}>
            {libraries.map((lib) => (
              <Menu.Item
                key={lib.path}
                className={styles["lib-item"]}
                disabled={busy || (!lib.exists && !lib.active)}
                onClick={() => {
                  if (!lib.active) void switchTo(lib.path);
                }}
              >
                <span className={styles["lib-check"]} aria-hidden>
                  {lib.active ? <Check width={14} height={14} /> : null}
                </span>
                <span className={styles["lib-text"]}>
                  <span className={styles["lib-name"]}>{lib.name}</span>
                  <span className={styles["lib-path"]}>
                    {parentDir(lib.path)}
                    {lib.exists ? "" : " (missing)"}
                  </span>
                </span>
              </Menu.Item>
            ))}

            {libraries.length > 0 ? <Menu.Separator /> : null}

            <Menu.Item onClick={() => void create()} disabled={busy}>
              <Menu.ItemIcon>
                <FolderPlus width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Create Library…</Menu.ItemLabel>
            </Menu.Item>
            <Menu.Item onClick={() => void openExisting()} disabled={busy}>
              <Menu.ItemIcon>
                <FolderOpen width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Open Library…</Menu.ItemLabel>
            </Menu.Item>
            <Menu.Item onClick={reveal}>
              <Menu.ItemIcon>
                <FolderSearch width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Reveal in Finder</Menu.ItemLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
