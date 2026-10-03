import { useHotkeys } from "@tanstack/react-hotkeys";
import { useParams } from "@tanstack/react-router";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppShell } from "@/features/library/components/workspace-shell";
import { SaveArchiveViewer } from "@/features/saves/components/viewers/archive-viewer";
import type { ViewerNav } from "@/features/saves/components/viewers/media-viewer";
import {
  buildViewerMenu,
  fileIndexFromSlide,
} from "@/features/saves/components/viewers/media-viewer/lib/menu";
import { SaveViewer } from "@/features/saves/components/viewers/save-viewer";
import { TextViewer } from "@/features/saves/components/viewers/text-viewer";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { saveOwnsKeyboard } from "@/features/saves/lib/keyboard-owner";
import { hasArchive } from "@/features/saves/lib/media/archive";
import {
  loadOpenWithApps,
  type OpenWithApp,
  openWithKind,
  peekOpenWithApps,
} from "@/features/saves/lib/menu";
import { closeSave, openSave } from "@/features/saves/lib/save-nav";
import { isTextOnlySave } from "@/features/saves/lib/text";
import { useTrackVisit } from "@/features/saves/state/recents";
import { resultNavigation } from "@/features/saves/state/result-navigation";
import { setSaveViewerFileIndex } from "@/features/saves/state/save-viewer";
import { primarySelection, selection } from "@/features/saves/state/selection";
import type { Save } from "@/features/saves/types";
import { tagClipboard } from "@/features/tags/state/tag-clipboard";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { bindingKeys, useShortcutBindings } from "@/shared/lib/shortcuts";
import styles from "./styles.module.css";

export function SaveDetailPage() {
  const { id } = useParams({ from: "/_library/save/$id" });
  const save = useSave(id);
  const shortcuts = useShortcutBindings();
  useTrackVisit(id);

  useEffect(() => {
    if (primarySelection.get() !== id) primarySelection.set(id);
    selection.setCursor(id);
  }, [id]);

  const stepSave = useCallback(
    (delta: number) => {
      void resultNavigation.next(id, delta).then(async (next) => {
        if (!next || selection.getCursor() !== id) return;
        await ensureSaves([next]);
        if (selection.getCursor() !== id) return;
        openSave(next);
      });
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

  useHotkeys(
    [
      {
        hotkey: bindingKeys(shortcuts, "viewer.step-prev"),
        callback: () => stepImageOrSave(-1),
        options: { ignoreInputs: true },
      },
      {
        hotkey: bindingKeys(shortcuts, "viewer.step-next"),
        callback: () => stepImageOrSave(1),
        options: { ignoreInputs: true },
      },
      {
        hotkey: bindingKeys(shortcuts, "viewer.prev-save"),
        callback: () => stepSave(-1),
        options: { ignoreInputs: true },
      },
      {
        hotkey: bindingKeys(shortcuts, "viewer.next-save"),
        callback: () => stepSave(1),
        options: { ignoreInputs: true },
      },
      {
        hotkey: "Escape" as const,
        callback: closeSave,
        options: { ignoreInputs: true },
      },
    ].map((binding) => ({
      ...binding,
      callback: (event: KeyboardEvent) => {
        if (!saveOwnsKeyboard(event)) return;
        if (
          event.key !== "Escape" &&
          event.target instanceof HTMLElement &&
          event.target.closest("button, input, [role='slider']")
        )
          return;
        event.preventDefault();
        binding.callback();
      },
      options: { ...binding.options, preventDefault: false },
    })),
  );

  return <SaveDetailSession key={id} save={save} viewerNav={viewerNav} />;
}

function SaveDetailSession({
  save,
  viewerNav,
}: {
  save: Save | undefined;
  viewerNav: RefObject<ViewerNav | null>;
}) {
  const pageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    pageRef.current?.focus({ preventScroll: true });
  }, []);
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
        <section
          ref={pageRef}
          className={styles.page}
          data-save-details=""
          tabIndex={-1}
          aria-label={save.title || "Save viewer"}
        >
          <div className={styles.main}>
            {hasArchive(save) ? (
              <SaveArchiveViewer save={save} />
            ) : isTextOnlySave(save) ? (
              <TextViewer save={save} />
            ) : (
              <SaveViewer
                save={save}
                onActiveFileIndexChange={onActiveFileIndexChange}
                navRef={viewerNav}
              />
            )}
          </div>
        </section>
      </SpecContextMenu>
    </AppShell.Content>
  );
}
