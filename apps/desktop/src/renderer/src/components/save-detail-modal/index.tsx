import { Dialog, TitleBar } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import { useRef } from "react";
import { SaveDetails } from "@/components/save-detail-pane";
import { MediaViewer } from "@/components/save-media-viewer";
import { useSave } from "@/hooks/use-saves";
import { formatTimestampLine } from "@/lib/util/format";
import { useTrackVisit } from "@/stores/recents";
import { useSaveDetailsOpen } from "@/stores/save-detail-prefs";
import { primarySelection, primarySelectionStore } from "@/stores/selection";
import styles from "./styles.module.css";

export function SaveModal() {
  const id = useSelector(primarySelectionStore, (s) => s.id);
  const detailsOpen = useSaveDetailsOpen();

  const lastId = useRef<string | null>(null);
  if (id != null) lastId.current = id;
  const renderId = id ?? lastId.current;

  const save = useSave(renderId);
  useTrackVisit(id);

  // Before the first selection there's nothing to render, but the (closed)
  // root must still mount: Base UI only plays enter transitions when `open`
  // flips while the root is mounted, so a root that mounts already-open
  // snaps into place with no animation.
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
        <Dialog.Popup
          className={styles.popup}
          data-details={detailsOpen ? "open" : "closed"}
        >
          <div className={styles.main}>
            <TitleBar.Root className={styles.header}>
              <TitleBar.Title>
                <TitleBar.Label>{title}</TitleBar.Label>
                {timestamp ? <TitleBar.Meta>{timestamp}</TitleBar.Meta> : null}
              </TitleBar.Title>
            </TitleBar.Root>

            <MediaViewer save={save} />
          </div>

          <div className={styles.pane} inert={!detailsOpen}>
            <SaveDetails save={save} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
