import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import type { VideoNote } from "@pond/schema/db";
import { Button, Input } from "@pond/ui";
import { useMemo, useState } from "react";
import { ulid } from "ulid";
import { Section } from "@/features/saves/components/detail/section/section";
import { mutateSave } from "@/features/saves/lib/mutate";
import {
  useActiveMediaSeek,
  useActiveMediaTime,
} from "@/features/saves/state/active-media";
import type { Save } from "@/features/saves/types";
import { formatDuration } from "@/shared/lib/format";
import styles from "./video-notes.module.css";

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
    <Section title="Video Notes">
      {notes.length > 0 ? (
        <div className={styles.list}>
          {notes.map((note) => (
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
          ))}
        </div>
      ) : null}
      <div className={styles.compose}>
        <Input.Field
          className={styles.input}
          value={draft}
          aria-label="Video note"
          placeholder={`Add a note at ${formatDuration(currentTime)}`}
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
          size="xs"
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
