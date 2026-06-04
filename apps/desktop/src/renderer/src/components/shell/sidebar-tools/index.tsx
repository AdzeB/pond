import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconChevronRightOutline18 as ChevronRight,
  IconClockRotateAnticlockwiseOutline18 as History,
} from "@pond/icons/outline/18";
import { Button, Menu, Tooltip } from "@pond/ui";
import { useNavigate, useRouter } from "@tanstack/react-router";
import React from "react";
import { useRecents } from "@/lib/recents";
import { pool } from "@/pool/pool";
import styles from "./styles.module.css";

export function SidebarTools() {
  const navigate = useNavigate();
  const router = useRouter();
  const recents = useRecents();

  const rows = recents.flatMap((entry) => {
    const save = pool.get(entry.saveId);
    return save ? [{ entry, save }] : [];
  });

  return (
    <React.Fragment>
      <Tooltip label="Back" side="bottom">
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label="Back"
          onClick={() => router.history.back()}
        >
          <ChevronLeft />
        </Button>
      </Tooltip>
      <Tooltip label="Forward" side="bottom">
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label="Forward"
          onClick={() => router.history.forward()}
        >
          <ChevronRight />
        </Button>
      </Tooltip>
      <Menu.Root>
        <Tooltip label="Recently viewed" side="bottom">
          <Menu.Trigger
            render={
              <Button
                variant="ghost"
                size="sm"
                icon
                aria-label="Recently Viewed"
              >
                <History />
              </Button>
            }
          />
        </Tooltip>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            <Menu.Popup className={styles.popup}>
              <Menu.Group>
                <Menu.GroupLabel>Recently viewed</Menu.GroupLabel>
                {rows.length === 0 ? (
                  <div className={styles.empty}>Nothing yet</div>
                ) : (
                  rows.map(({ entry, save }) => (
                    <Menu.Item
                      key={entry.saveId}
                      className={styles.row}
                      onClick={() =>
                        void navigate({ to: `/save/${entry.saveId}` })
                      }
                    >
                      <Menu.ItemLabel>
                        {save.title?.trim() || save.url || "Untitled save"}
                      </Menu.ItemLabel>
                      {save.source ? (
                        <span className={styles["row-source"]}>
                          {save.source}
                        </span>
                      ) : null}
                    </Menu.Item>
                  ))
                )}
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </React.Fragment>
  );
}
