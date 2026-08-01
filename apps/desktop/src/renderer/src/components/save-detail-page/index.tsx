import { useHotkeys } from "@tanstack/react-hotkeys";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
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
import { closeSave, openSave } from "@/lib/ui/save-nav";
import { libraryViewContext } from "@/stores/library-view-context";
import { useTrackVisit } from "@/stores/recents";
import { useSaveDetailsOpen } from "@/stores/save-detail-prefs";
import { primarySelection, selection } from "@/stores/selection";
import { tagClipboard } from "@/stores/tag-clipboard";
import styles from "./styles.module.css";

export function SaveDetailPage() {
  const { id } = useParams({ from: "/_library/save/$id" });
  const detailsOpen = useSaveDetailsOpen();
  const save = useSave(id);
  useTrackVisit(id);

  useEffect(() => {
    if (primarySelection.get() !== id) primarySelection.set(id);
    selection.setAnchor(id);
  }, [id]);

  const stepSave = useCallback(
    (delta: number) => {
      const ids = libraryViewContext.filteredIds();
      const idx = ids.indexOf(id);
      if (idx < 0) return;
      const next = ids[idx + delta];
      if (!next) return;
      selection.setAnchor(next);
      openSave(next);
    },
    [id],
  );

  useHotkeys([
    {
      hotkey: SHORTCUTS["viewer.prev-save"].keys,
      callback: () => stepSave(-1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["viewer.next-save"].keys,
      callback: () => stepSave(1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: "Escape",
      callback: () => {
        closeSave();
      },
      options: { ignoreInputs: true },
    },
  ]);

  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const onActiveFileIndexChange = useCallback((fileIndex: number | null) => {
    setActiveFileIndex(fileIndex);
  }, []);

  useEffect(() => {
    setActiveFileIndex(null);
  }, []);

  const menuVideo = useRef<HTMLVideoElement | null>(null);
  const menuFileIndex = useRef<number | null>(null);

  if (!save) {
    return (
      <AppShell.Content>
        <div className={styles.page} />
      </AppShell.Content>
    );
  }

  return (
    <AppShell.Content>
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
          menuFileIndex.current = fileIndexFromSlide(slide) ?? activeFileIndex;
        }}
      >
        <div
          className={styles.page}
          data-details={detailsOpen ? "open" : "closed"}
        >
          <div className={styles.main}>
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
        </div>
      </SpecContextMenu>
    </AppShell.Content>
  );
}
