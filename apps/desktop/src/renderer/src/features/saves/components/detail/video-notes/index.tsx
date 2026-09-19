import type { VideoNote } from "@pond/schema/db";
import { Button, Input } from "@pond/ui";
import { useMemo, useRef, useState } from "react";
import { ulid } from "ulid";
import { VideoNoteEditor } from "@/features/saves/components/annotations/video-note-editor";
import { Section } from "@/features/saves/components/detail/section";
import { saveVideoNote } from "@/features/saves/lib/annotations";
import {
  useActiveMediaSeek,
  useActiveMediaTime,
} from "@/features/saves/state/active-media";
import { useSaveViewerFileIndex } from "@/features/saves/state/save-viewer";
import type { Save } from "@/features/saves/types";
import { formatDuration } from "@/shared/lib/format";
import styles from "./styles.module.css";

export function VideoNotesSection({
  save,
  fileIndex: suppliedFileIndex,
}: {
  save: Save;
  fileIndex?: number;
}) {
  const currentFileIndex = useSaveViewerFileIndex();
  const fileIndex = suppliedFileIndex ?? currentFileIndex ?? 0;
  const notes = useMemo(
    () =>
      (save.videoNotes ?? [])
        .filter((note) => (note.fileIndex ?? 0) === fileIndex)
        .toSorted((a, b) => a.timeSec - b.timeSec),
    [save.videoNotes, fileIndex],
  );
  const seek = useActiveMediaSeek();
  const currentTime = useActiveMediaTime();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const pending = useRef(false);
  const [editing, setEditing] = useState<VideoNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addNote = async () => {
    const text = draft.trim();
    if (!text || !seek || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await saveVideoNote(save.id, {
        id: ulid(),
        timeSec: Math.max(0, currentTime),
        text,
        fileIndex,
      });
      setDraft("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Couldn’t save this note.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <Section title="Video Notes">
        {notes.length > 0 ? (
          <div className={styles.list}>
            {notes.map((note) => (
              <div key={note.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.time}
                  disabled={!seek}
                  aria-label={`Seek to ${formatDuration(note.timeSec)}`}
                  onClick={() => seek?.(note.timeSec)}
                >
                  {formatDuration(note.timeSec)}
                </button>
                <span className={styles.text}>{note.text}</span>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  aria-label={`Edit note: ${note.text}`}
                  disabled={busy}
                  onClick={() => setEditing(note)}
                >
                  Edit
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles.compose}>
          <Input.Field
            className={styles.input}
            value={draft}
            aria-label="Video note"
            placeholder={
              seek
                ? `Add a note at ${formatDuration(currentTime)}`
                : "Open a video to add a note"
            }
            disabled={busy || !seek}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addNote();
              }
            }}
          />
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={busy || !seek || !draft.trim()}
            loading={busy}
            onClick={() => void addNote()}
          >
            Add
          </Button>
        </div>
      </Section>
      {editing ? (
        <VideoNoteEditor
          saveId={save.id}
          note={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
