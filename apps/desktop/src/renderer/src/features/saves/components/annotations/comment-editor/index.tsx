import type { ImageComment } from "@pond/schema/db";
import { Button, Dialog, Input } from "@pond/ui";
import { useId, useRef, useState } from "react";
import {
  deleteImageComment,
  saveImageComment,
} from "@/features/saves/lib/annotations";
import { validImageRegion } from "@/features/saves/lib/image-regions";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import styles from "./styles.module.css";
import { CommentThread } from "./thread";

interface CommentEditorProps {
  saveId: string;
  comment: ImageComment;
  creating?: boolean;
  anchor?: HTMLElement | null;
  onClose: () => void;
}

function CommentDialog({
  saveId,
  comment,
  creating = false,
  onClose,
}: CommentEditorProps) {
  const [text, setText] = useState(comment.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const textId = useId();
  const valid = !!text.trim() && validImageRegion(comment);
  const persist = async (remove: boolean) => {
    if (pending.current || (!remove && !valid)) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (remove) await deleteImageComment(saveId, comment.id);
      else await saveImageComment(saveId, { ...comment, text: text.trim() });
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't save this comment.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const closeIfReady = (open: boolean) => {
    if (!open && !pending.current) onClose();
  };
  const submitLabel = creating ? "Add Comment" : "Save Comment";
  const timestamp =
    !creating && comment.createdAt != null ? (
      <time
        className={styles.timestamp}
        dateTime={new Date(comment.createdAt).toISOString()}
      >
        {relativeTimeFromMs(comment.createdAt)}
      </time>
    ) : null;
  return (
    <Dialog.Root open onOpenChange={closeIfReady}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup} initialFocus={textInput}>
          <Dialog.Header>
            <Dialog.Title>
              {creating ? "Add Comment" : "Edit Comment"}
            </Dialog.Title>
            <Dialog.Close disabled={busy} />
          </Dialog.Header>
          <div className={styles.body}>
            <label className={styles.field} htmlFor={textId}>
              <span>Comment</span>
              <Input.Root size="sm">
                <Input.Textarea
                  ref={textInput}
                  id={textId}
                  value={text}
                  rows={3}
                  placeholder="Comment"
                  disabled={busy}
                  onValueChange={setText}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey) return;
                    event.preventDefault();
                    void persist(false);
                  }}
                />
              </Input.Root>
            </label>
            {timestamp}
            {error ? <p role="alert">{error}</p> : null}
          </div>
          <Dialog.Footer>
            {!creating ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void persist(true)}
              >
                Delete Comment
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={busy || !valid}
              loading={busy}
              onClick={() => void persist(false)}
            >
              {submitLabel}
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CommentEditor(props: CommentEditorProps) {
  if (props.anchor) return <CommentThread {...props} anchor={props.anchor} />;
  return <CommentDialog {...props} />;
}
