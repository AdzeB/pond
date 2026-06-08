import { IconXmarkOutline18 as X } from "@pond/icons/outline/18";
import type { VideoNote } from "@pond/schema/db";
import { type RefObject, useCallback, useMemo, useState } from "react";
import { ulid } from "ulid";
import { mutateSave } from "@/core/data/mutate-save";
import type { Save } from "@/core/data/types";
import styles from "./styles.module.css";

export function VideoNotes({
  save,
  videoRef,
}: {
  save: Save;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const [draft, setDraft] = useState("");
  const notes = useMemo(
    () => (save.videoNotes ?? []).toSorted((a, b) => a.timeSec - b.timeSec),
    [save.videoNotes],
  );

  const persist = useCallback(
    (next: VideoNote[]) => mutateSave(save.id, { videoNotes: next }),
    [save.id],
  );

  const addAtCurrent = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const timeSec = Math.floor(videoRef.current?.currentTime ?? 0);
    void persist([...(save.videoNotes ?? []), { id: ulid(), timeSec, text }]);
    setDraft("");
  }, [draft, persist, save.videoNotes, videoRef]);

  const remove = useCallback(
    (id: string) => persist((save.videoNotes ?? []).filter((n) => n.id !== id)),
    [persist, save.videoNotes],
  );

  const seek = useCallback(
    (timeSec: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = timeSec;
      void video.play().catch(() => {});
    },
    [videoRef],
  );

  return (
    <div className={styles.root}>
      <div className={styles.add}>
        <input
          className={styles.input}
          placeholder="Note at current time"
          value={draft}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addAtCurrent();
            }
          }}
        />
        <button
          type="button"
          className={styles["add-button"]}
          onClick={addAtCurrent}
        >
          Add
        </button>
      </div>
      {notes.length > 0 ? (
        <ul className={styles.list}>
          {notes.map((n) => (
            <li key={n.id} className={styles.item}>
              <button
                type="button"
                className={styles.time}
                onClick={() => seek(n.timeSec)}
              >
                {formatTime(n.timeSec)}
              </button>
              <span className={styles.text}>{n.text}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label="Remove note"
                onClick={() => remove(n.id)}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
