import type { VideoNote } from "@pond/schema/db";
import { Button, Dialog, Input } from "@pond/ui";
import { useId, useRef, useState } from "react";
import {
  deleteVideoNote,
  saveVideoNote,
} from "@/features/saves/lib/annotations";
import styles from "./comment-editor/styles.module.css";
export function VideoNoteEditor({
  saveId,
  note,
  onClose,
}: {
  saveId: string;
  note: VideoNote;
  onClose: () => void;
}) {
  const [text, setText] = useState(note.text);
  const [time, setTime] = useState(note.timeSec);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const valid = !!text.trim() && Number.isFinite(time) && time >= 0;
  const persist = async (remove: boolean) => {
    if (pending.current || (!remove && !valid)) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (remove) await deleteVideoNote(saveId, note.id);
      else
        await saveVideoNote(saveId, {
          ...note,
          text: text.trim(),
          timeSec: time,
        });
      onClose();
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
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending.current) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup} initialFocus={textInput}>
          <Dialog.Header>
            <Dialog.Title>Edit Comment</Dialog.Title>
            <Dialog.Close disabled={busy} />
          </Dialog.Header>
          <div className={styles.body}>
            <label htmlFor={id}>Comment</label>
            <Input.Root>
              <Input.Textarea
                ref={textInput}
                id={id}
                value={text}
                rows={4}
                disabled={busy}
                onValueChange={setText}
              />
            </Input.Root>
            <label htmlFor={`${id}-time`}>Time in seconds</label>
            <Input.Root size="sm">
              <Input.Field
                id={`${id}-time`}
                type="number"
                min={0}
                step={0.001}
                value={time}
                disabled={busy}
                onChange={(event) => setTime(Number(event.target.value))}
              />
            </Input.Root>
            {error ? <p role="alert">{error}</p> : null}
          </div>
          <Dialog.Footer>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void persist(true)}
            >
              Delete Comment
            </Button>
            <Button
              disabled={busy || !valid}
              loading={busy}
              onClick={() => void persist(false)}
            >
              Save Comment
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
