import { useEffect } from "react";
import { createPortal } from "react-dom";
import { MediaViewer } from "@/components/save/preview/media-viewer";
import { presentation, usePresentationId } from "@/lib/presentation";
import { useSave } from "@/pool/hooks";
import styles from "./styles.module.css";

export function Presentation() {
  const id = usePresentationId();
  if (!id) return null;
  return <PresentationOverlay id={id} />;
}

function PresentationOverlay({ id }: { id: string }) {
  const save = useSave(id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "F5") {
        e.preventDefault();
        presentation.close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

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
