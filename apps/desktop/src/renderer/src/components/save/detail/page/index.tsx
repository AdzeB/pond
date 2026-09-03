import { useHotkeys } from "@tanstack/react-hotkeys";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SaveArchiveViewer } from "@/components/save/archive-viewer";
import { StoredFileViewer } from "@/components/save/file-viewer";
import { MediaViewer, type ViewerNav } from "@/components/save/media-viewer";
import {
  buildViewerMenu,
  fileIndexFromSlide,
} from "@/components/save/media-viewer/lib/menu";
import { TextViewer } from "@/components/save/text-viewer";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { AppShell } from "@/components/shell/app-shell";
import { useSave } from "@/hooks/use-saves";
import { hasArchive } from "@/lib/media/archive";
import { storedFileViewerKind } from "@/lib/media/file-viewer";
import { pickPrimaryFile } from "@/lib/media/units";
import { SHORTCUTS } from "@/lib/save/shortcuts";
import { isTextOnlySave } from "@/lib/save/text";
import { closeSave, openSave } from "@/lib/ui/save-nav";
import { libraryViewContext } from "@/stores/library-view-context";
import { useTrackVisit } from "@/stores/recents";
import { setSaveViewerFileIndex } from "@/stores/save-viewer";
import { primarySelection, selection } from "@/stores/selection";
import { tagClipboard } from "@/stores/tag-clipboard";
import styles from "./styles.module.css";

export function SaveDetailPage() {
  const { id } = useParams({ from: "/_library/save/$id" });
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

  const viewerNav = useRef<ViewerNav | null>(null);

  const stepImageOrSave = useCallback(
    (delta: number) => {
      if (viewerNav.current?.step(delta)) return;
      stepSave(delta);
    },
    [stepSave],
  );

  useHotkeys([
    {
      hotkey: SHORTCUTS["viewer.step-prev"].keys!,
      callback: () => stepImageOrSave(-1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["viewer.step-next"].keys!,
      callback: () => stepImageOrSave(1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["viewer.prev-save"].keys!,
      callback: () => stepSave(-1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["viewer.next-save"].keys!,
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
    setSaveViewerFileIndex(fileIndex);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: id is the trigger, not a read
  useEffect(() => {
    setActiveFileIndex(null);
    setSaveViewerFileIndex(null);
    return () => setSaveViewerFileIndex(null);
  }, [id]);

  const menuVideo = useRef<HTMLVideoElement | null>(null);
  const menuFileIndex = useRef<number | null>(null);

  if (!save) {
    return (
      <AppShell.Content>
        <div className={styles.page} />
      </AppShell.Content>
    );
  }

  const storedFile = pickPrimaryFile(save);
  const storedViewerKind = storedFileViewerKind(storedFile);

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
        <div className={styles.page}>
          <div className={styles.main}>
            {hasArchive(save) ? (
              <SaveArchiveViewer save={save} />
            ) : isTextOnlySave(save) ? (
              <TextViewer save={save} />
            ) : storedFile && storedViewerKind ? (
              <StoredFileViewer save={save} file={storedFile} />
            ) : (
              <MediaViewer
                save={save}
                onActiveFileIndexChange={onActiveFileIndexChange}
                navRef={viewerNav}
              />
            )}
          </div>
        </div>
      </SpecContextMenu>
    </AppShell.Content>
  );
}
