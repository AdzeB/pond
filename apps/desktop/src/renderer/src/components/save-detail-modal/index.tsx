import { Dialog, TitleBar } from "@pond/ui";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { useSelector } from "@tanstack/react-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { SaveArchiveViewer } from "@/components/save-archive-viewer";
import { SaveDetails } from "@/components/save-detail-pane";
import { MediaViewer } from "@/components/save-media-viewer";
import {
  buildViewerMenu,
  fileIndexFromSlide,
} from "@/components/save-media-viewer/lib/menu";
import { SpecContextMenu } from "@/components/spec-context-menu";
import { useSave } from "@/hooks/use-saves";
import { hasArchive } from "@/lib/media/archive";
import { SHORTCUTS } from "@/lib/save/shortcuts";
import { formatTimestampLine } from "@/lib/util/format";
import { libraryViewContext } from "@/stores/library-view-context";
import { useTrackVisit } from "@/stores/recents";
import { useSaveDetailsOpen } from "@/stores/save-detail-prefs";
import {
  primarySelection,
  primarySelectionStore,
  selection,
} from "@/stores/selection";
import { tagClipboard } from "@/stores/tag-clipboard";
import styles from "./styles.module.css";

/** Steps the primary selection through the library view underneath the modal. */
function stepSave(delta: number): void {
  const current = primarySelection.get();
  if (!current) return;
  const ids = libraryViewContext.filteredIds();
  const idx = ids.indexOf(current);
  if (idx < 0) return;
  const next = ids[idx + delta];
  if (!next) return;
  primarySelection.set(next);
  /** Keep the grid cursor under the modal in step so closing lands where you left off. */
  selection.setAnchor(next);
}

export function SaveDetailModal() {
  const id = useSelector(primarySelectionStore, (s) => s.id);
  const detailsOpen = useSaveDetailsOpen();

  useHotkeys([
    {
      /** Mod+Arrow is home/end in macOS text fields; never step saves while typing in the details pane. */
      hotkey: SHORTCUTS["viewer.prev-save"].keys,
      callback: () => stepSave(-1),
      options: { enabled: id != null, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["viewer.next-save"].keys,
      callback: () => stepSave(1),
      options: { enabled: id != null, ignoreInputs: true },
    },
  ]);

  const lastId = useRef<string | null>(null);
  if (id != null) lastId.current = id;
  const renderId = id ?? lastId.current;

  const save = useSave(renderId);
  useTrackVisit(id);

  /** Centred slide in the media viewer; kebab and context menus target this file. */
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const onActiveFileIndexChange = useCallback((fileIndex: number | null) => {
    setActiveFileIndex(fileIndex);
  }, []);

  useEffect(() => {
    setActiveFileIndex(null);
  }, []);

  /** The slide under the cursor at open time, so file/frame actions target what is on screen. */
  const menuVideo = useRef<HTMLVideoElement | null>(null);
  const menuFileIndex = useRef<number | null>(null);

  /** The closed root must still mount: Base UI only plays enter transitions when `open` flips while the root is mounted. */
  if (!save) {
    return (
      <Dialog.Root open={false}>
        <Dialog.Portal />
      </Dialog.Root>
    );
  }

  const title = save.title ?? save.author ?? "Untitled";
  const timestamp = formatTimestampLine(save.savedAt ?? save.createdAt);

  return (
    <Dialog.Root
      open={id != null}
      onOpenChange={(open) => {
        if (!open) primarySelection.set(null);
      }}
    >
      <Dialog.Portal>
        <SpecContextMenu
          buildItems={() =>
            buildViewerMenu(save, {
              clipboardEmpty: tagClipboard.get().length === 0,
              video: menuVideo.current,
              fileIndex: menuFileIndex.current ?? activeFileIndex,
            })
          }
          onOpen={(eventDetails) => {
            const target = eventDetails.event?.target;
            const slide =
              target instanceof Element
                ? target.closest("[data-blossom-slide]")
                : null;
            menuVideo.current =
              slide?.querySelector<HTMLVideoElement>("video") ?? null;
            menuFileIndex.current =
              fileIndexFromSlide(slide) ?? activeFileIndex;
          }}
        >
          <Dialog.Popup
            className={styles.popup}
            data-details={detailsOpen ? "open" : "closed"}
          >
            <div className={styles.main}>
              <TitleBar.Root className={styles.header}>
                <TitleBar.Title>
                  <TitleBar.Label>{title}</TitleBar.Label>
                  {timestamp ? (
                    <TitleBar.Meta>{timestamp}</TitleBar.Meta>
                  ) : null}
                </TitleBar.Title>
              </TitleBar.Root>

              {hasArchive(save) ? (
                <SaveArchiveViewer save={save} />
              ) : (
                <MediaViewer
                  save={save}
                  onActiveFileIndexChange={onActiveFileIndexChange}
                />
              )}
            </div>

            <div className={styles.pane} inert={!detailsOpen}>
              <SaveDetails save={save} fileIndex={activeFileIndex} />
            </div>
          </Dialog.Popup>
        </SpecContextMenu>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
