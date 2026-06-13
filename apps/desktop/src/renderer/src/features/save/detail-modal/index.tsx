import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconChevronRightOutline18 as ChevronRight,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { Button, Dialog, Tooltip } from "@pond/ui";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";
import { useSave } from "@/core/data/hooks";
import { primarySelection, primarySelectionStore } from "@/core/data/selection";
import { useSaveList } from "@/features/library/hooks/use-save-list";
import { KebabMenu } from "@/features/library/menus/inspector-kebab";
import { useTrackVisit } from "@/features/library/stores/recents";
import { SaveInfo } from "@/features/save/preview";
import { MediaViewer } from "@/features/save/preview/media-viewer";
import styles from "./styles.module.css";

// The inline, Mobbin-style detail view. Opening a save sets the primary
// selection; this dialog renders whenever something is selected and steps the
// selection (rather than the route) for j/k navigation, so browsing the
// library never spawns a separate window.
export function SaveModal() {
  const id = useStore(primarySelectionStore, (s) => s.id);
  const save = useSave(id ?? undefined);
  const list = useSaveList({ activeId: id ?? null });

  useTrackVisit(id);

  useEffect(() => {
    if (id == null) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (isInput) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        if (!list.nextId) return;
        e.preventDefault();
        primarySelection.set(list.nextId);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        if (!list.prevId) return;
        e.preventDefault();
        primarySelection.set(list.prevId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, list.nextId, list.prevId]);

  const counter =
    list.index >= 0 ? `${list.index + 1} / ${list.total}` : `- / ${list.total}`;

  return (
    <Dialog.Root
      open={id != null}
      onOpenChange={(open) => {
        if (!open) primarySelection.set(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={`${styles.popup} ${styles.modal}`}>
          <div className={styles.header}>
            <div className={styles.lead}>
              <Tooltip label="Previous (K)" side="bottom">
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label="Previous save"
                  disabled={!list.prevId}
                  onClick={() =>
                    list.prevId && primarySelection.set(list.prevId)
                  }
                >
                  <ChevronLeft />
                </Button>
              </Tooltip>
              <Tooltip label="Next (J)" side="bottom">
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label="Next save"
                  disabled={!list.nextId}
                  onClick={() =>
                    list.nextId && primarySelection.set(list.nextId)
                  }
                >
                  <ChevronRight />
                </Button>
              </Tooltip>
              <span
                className={styles.counter}
                role="status"
                aria-label="Position in list"
              >
                {counter}
              </span>
            </div>
            <div className={styles.actions}>
              {save ? <KebabMenu save={save} /> : null}
              <Dialog.Close
                render={
                  <Button icon size="sm" variant="ghost" aria-label="Close" />
                }
              >
                <X />
              </Dialog.Close>
            </div>
          </div>

          <Dialog.Title className={styles.srOnly}>
            {save?.title ?? "Save details"}
          </Dialog.Title>

          {save ? (
            <div className={styles.body}>
              <div className={styles.media}>
                <MediaViewer save={save} />
              </div>
              <div className={styles.info}>
                <SaveInfo save={save} />
              </div>
            </div>
          ) : (
            <p className={styles.empty}>Save not found.</p>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
