import { IconCheck2Fill12 } from "@pond/icons/fill/12";
import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import {
  IconFolderOpenOutline18,
  IconFolderPlusOutline18,
  IconFoldersOutline18,
} from "@pond/icons/outline/18";
import { cssVars, Menu } from "@pond/ui";
import type { QueryResult } from "@shared/query-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  createLibrary,
  mergeLibrary,
  openLibrary,
  switchLibrary,
} from "@/features/library/lib/library-location";
import { useSidebarWidth } from "@/features/library/state/library-chrome";
import defaultAppIcon from "@/generated/app-icon-previews/aqua.png";
import { buildWorkspaceMenuItems } from "./spec";
import styles from "./styles.module.css";

type RecentLibrary = QueryResult<"library.recent">[number];

function LibraryMenuContent({ libraries }: { libraries: RecentLibrary[] }) {
  return (
    <>
      <Menu.Group>
        <Menu.List className={styles.libraries}>
          {libraries.length > 0 ? (
            libraries.map((entry) => (
              <Menu.Item
                disabled={!entry.available}
                closeOnClick={!entry.active}
                aria-current={entry.active ? "true" : undefined}
                key={entry.path}
                onClick={() => {
                  if (entry.active) return;
                  void switchLibrary(entry.path);
                }}
              >
                <Menu.ItemIcon className={styles.identity}>
                  <img
                    className={styles["library-icon"]}
                    src={entry.icon ?? defaultAppIcon}
                    alt=""
                  />
                </Menu.ItemIcon>
                <Menu.ItemLabel className={styles.label}>
                  {entry.name}
                </Menu.ItemLabel>
                {entry.active ? (
                  <Menu.SecondaryLabel
                    className={styles.label}
                    aria-label="Current Library"
                  >
                    <IconCheck2Fill12 />
                  </Menu.SecondaryLabel>
                ) : null}
              </Menu.Item>
            ))
          ) : (
            <Menu.Item disabled>
              <Menu.ItemLabel>No recent libraries</Menu.ItemLabel>
            </Menu.Item>
          )}
        </Menu.List>
      </Menu.Group>
      <Menu.Separator />
      <Menu.Group>
        <Menu.Item onClick={() => void createLibrary()}>
          <Menu.ItemIcon>
            <IconFolderPlusOutline18 />
          </Menu.ItemIcon>
          <Menu.ItemLabel>Create Library</Menu.ItemLabel>
        </Menu.Item>
        <Menu.Item onClick={() => void openLibrary()}>
          <Menu.ItemIcon>
            <IconFolderOpenOutline18 />
          </Menu.ItemIcon>
          <Menu.ItemLabel>Open Library</Menu.ItemLabel>
        </Menu.Item>
        <Menu.Item onClick={() => void mergeLibrary()}>
          <Menu.ItemIcon>
            <IconFoldersOutline18 />
          </Menu.ItemIcon>
          <Menu.ItemLabel>Merge Library</Menu.ItemLabel>
        </Menu.Item>
      </Menu.Group>
    </>
  );
}

export function WorkspaceMenu() {
  const [open, setOpen] = useState(false);
  const sidebarWidth = useSidebarWidth();
  const { data: info } = useQuery({
    queryKey: ["library-info"],
    queryFn: () => window.pond.query("library.info", {}),
  });
  const { data: recent = [], refetch } = useQuery({
    queryKey: ["recent-libraries"],
    queryFn: () => window.pond.query("library.recent", {}),
  });
  const items = buildWorkspaceMenuItems();
  const name = info?.name || "Pond";

  return (
    <Menu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refetch();
      }}
    >
      <Menu.Trigger
        variant="ghost"
        size="sm"
        rounding="rounded"
        className={styles.trigger}
      >
        <span className={styles.mark} aria-hidden>
          <img
            className={styles["library-icon"]}
            src={info?.icon ?? defaultAppIcon}
            alt=""
          />
        </span>
        <span className={styles.name}>{name}</span>
        <IconChevronDownOutline12 className={styles.chevron} aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" side="bottom" alignOffset={-2}>
          <Menu.Popup
            className={styles.switcher}
            style={cssVars({ "--menu-width": `${sidebarWidth - 30}px` })}
          >
            <LibraryMenuContent libraries={recent} />
            <Menu.Separator />
            <Menu.Items items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
