import {
  IconPencilOutline18,
  IconPlusOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import type { VideoNote } from "@pond/schema/db";
import { Button, Input } from "@pond/ui";
import { useMemo, useRef, useState } from "react";
import { ulid } from "ulid";
import { CommentsEmpty } from "@/features/saves/components/annotations/comments-empty";
import { VideoNoteEditor } from "@/features/saves/components/annotations/video-note-editor";
import { Section } from "@/features/saves/components/detail/section";
import {
  deleteVideoNote,
  saveVideoNote,
} from "@/features/saves/lib/annotations";
import {
  useActiveMediaSeek,
  useActiveMediaTime,
} from "@/features/saves/state/active-media";
import { useSaveViewerFileIndex } from "@/features/saves/state/save-viewer";
import type { Save } from "@/features/saves/types";
import { formatDuration } from "@/shared/lib/format";
import styles from "./styles.module.css";

export function VideoCommentsSection({
  save,
  fileIndex: suppliedFileIndex,
  bare = false,
}: {
  save: Save;
  fileIndex?: number;
  bare?: boolean;
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
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);

  const pending = useRef(false);
  const [editing, setEditing] = useState<VideoNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addComment = async () => {
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
      setComposing(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn’t save this comment.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const addButton = (
    <Button
      type="button"
      icon
      size="xs"
      variant="ghost"
      aria-label="Add Comment"
      disabled={!seek}
      onClick={() => setComposing(true)}
    >
      <IconPlusOutline18 />
    </Button>
  );
  const comments = (
    <>
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
                icon
                size="xs"
                variant="ghost"
                aria-label={`Edit comment: ${note.text}`}
                disabled={busy}
                onClick={() => setEditing(note)}
              >
                <IconPencilOutline18 />
              </Button>
              <Button
                type="button"
                icon
                size="xs"
                variant="ghost"
                aria-label={`Delete comment: ${note.text}`}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void deleteVideoNote(save.id, note.id)
                    .catch((reason) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Couldn’t delete this comment.",
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              >
                <IconXmarkOutline18 />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {composing ? (
        <div className={styles.compose}>
          <Input.Field
            className={styles.input}
            value={draft}
            aria-label="Video comment"
            placeholder={`Add a comment at ${formatDuration(currentTime)}`}
            disabled={busy || !seek}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft("");
                setComposing(false);
              } else if (e.key === "Enter") {
                e.preventDefault();
                void addComment();
              }
            }}
          />
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={busy || !seek || !draft.trim()}
            loading={busy}
            onClick={() => void addComment()}
          >
            Add
          </Button>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {bare ? (
        <div className={styles.bare}>
          {notes.length > 0 ? comments : <CommentsEmpty />}
        </div>
      ) : (
        <Section
          title="Comments"
          empty={notes.length === 0 && !composing}
          action={addButton}
        >
          {comments}
        </Section>
      )}
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
