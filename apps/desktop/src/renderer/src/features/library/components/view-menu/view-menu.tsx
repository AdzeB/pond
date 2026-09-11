import { IconEyeFill18 } from "@pond/icons/fill/18";
import { Button, Popover, Tooltip } from "@pond/ui";
import { lazy, Suspense, useMemo, useState } from "react";
import { useFolders } from "@/features/library/state/folders";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import {
  libraryHeader,
  useViewPopover,
} from "@/features/library/state/library-header";
import {
  closePresentation,
  openPresentation,
  usePresenting,
} from "@/features/library/state/presentation";
import { useIncludeSubfolders } from "@/features/library/state/view-store";
import { descendantFolderIds } from "@/features/saves/lib/nav-filter";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { DisplaySection } from "./display/display";
import { LayoutSection } from "./layout/layout";
import { SortSection } from "./sort/sort";
import styles from "./view-menu.module.css";
import { ZoomSection } from "./zoom/zoom";

const Presentation = lazy(() =>
  import("@/features/library/components/presentation/presentation").then(
    (module) => ({ default: module.Presentation }),
  ),
);
const FolderOrderDialog = lazy(() =>
  import("@/features/library/components/folder-order/folder-order-dialog").then(
    (module) => ({ default: module.FolderOrderDialog }),
  ),
);

export function ViewMenu() {
  const open = useViewPopover() !== null;
  const presenting = usePresenting();
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
              <hr className={styles.separator} />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  openPresentation();
                  libraryHeader.closePopover();
                }}
              >
                Start Presentation
              </Button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {presenting ? (
        <Suspense fallback={null}>
          <Presentation onClose={closePresentation} />
        </Suspense>
      ) : null}
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
