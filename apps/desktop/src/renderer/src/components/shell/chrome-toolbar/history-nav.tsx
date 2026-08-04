import { IconHistory2Fill18 } from "@pond/icons/fill/18";
import {
  IconArrowLeftOutline18,
  IconArrowRightOutline18,
} from "@pond/icons/outline/18";
import { Button, Menu, type MenuItemSpec } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { getAppRouter } from "@/lib/ui/app-router";
import { openSave } from "@/lib/ui/save-nav";
import { pool, savesStore } from "@/stores/pool";
import { useRecents } from "@/stores/recents";
import { useActiveTabId } from "@/stores/tabs";
import styles from "./styles.module.css";

function titleFor(id: string): string | null {
  const save = pool.get(id);
  if (!save) return null;
  const trimmed = save.title?.trim();
  if (trimmed) return trimmed;
  return save.url || "Untitled";
}

/** Back/forward for the active tab router; safe outside RouterProvider. */
export function ChromeHistoryNav() {
  const activeId = useActiveTabId();
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const recents = useRecents();
  const revision = useSelector(savesStore, (s) => s.revision);

  const historyItems = useMemo<MenuItemSpec[]>(() => {
    void revision;
    const items: MenuItemSpec[] = [];
    for (const entry of recents) {
      const title = titleFor(entry.saveId);
      if (!title) continue;
      const id = entry.saveId;
      items.push({
        label: title,
        onClick: () => openSave(id),
      });
    }
    if (items.length === 0) {
      return [{ label: "No Recent Items", disabled: true }];
    }
    return items;
  }, [recents, revision]);

  useEffect(() => {
    void activeId;
    const router = getAppRouter();
    if (!router) {
      setCanBack(false);
      setCanForward(false);
      return;
    }
    const sync = () => {
      const r = getAppRouter();
      if (!r) return;
      setCanBack(r.history.canGoBack());
      const index =
        (r.state.location.state as { __TSR_index?: number } | undefined)
          ?.__TSR_index ?? 0;
      setCanForward(index < r.history.length - 1);
    };
    sync();
    return router.history.subscribe(sync);
  }, [activeId]);

  return (
    <div className={styles.nav}>
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Back"
        disabled={!canBack}
        onClick={() => getAppRouter()?.history.back()}
      >
        <IconArrowLeftOutline18 />
      </Button>
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Forward"
        disabled={!canForward}
        onClick={() => getAppRouter()?.history.forward()}
      >
        <IconArrowRightOutline18 />
      </Button>
      <Menu.Root>
        <Menu.Trigger icon size="sm" variant="ghost" aria-label="History">
          <IconHistory2Fill18 />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" side="bottom">
            <Menu.Popup className={styles["history-popup"]}>
              <Menu.Items items={historyItems} />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
