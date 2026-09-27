import { IconArrowUpFill18 } from "@pond/icons/fill/18";
import {
  IconCircleCheckOutline18,
  IconDotsOutline18,
  IconPencilOutline18,
  IconTrash2Outline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import type { ImageComment, ImageCommentReply } from "@pond/schema/db";
import { Button, Dialog, Input, Menu, Popover } from "@pond/ui";
import { useEffect, useId, useRef, useState } from "react";
import {
  deleteImageComment,
  saveImageComment,
} from "@/features/saves/lib/annotations";
import { validImageRegion } from "@/features/saves/lib/image-regions";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import styles from "./styles.module.css";

interface CommentEditorProps {
  saveId: string;
  comment: ImageComment;
  creating?: boolean;
  anchor?: HTMLElement | null;
  onClose: () => void;
}

function ThreadMessage({
  entry,
  busy,
  editing,
  editText,
  onEditText,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  entry: ImageCommentReply;
  busy: boolean;
  editing: boolean;
  editText: string;
  onEditText: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}) {
  const editId = useId();
  return (
    <article className={styles.message}>
      <div className={styles.messageContent}>
        <div className={styles.messageMeta}>
          {entry.createdAt != null ? (
            <time dateTime={new Date(entry.createdAt).toISOString()}>
              {relativeTimeFromMs(entry.createdAt)}
            </time>
          ) : null}
          {!editing ? (
            <Menu.Root>
              <Menu.Trigger
                icon
                size="xs"
                variant="text"
                className={styles.messageMenu}
                aria-label="Comment Actions"
              >
                <IconDotsOutline18 />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={4}>
                  <Menu.Popup>
                    <Menu.Items
                      items={[
                        {
                          label: "Edit",
                          icon: <IconPencilOutline18 />,
                          onClick: onStartEdit,
                        },
                      ]}
                    />
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          ) : null}
        </div>
        {editing ? (
          <div className={styles.inlineEditor}>
            <label className={styles.srOnly} htmlFor={editId}>
              Edit Comment
            </label>
            <Input.Root size="sm">
              <Input.Textarea
                id={editId}
                rows={3}
                value={editText}
                disabled={busy}
                onValueChange={onEditText}
              />
            </Input.Root>
            <div className={styles.editActions}>
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                onClick={onCancelEdit}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                disabled={busy || !editText.trim()}
                loading={busy}
                onClick={onSaveEdit}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className={styles.messageText}>{entry.text}</p>
        )}
      </div>
    </article>
  );
}

function CommentThread({
  saveId,
  comment,
  creating,
  anchor,
  onClose,
}: CommentEditorProps & { anchor: HTMLElement }) {
  const [thread, setThread] = useState(comment);
  const [replyText, setReplyText] = useState(creating ? comment.text : "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const dismissReady = useRef(false);
  const replyInput = useRef<HTMLTextAreaElement>(null);
  const replyId = useId();
  const validReply = !!replyText.trim() && validImageRegion(thread);

  useEffect(() => {
    dismissReady.current = false;
    const arm = () => {
      dismissReady.current = true;
    };
    window.addEventListener("pointerdown", arm, true);
    return () => window.removeEventListener("pointerdown", arm, true);
  }, []);

  const run = async (action: () => Promise<void>, after: () => void) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      after();
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

  const saveThread = (next: ImageComment, after: () => void) =>
    run(
      () => saveImageComment(saveId, next),
      () => {
        setThread(next);
        after();
      },
    );

  const submitReply = () => {
    const text = replyText.trim();
    if (!text || !validImageRegion(thread)) return;
    if (creating) {
      const next = { ...thread, text };
      void saveThread(next, onClose);
      return;
    }
    const next: ImageComment = {
      ...thread,
      replies: [
        ...(thread.replies ?? []),
        { id: crypto.randomUUID(), text, createdAt: Date.now() },
      ],
    };
    void saveThread(next, () => {
      setReplyText("");
      replyInput.current?.focus();
    });
  };

  const startEditing = (entry: ImageCommentReply) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  const saveEdit = () => {
    const text = editText.trim();
    if (!editingId || !text) return;
    const next =
      editingId === thread.id
        ? { ...thread, text }
        : {
            ...thread,
            replies: (thread.replies ?? []).map((reply) =>
              reply.id === editingId ? { ...reply, text } : reply,
            ),
          };
    void saveThread(next, () => {
      setEditingId(null);
      setEditText("");
    });
  };

  const closeIfReady = (
    open: boolean,
    details?: { reason?: string | null },
  ) => {
    if (open || pending.current) return;
    if (!dismissReady.current && details?.reason !== "escape-key") return;
    onClose();
  };

  const messages: ImageCommentReply[] = creating
    ? []
    : [
        {
          id: thread.id,
          text: thread.text,
          createdAt: thread.createdAt,
        },
        ...(thread.replies ?? []),
      ];

  return (
    <Popover.Root open modal={false} onOpenChange={closeIfReady}>
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side="right"
          align="start"
          sideOffset={10}
          collisionAvoidance={{ side: "flip", align: "shift" }}
        >
          <Popover.Popup
            className={styles.card}
            aria-label={creating ? "Add Comment" : "Comment"}
            initialFocus={replyInput}
          >
            <header className={styles.threadHeader}>
              <h2>Comment</h2>
              <div className={styles.headerActions}>
                {!creating ? (
                  <Menu.Root>
                    <Menu.Trigger
                      icon
                      size="sm"
                      variant="text"
                      aria-label="Thread Actions"
                    >
                      <IconDotsOutline18 />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner side="bottom" align="end" sideOffset={4}>
                        <Menu.Popup>
                          <Menu.Items
                            items={[
                              {
                                label: "Delete Thread",
                                icon: <IconTrash2Outline18 />,
                                variant: "destructive",
                                onClick: () =>
                                  void run(
                                    () => deleteImageComment(saveId, thread.id),
                                    onClose,
                                  ),
                              },
                            ]}
                          />
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                ) : null}
                {!creating ? (
                  <Button
                    type="button"
                    icon
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    aria-label="Resolve Comment"
                    onClick={() =>
                      void saveThread(
                        { ...thread, resolvedAt: Date.now() },
                        onClose,
                      )
                    }
                  >
                    <IconCircleCheckOutline18 />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  icon
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Close Comment"
                  onClick={onClose}
                >
                  <IconXmarkOutline18 />
                </Button>
              </div>
            </header>
            {messages.length ? (
              <div className={styles.threadBody}>
                {messages.map((entry) => (
                  <ThreadMessage
                    key={entry.id}
                    entry={entry}
                    busy={busy}
                    editing={editingId === entry.id}
                    editText={editText}
                    onEditText={setEditText}
                    onStartEdit={() => startEditing(entry)}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditText("");
                    }}
                    onSaveEdit={saveEdit}
                  />
                ))}
              </div>
            ) : null}
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.composer}>
              <label className={styles.srOnly} htmlFor={replyId}>
                {creating ? "Add Comment" : "Reply"}
              </label>
              <div className={styles.composerField}>
                <Input.Root size="sm" className={styles.composerInput}>
                  <Input.Textarea
                    ref={replyInput}
                    id={replyId}
                    value={replyText}
                    rows={1}
                    placeholder={creating ? "Add a comment" : "Reply"}
                    disabled={busy}
                    onValueChange={setReplyText}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || event.shiftKey) return;
                      event.preventDefault();
                      submitReply();
                    }}
                  />
                </Input.Root>
                <Button
                  className={styles.send}
                  icon
                  size="sm"
                  disabled={busy || !validReply}
                  loading={busy}
                  aria-label={creating ? "Add Comment" : "Send Reply"}
                  onClick={submitReply}
                >
                  <IconArrowUpFill18 />
                </Button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
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
