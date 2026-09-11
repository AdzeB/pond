import { Button } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useEffect, useRef, useState } from "react";
import { resultNavigation } from "@/features/library/state/result-navigation";
import { StoredFileViewer } from "@/features/saves/components/viewers/file-viewer/file-viewer";
import {
  MediaViewer,
  type ViewerNav,
} from "@/features/saves/components/viewers/media-viewer/media-viewer";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves, refreshSaves } from "@/features/saves/lib/ensure-saves";
import { storedFileViewerKind } from "@/features/saves/lib/media/file-viewer";
import { pickPrimaryFile } from "@/features/saves/lib/media/units";
import { normalise } from "@/features/saves/lib/reconcile";
import { pool } from "@/features/saves/state/pool";
import { useShortcutBindings } from "@/shared/lib/shortcuts";
import styles from "./preview-shell.module.css";

export function PreviewShell({ id }: { id: string }) {
  const [currentId, setCurrentId] = useState(id);
  const current = useRef(id);
  const nav = useRef<ViewerNav | null>(null);
  const queue = useRef(Promise.resolve());
  const shortcuts = useShortcutBindings();
  const [navigationMessage, setNavigationMessage] = useState<string | null>(
    null,
  );
  const showSave = (next: string) => {
    current.current = next;
    setCurrentId(next);
    setNavigationMessage(null);
  };
  const step = (delta: -1 | 1, withinSave = true) => {
    if (withinSave && nav.current?.step(delta)) return;
    queue.current = queue.current
      .then(async () => {
        const next = await window.pond.query("preview.neighbor", {
          id: current.current,
          delta,
        });
        if (!next.id) {
          setNavigationMessage(
            delta < 0
              ? "No previous save in this view."
              : "No next save in this view.",
          );
          return;
        }
        await ensureSaves([next.id]);
        showSave(next.id);
      })
      .catch(() =>
        setNavigationMessage("Couldn’t load the next preview. Try again."),
      );
  };
  useHotkey(shortcuts["viewer.step-prev"].keys!, () => step(-1), {
    ignoreInputs: true,
  });
  useHotkey(shortcuts["viewer.step-next"].keys!, () => step(1), {
    ignoreInputs: true,
  });
  useHotkey(shortcuts["viewer.prev-save"].keys!, () => step(-1, false), {
    ignoreInputs: true,
  });
  useHotkey(shortcuts["viewer.next-save"].keys!, () => step(1, false), {
    ignoreInputs: true,
  });
  useEffect(() => {
    resultNavigation.setSource({
      ids: [currentId],
      neighbor: async (id, delta) =>
        (
          await window.pond.query("preview.neighbor", {
            id,
            delta: delta > 0 ? 1 : -1,
          })
        ).id,
    });
    return () => resultNavigation.setSource({ ids: [] });
  }, [currentId]);
  useEffect(
    () =>
      window.pond.onSyncAction(() => {
        void refreshSaves([current.current]).catch(() => {});
      }),
    [],
  );
  const root = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [error, setError] = useState(false);
  const save = useSave(currentId);
  useEffect(() => {
    void window.pond
      .query("preview.configure", {})
      .then((settings) => {
        if (settings.ok) {
          setPinned(settings.pinned);
          setOpacity(settings.opacity);
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    current.current = id;
    setCurrentId(id);
  }, [id]);
  useEffect(() => {
    let active = true;
    setError(false);
    void window.pond
      .query("saves.get", { id: currentId })
      .then((raw) => {
        const next = normalise(raw);
        if (active && next) pool.upsert(next);
        else if (active) setError(true);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [currentId]);
  if (error)
    return (
      <div className={styles.root}>
        Couldn’t load this preview. Close it and try again.
      </div>
    );
  if (!save) return <div className={styles.root}>Loading preview</div>;
  const file = pickPrimaryFile(save);
  return (
    <div ref={root} className={styles.root}>
      <div className={styles.title}>{save.title || "Preview"}</div>
      <div className={styles.viewer}>
        {file && storedFileViewerKind(file) ? (
          <StoredFileViewer save={save} file={file} />
        ) : (
          <MediaViewer
            key={save.id}
            save={save}
            navRef={nav}
            onNavigate={showSave}
          />
        )}
      </div>
      <div className={styles.tools}>
        <Button size="sm" variant="secondary" onClick={() => step(-1)}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" onClick={() => step(1)}>
          Next
        </Button>
        {navigationMessage ? (
          <span role="status">{navigationMessage}</span>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={pinned}
          onClick={() => {
            void window.pond
              .query("preview.configure", { pinned: !pinned })
              .then((settings) => {
                if (settings.ok) setPinned(settings.pinned);
              });
          }}
        >
          {pinned ? "Unpin" : "Pin on Top"}
        </Button>
        <label className={styles.opacity}>
          Opacity{" "}
          <input
            type="range"
            aria-label="Preview Opacity"
            min={0.2}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(event) => {
              const value = Number(event.target.value);
              setOpacity(value);
              void window.pond.query("preview.configure", { opacity: value });
            }}
          />
        </label>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const image = root.current?.querySelector("[data-active] img");
            const video = root.current?.querySelector("[data-active] video");
            const width =
              image instanceof HTMLImageElement
                ? image.naturalWidth
                : video instanceof HTMLVideoElement
                  ? video.videoWidth
                  : save.width;
            const height =
              image instanceof HTMLImageElement
                ? image.naturalHeight
                : video instanceof HTMLVideoElement
                  ? video.videoHeight
                  : save.height;
            if (width && height)
              void window.pond.query("preview.configure", {
                fit: { width, height },
              });
          }}
        >
          Fit Window to Image
        </Button>
      </div>
    </div>
  );
}
