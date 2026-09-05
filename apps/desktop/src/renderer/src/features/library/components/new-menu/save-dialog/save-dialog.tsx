import { Button, Dialog, Field, Input } from "@pond/ui";
import { useRef, useState } from "react";
import { createNote, importLinks } from "../actions";
import styles from "./save-dialog.module.css";

export function SaveDialog({
  kind,
  onClose,
}: {
  kind: "note" | "links";
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const isNote = kind === "note";

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      if (isNote) await createNote(title, text);
      else {
        const failed = await importLinks(text);
        if (failed.length > 0) {
          setText(failed.join("\n"));
          setError(
            `Couldn't import ${failed.length} link${failed.length === 1 ? "" : "s"}. Retry the remaining links.`,
          );
          return;
        }
      }
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Couldn't save. Try again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !submitting.current) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Dialog.Header>
              <Dialog.Title>
                {isNote ? "New Note" : "Import from Links"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Content className={styles.content}>
              <Dialog.Description>
                {isNote
                  ? "Keep a text note in your library."
                  : "Add website links, one per line."}
              </Dialog.Description>
              {isNote ? (
                <Field.Root>
                  <Field.Label>Title</Field.Label>
                  <Input.Root size="sm" className={styles.control}>
                    <Field.Control
                      render={<Input.Field />}
                      value={title}
                      onValueChange={setTitle}
                      disabled={busy}
                      autoFocus
                    />
                  </Input.Root>
                </Field.Root>
              ) : null}
              <Field.Root>
                <Field.Label>{isNote ? "Note" : "Links"}</Field.Label>
                <Input.Root size="sm" className={styles.control}>
                  <Field.Control
                    render={<Input.Textarea />}
                    value={text}
                    onValueChange={setText}
                    disabled={busy}
                    autoFocus={!isNote}
                    aria-invalid={!!error}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                  />
                </Input.Root>
              </Field.Root>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
            </Dialog.Content>
            <Dialog.Footer>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || !(text.trim() || (isNote && title.trim()))}
              >
                {busy
                  ? isNote
                    ? "Saving"
                    : "Importing"
                  : isNote
                    ? "Save Note"
                    : "Import"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
