import { useHotkeys } from "@tanstack/react-hotkeys";
import { useParams } from "@tanstack/react-router";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppShell } from "@/features/library/components/workspace-shell/workspace-shell";
import { libraryViewContext } from "@/features/library/state/library-view-context";
import { useTrackVisit } from "@/features/library/state/recents";
import {
  primarySelection,
  selection,
} from "@/features/library/state/selection";
import { SaveArchiveViewer } from "@/features/saves/components/viewers/archive-viewer/archive-viewer";
import { StoredFileViewer } from "@/features/saves/components/viewers/file-viewer/file-viewer";
import {
  buildViewerMenu,
  fileIndexFromSlide,
} from "@/features/saves/components/viewers/media-viewer/lib/menu";
import {
  MediaViewer,
  type ViewerNav,
} from "@/features/saves/components/viewers/media-viewer/media-viewer";
import { TextViewer } from "@/features/saves/components/viewers/text-viewer";
import { useSave } from "@/features/saves/hooks/use-saves";
import { hasArchive } from "@/features/saves/lib/media/archive";
import { storedFileViewerKind } from "@/features/saves/lib/media/file-viewer";
import { pickPrimaryFile } from "@/features/saves/lib/media/units";
import {
  loadOpenWithApps,
  type OpenWithApp,
  openWithKind,
  peekOpenWithApps,
} from "@/features/saves/lib/menu";
import { closeSave, openSave } from "@/features/saves/lib/save-nav";
import { isTextOnlySave } from "@/features/saves/lib/text";
import { setSaveViewerFileIndex } from "@/features/saves/state/save-viewer";
import type { Save } from "@/features/saves/types";
import { tagClipboard } from "@/features/tags/state/tag-clipboard";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { useShortcutBindings } from "@/shared/lib/shortcuts";
import styles from "./page.module.css";

export function SaveDetailPage() {
  const { id } = useParams({ from: "/_library/save/$id" });
  const save = useSave(id);
  const shortcuts = useShortcutBindings();
  useTrackVisit(id);

  useEffect(() => {
    if (primarySelection.get() !== id) primarySelection.set(id);
    selection.setAnchor(id);
  }, [id]);

  const stepSave = useCallback(
    (delta: number) => {
      if (document.querySelector("[data-presentation]")) return;
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
      if (document.querySelector("[data-presentation]")) return;
      if (viewerNav.current?.step(delta)) return;
      stepSave(delta);
    },
    [stepSave],
  );

  useHotkeys([
    {
      hotkey: shortcuts["viewer.step-prev"].keys!,
      callback: () => stepImageOrSave(-1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["viewer.step-next"].keys!,
      callback: () => stepImageOrSave(1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["viewer.prev-save"].keys!,
      callback: () => stepSave(-1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["viewer.next-save"].keys!,
      callback: () => stepSave(1),
      options: { ignoreInputs: true },
    },
    {
      hotkey: "Escape",
      callback: () => {
        if (document.querySelector("[data-presentation]")) return;
        closeSave();
      },
      options: { ignoreInputs: true },
    },
  ]);

  return <SaveDetailSession key={id} save={save} viewerNav={viewerNav} />;
}

function SaveDetailSession({
  save,
  viewerNav,
}: {
  save: Save | undefined;
  viewerNav: RefObject<ViewerNav | null>;
}) {
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const onActiveFileIndexChange = useCallback((fileIndex: number | null) => {
    setActiveFileIndex(fileIndex);
    setSaveViewerFileIndex(fileIndex);
  }, []);

  useEffect(() => () => setSaveViewerFileIndex(null), []);

  const menuVideo = useRef<HTMLVideoElement | null>(null);
  const menuFileIndex = useRef<number | null>(null);
  const [openWithApps, setOpenWithApps] = useState<OpenWithApp[]>([]);

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
        search
        searchLabel="Search save operations"
        buildItems={() => {
          const fileIndex = menuFileIndex.current ?? activeFileIndex;
          const peeked = peekOpenWithApps(openWithKind(save, fileIndex));
          return buildViewerMenu(save, {
            clipboardEmpty: tagClipboard.get().length === 0,
            video: menuVideo.current,
            fileIndex,
            openWithApps: peeked.length ? peeked : openWithApps,
          });
        }}
        onOpen={(eventDetails) => {
          const target = eventDetails.event?.target;
          const slide =
            target instanceof Element
              ? target.closest("[data-blossom-slide]")
              : null;
          menuVideo.current =
            slide?.querySelector<HTMLVideoElement>("video") ?? null;
          menuFileIndex.current = fileIndexFromSlide(slide) ?? activeFileIndex;
          void loadOpenWithApps({
            ids: [save.id],
            fileIndex: menuFileIndex.current,
            kind: openWithKind(save, menuFileIndex.current),
            onApps: setOpenWithApps,
          });
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
