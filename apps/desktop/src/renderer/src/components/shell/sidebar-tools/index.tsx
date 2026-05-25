import { Button, Menu, Tooltip } from "@pond/ui";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useRecents } from "@/lib/recents";
import { pool } from "@/pool/pool";
import styles from "./styles.module.css";

export function SidebarTools() {
  const navigate = useNavigate();
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
          onClick={() => navigate(-1)}
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
          onClick={() => navigate(1)}
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
                      onClick={() => navigate(`/save/${entry.saveId}`)}
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
