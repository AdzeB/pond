import { IconEyeFill18 } from "@pond/icons/fill/18";
import { Button, Popover, Tooltip } from "@pond/ui";
import { lazy, Suspense, useMemo, useState } from "react";
import { useFolders } from "@/features/library/state/folders";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import {
  libraryHeader,
  useViewPopover,
} from "@/features/library/state/library-header";
import { useIncludeSubfolders } from "@/features/library/state/view-store";
import { descendantFolderIds } from "@/features/saves/lib/nav-filter";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { DisplaySection } from "./display";
import { LayoutSection } from "./layout/layout";
import { SortSection } from "./sort";
import styles from "./styles.module.css";
import { ThumbnailSection } from "./thumbnail";
import { ZoomSection } from "./zoom/zoom";

const FolderOrderDialog = lazy(() =>
  import("@/features/library/components/folder-order").then((module) => ({
    default: module.FolderOrderDialog,
  })),
);

export function ViewMenu() {
  const open = useViewPopover() !== null;
  const [arranging, setArranging] = useState<string | null>(null);
  const nav = useLibraryNav();
  const folders = useFolders();
  const includeSubfolders = useIncludeSubfolders();
  const folderIds = useMemo(
    () =>
      arranging
        ? [
            ...(includeSubfolders
              ? descendantFolderIds(arranging, folders)
              : [arranging]),
          ]
        : [],
    [arranging, includeSubfolders, folders],
  );
  const scrollFade = useScrollFade<HTMLDivElement>();

  return (
    <>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (next) libraryHeader.openPopover("layout");
          else libraryHeader.closePopover();
        }}
      >
        <Tooltip
          label="View Options"
          shortcut={<ShortcutKeys id="view.options" />}
          side="bottom"
        >
          <Button
            render={<Popover.Trigger />}
            icon
            size="sm"
            variant="ghost"
            aria-label="View Options"
          >
            <IconEyeFill18 />
          </Button>
        </Tooltip>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end" sideOffset={8}>
            <Popover.Popup
              className={styles.popup}
              aria-label="View Options"
              {...scrollFade}
            >
              <LayoutSection />
              <ThumbnailSection />
              <ZoomSection />
              <hr className={styles.separator} />
              <SortSection
                onArrange={() => {
                  if (nav.kind === "folder") {
                    setArranging(nav.id);
                    libraryHeader.closePopover();
                  }
                }}
              />
              <hr className={styles.separator} />
              <DisplaySection />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {arranging ? (
        <Suspense fallback={null}>
          <FolderOrderDialog
            folderId={arranging}
            folderIds={folderIds}
            onClose={() => setArranging(null)}
          />
        </Suspense>
      ) : null}
    </>
  );
}
