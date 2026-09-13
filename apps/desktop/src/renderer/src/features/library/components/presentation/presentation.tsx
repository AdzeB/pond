import { Button, Dialog, Input } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { resultNavigation } from "@/features/library/state/result-navigation";
import { selection } from "@/features/library/state/selection";
import { StoredFileViewer } from "@/features/saves/components/viewers/file-viewer/file-viewer";
import {
  MediaViewer,
  type ViewerNav,
} from "@/features/saves/components/viewers/media-viewer/media-viewer";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { storedFileViewerKind } from "@/features/saves/lib/media/file-viewer";
import {
  buildMediaUnits,
  pickPrimaryFile,
} from "@/features/saves/lib/media/units";
import { selectOnlySave } from "@/features/saves/lib/select";
import { useShortcutBindings } from "@/shared/lib/shortcuts";
import styles from "./presentation.module.css";

export function Presentation({ onClose }: { onClose: () => void }) {
  const intervalId = useId();
  const popup = useRef<HTMLDivElement>(null);
  const nav = useRef<ViewerNav | null>(null);
  const [ids, setIds] = useState<readonly string[]>([]);
  const [id, setId] = useState<string | null>(selection.getAnchor());
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const save = useSave(id);
  const file = save ? pickPrimaryFile(save) : null;
  const shortcuts = useShortcutBindings();
  useEffect(() => {
    let active = true;
    void resultNavigation
      .ids()
      .then((results) => {
        if (!active) return;
        setIds(results);
        setId((selected) =>
          selected && results.includes(selected)
            ? selected
            : (results[0] ?? null),
        );
        setReady(true);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Couldn’t load the presentation.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void ensureSaves([id]).catch((error) => {
      if (active)
        setError(
          error instanceof Error ? error.message : "Couldn’t load this save.",
        );
    });
    return () => {
      active = false;
    };
  }, [id]);
  const step = useCallback(
    (delta: number, withinSave = true) => {
      if (withinSave && nav.current?.step(delta)) return;
      const index = id ? ids.indexOf(id) : -1;
      const next = index >= 0 ? ids[index + delta] : undefined;
      if (next) setId(next);
      else setPlaying(false);
    },
    [id, ids],
  );
  const close = () => {
    if (id) {
      selectOnlySave(id);
      void resultNavigation.reveal(id);
    }
    onClose();
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
  useHotkey(
    "Space",
    (event) => {
      if (
        popup.current?.querySelector("video, [data-gif-player]") ||
        event.target instanceof HTMLButtonElement
      )
        return;
      event.preventDefault();
      setPlaying((value) => !value);
    },
    { ignoreInputs: true, preventDefault: false },
  );
  useEffect(() => {
    if (!playing || !save) return;
    const timer = window.setInterval(() => step(1), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [playing, save, seconds, step]);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          ref={popup}
          initialFocus={popup}
          tabIndex={-1}
          className={styles.popup}
          data-presentation
        >
          <Dialog.Header>
            <Dialog.Title>{save?.title || "Presentation"}</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <div className={styles.stage}>
            {error ? (
              <p role="alert">{error}</p>
            ) : save ? (
              file && storedFileViewerKind(file) ? (
                <StoredFileViewer key={save.id} save={save} file={file} />
              ) : buildMediaUnits(save).length ? (
                <MediaViewer
                  key={save.id}
                  save={save}
                  navRef={nav}
                  onNavigate={setId}
                />
              ) : (
                <p>{save.description || "This save has no preview."}</p>
              )
            ) : (
              <p>
                {ready
                  ? "There are no saves to present."
                  : "Loading presentation…"}
              </p>
            )}
          </div>
          <div className={styles.controls}>
            <Button size="sm" variant="secondary" onClick={() => step(-1)}>
              Previous
            </Button>
            <span>
              {id ? ids.indexOf(id) + 1 : 0} / {ids.length}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!save}
              aria-pressed={playing}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? "Pause Presentation" : "Play Presentation"}
            </Button>
            <label className={styles.interval} htmlFor={intervalId}>
              Seconds per slide
              <Input.Root size="sm">
                <Input.Field
                  id={intervalId}
                  type="number"
                  min={1}
                  max={60}
                  value={seconds}
                  onChange={(event) =>
                    setSeconds(
                      Math.min(
                        60,
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    )
                  }
                />
              </Input.Root>
            </label>
            <Button size="sm" variant="secondary" onClick={() => step(1)}>
              Next
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
