import { Button, Dialog } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useEffect, useRef, useState } from "react";
import { CardThumb } from "@/features/saves/components/card/media";
import { StoredFileViewer } from "@/features/saves/components/viewers/file-viewer";
import {
  MediaViewer,
  type ViewerNav,
} from "@/features/saves/components/viewers/media-viewer";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { storedFileViewerKind } from "@/features/saves/lib/media/file-viewer";
import { pickPrimaryFile } from "@/features/saves/lib/media/units";
import { saveIdFromPath } from "@/features/saves/lib/save-nav";
import { selectOnlySave } from "@/features/saves/lib/select";
import { inspect, useInspect } from "@/features/saves/state/inspect";
import { resultNavigation } from "@/features/saves/state/result-navigation";
import {
  selection,
  useSelectionAnchor,
  useSelectionSize,
} from "@/features/saves/state/selection";
import { usePrefs } from "@/features/settings/state/prefs";
import { getAppRouter } from "@/shared/lib/app-router";
import { isEditableTarget } from "@/shared/lib/editable-target";
import { bindingKeys, useShortcutBindings } from "@/shared/lib/shortcuts";
import styles from "./styles.module.css";

export function HoverPreview() {
  const [open, setOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const heldKey = useRef<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const viewerNav = useRef<ViewerNav | null>(null);
  const navigation = useRef(Promise.resolve());
  const [prefs] = usePrefs("viewer");
  const shortcuts = useShortcutBindings();
  const { grayscale, compare } = useInspect();
  const selectedCount = useSelectionSize();
  const selectedId = useSelectionAnchor();
  const compareIds = compare ? [...selection.snapshot()].slice(0, 2) : [];
  const save = useSave(open ? selectedId : hoverId);
  const compareA = useSave(compareIds[0] ?? null);
  const compareB = useSave(compareIds[1] ?? null);

  useHotkey(
    bindingKeys(shortcuts, "grid.preview"),
    (event) => {
      if (event.repeat || isEditableTarget(event.target)) return;
      if (saveIdFromPath(getAppRouter()?.state.location.pathname ?? "")) return;
      if (!selection.getAnchor()) return;
      if (
        open &&
        document.querySelector(
          "[data-quick-preview] video, [data-quick-preview] [data-gif-player]",
        )
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("button") &&
        !event.target.closest("[data-save-id]")
      )
        return;
      event.preventDefault();
      heldKey.current = event.code;
      setOpen((previous) =>
        prefs.spaceBehavior === "hold" ? true : !previous,
      );
    },
    { preventDefault: false, ignoreInputs: true },
  );

  const showSave = async (id: string) => {
    await ensureSaves([id]);
    selectOnlySave(id);
  };
  const step = (delta: number, withinSave: boolean) => {
    if (withinSave && viewerNav.current?.step(delta)) return;
    navigation.current = navigation.current
      .then(async () => {
        const id = selection.getAnchor();
        if (!id) return;
        const next = await resultNavigation.next(id, delta);
        if (next) await showSave(next);
      })
      .catch(() => {});
  };
  useHotkey(bindingKeys(shortcuts, "viewer.step-prev"), () => step(-1, true), {
    enabled: open,
    ignoreInputs: true,
  });
  useHotkey(bindingKeys(shortcuts, "viewer.step-next"), () => step(1, true), {
    enabled: open,
    ignoreInputs: true,
  });
  useHotkey(bindingKeys(shortcuts, "viewer.prev-save"), () => step(-1, false), {
    enabled: open,
    ignoreInputs: true,
  });
  useHotkey(bindingKeys(shortcuts, "viewer.next-save"), () => step(1, false), {
    enabled: open,
    ignoreInputs: true,
  });

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        isEditableTarget(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.key.toLowerCase() === "z" && !open)
        setHoverId(selection.getAnchor());
    };
    const up = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "z") setHoverId(null);
      if (event.code === heldKey.current && prefs.spaceBehavior === "hold")
        setOpen(false);
    };
    const blur = () => {
      setHoverId(null);
      if (prefs.spaceBehavior === "hold") setOpen(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [open, prefs.spaceBehavior]);

  if (!save && !compare) return null;
  if (!open && !compare && save)
    return (
      <div className={styles.root}>
        <div className={styles.frame} data-grayscale={grayscale || undefined}>
          <CardThumb save={save} />
        </div>
      </div>
    );
  const file = save ? pickPrimaryFile(save) : null;
  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) {
          setOpen(false);
          inspect.setCompare(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          ref={popupRef}
          initialFocus={popupRef}
          tabIndex={-1}
          className={styles.popup}
          data-quick-preview
        >
          <Dialog.Title className={styles["sr-only"]}>
            {compare ? "Compare Saves" : save?.title || "Preview"}
          </Dialog.Title>
          <div className={styles.viewer}>
            {compare && compareA && compareB ? (
              <div className={styles.compare}>
                <div
                  className={styles.frame}
                  data-grayscale={grayscale || undefined}
                >
                  <CardThumb save={compareA} />
                </div>
                <div
                  className={styles.frame}
                  data-grayscale={grayscale || undefined}
                >
                  <CardThumb save={compareB} />
                </div>
              </div>
            ) : save ? (
              file && storedFileViewerKind(file) ? (
                <StoredFileViewer save={save} file={file} />
              ) : (
                <MediaViewer
                  key={save.id}
                  save={save}
                  onNavigate={(id) => {
                    void showSave(id).catch(() => {});
                  }}
                  navRef={viewerNav}
                  showControls={false}
                />
              )
            ) : null}
          </div>
          {selectedCount >= 2 ? (
            <div className={styles.tools}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => inspect.toggleCompare()}
              >
                {compare ? "Close Comparison" : "Compare"}
              </Button>
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
