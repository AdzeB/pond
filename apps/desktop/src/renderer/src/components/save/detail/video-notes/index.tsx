import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import type { VideoNote } from "@pond/schema/db";
import { Button, Input } from "@pond/ui";
import { useMemo, useState } from "react";
import { ulid } from "ulid";
import { Section } from "@/components/save/detail/section";
import { mutateSave } from "@/lib/save/mutate";
import type { Save } from "@/lib/types";
import { formatDuration } from "@/lib/util/format";
import { useActiveMediaSeek, useActiveMediaTime } from "@/stores/active-media";
import styles from "./styles.module.css";

export function VideoNotesSection({ save }: { save: Save }) {
  const notes = useMemo(
    () => [...(save.videoNotes ?? [])].sort((a, b) => a.timeSec - b.timeSec),
    [save.videoNotes],
  );
  const seek = useActiveMediaSeek();
  const currentTime = useActiveMediaTime();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const persist = async (next: VideoNote[]) => {
    setBusy(true);
    try {
      await mutateSave(
        save.id,
        { videoNotes: next },
        { actorReason: "user:video-note" },
      );
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    const text = draft.trim();
    if (!text) return;
    const note: VideoNote = {
      id: ulid(),
      timeSec: Math.max(0, currentTime),
      text,
    };
    setDraft("");
    await persist([...notes, note]);
  };

  const removeNote = async (id: string) => {
    await persist(notes.filter((n) => n.id !== id));
  };

  return (
    <Section title="Video notes">
      <div className={styles.list}>
        {notes.length === 0 ? (
          <p className={styles.empty}>No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={styles.row}>
              <button
                type="button"
                className={styles.time}
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
                aria-label="Delete Note"
                disabled={busy}
                onClick={() => void removeNote(note.id)}
              >
                <IconXmarkOutline12 />
              </Button>
            </div>
          ))
        )}
      </div>
      <div className={styles.compose}>
        <Input.Field
          className={styles.input}
          value={draft}
          placeholder={`Note at ${formatDuration(currentTime)}`}
          disabled={busy}
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
          size="sm"
          variant="ghost"
          disabled={busy || !draft.trim()}
          onClick={() => void addNote()}
        >
          Add
        </Button>
      </div>
    </Section>
  );
}
