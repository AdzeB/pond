import { IconArrowUpFill18 } from "@pond/icons/fill/18";
import type { ImageComment } from "@pond/schema/db";
import { Button, Dialog, Input, Popover } from "@pond/ui";
import { useEffect, useId, useRef, useState } from "react";
import {
  deleteImageComment,
  saveImageComment,
} from "@/features/saves/lib/annotations";
import { validImageRegion } from "@/features/saves/lib/image-regions";
import styles from "./styles.module.css";

export function CommentEditor({
  saveId,
  comment,
  creating = false,
  anchor,
  onClose,
}: {
  saveId: string;
  comment: ImageComment;
  creating?: boolean;
  anchor?: HTMLElement | null;
  onClose: () => void;
}) {
  const [text, setText] = useState(comment.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const dismissReady = useRef(false);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const textId = useId();
  const valid = !!text.trim() && validImageRegion(comment);
  useEffect(() => {
    if (!anchor) return;
    dismissReady.current = false;
    const arm = () => {
      dismissReady.current = true;
    };
    window.addEventListener("pointerdown", arm, true);
    return () => window.removeEventListener("pointerdown", arm, true);
  }, [anchor]);
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
  const closeIfReady = (
    open: boolean,
    details?: { reason?: string | null },
  ) => {
    if (open || pending.current) return;
    if (anchor && !dismissReady.current && details?.reason !== "escape-key")
      return;
    onClose();
  };
  const submitLabel = creating ? "Add Comment" : "Save Comment";
  const field = (
    <label className={styles.field} htmlFor={textId}>
      {anchor ? null : <span>Comment</span>}
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
  );
  if (anchor) {
    return (
      <Popover.Root open modal={false} onOpenChange={closeIfReady}>
        <Popover.Portal>
          <Popover.Positioner
            anchor={anchor}
            side="right"
            align="start"
            sideOffset={8}
            collisionAvoidance={{ side: "flip", align: "shift" }}
          >
            <Popover.Popup
              className={styles.card}
              aria-label={creating ? "Add Comment" : "Edit Comment"}
              initialFocus={textInput}
            >
              {field}
              {error ? <p role="alert">{error}</p> : null}
              <div className={styles.compose}>
                {!creating ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void persist(true)}
                  >
                    Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  icon
                  size="sm"
                  disabled={busy || !valid}
                  loading={busy}
                  aria-label={submitLabel}
                  onClick={() => void persist(false)}
                >
                  <IconArrowUpFill18 />
                </Button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }
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
            {field}
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
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
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
