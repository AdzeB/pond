import { useHotkey } from "@tanstack/react-hotkeys";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { MediaViewer } from "@/components/save-media-viewer";
import { useSave } from "@/hooks/use-saves";
import { presentation, usePresentationId } from "@/stores/presentation";
import styles from "./styles.module.css";

export function Presentation() {
  const id = usePresentationId();
  if (!id) return null;
  return <PresentationOverlay id={id} />;
}

function PresentationOverlay({ id }: { id: string }) {
  const save = useSave(id);

  useHotkey("Escape", () => presentation.close());
  useHotkey("F5", () => presentation.close());

  useEffect(() => {
    const el = document.documentElement;
    void el.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  if (!save) return null;

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss
    <div
      className={styles.overlay}
      onDoubleClick={() => presentation.close()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={styles.stage}>
        <MediaViewer save={save} />
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={() => presentation.close()}
        aria-label="Exit presentation mode (Esc)"
      >
        Esc
      </button>
    </div>,
    document.body,
  );
}
