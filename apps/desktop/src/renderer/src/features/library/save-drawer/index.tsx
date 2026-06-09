import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconChevronRightOutline18 as ChevronRight,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { Button, Drawer, Tooltip } from "@pond/ui";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";
import { useSave, useSaves } from "@/core/data/hooks";
import { primarySelection, primarySelectionStore } from "@/core/data/selection";
import { useSaveList } from "@/features/library/hooks/use-save-list";
import { KebabMenu } from "@/features/library/menus/inspector-kebab";
import { useTrackVisit } from "@/features/library/stores/recents";
import { SavePreview } from "@/features/save/preview";
import styles from "./styles.module.css";

// TEMP(design): keep the drawer open by default so the design can be tweaked
// without clicking a card. When nothing is selected it falls back to the first
// save so there's real content to look at.
const KEEP_OPEN_FOR_DESIGN = true;

export function SaveDrawer() {
  const selectedId = useStore(primarySelectionStore, (s) => s.id);
  const saves = useSaves();
  const fallbackId = KEEP_OPEN_FOR_DESIGN ? (saves[0]?.id ?? null) : null;
  const id = selectedId ?? fallbackId;
  const save = useSave(id ?? undefined);
  const list = useSaveList({ activeId: id ?? null });

  useTrackVisit(id);

  // Global j/k/Esc navigation. Mirrors the old detail page so muscle memory
  // carries over, but steps the client-side selection instead of the route.
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
      } else if (e.key === "Escape") {
        e.preventDefault();
        primarySelection.set(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, list.nextId, list.prevId]);

  const counter =
    list.index >= 0 ? `${list.index + 1} / ${list.total}` : `- / ${list.total}`;

  return (
    <Drawer.Root
      open={id != null}
      onOpenChange={(open) => {
        // While pinned open for design, ignore swipe/esc dismissals.
        if (KEEP_OPEN_FOR_DESIGN) return;
        if (!open) primarySelection.set(null);
      }}
      modal={false}
      swipeDirection="right"
      disablePointerDismissal
    >
      <Drawer.Portal keepMounted={false}>
        <Drawer.Viewport>
          <Drawer.Popup>
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
                <Drawer.Close
                  render={
                    <Button
                      icon
                      size="sm"
                      variant="ghost"
                      aria-label="Close"
                    />
                  }
                >
                  <X />
                </Drawer.Close>
              </div>
            </div>

            <Drawer.Title className={styles.srOnly}>
              {save?.title ?? "Save details"}
            </Drawer.Title>

            <Drawer.Content className={styles.body}>
              {save ? (
                <SavePreview save={save} />
              ) : (
                <p className={styles.empty}>Save not found.</p>
              )}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
