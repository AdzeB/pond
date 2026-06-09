import { Button, cn, Dialog, Field, Input, useToast } from "@pond/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { primarySelection } from "@/core/data/selection";
import { closeCapture, useCapture } from "@/features/library/stores/view-store";
import styles from "./styles.module.css";

function Root() {
  const [open, setOpen] = useState(false);
  const capture = useCapture();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!capture) return;
    void primeFromClipboard().then((seed) => {
      if (seed) setUrl(seed);
      setOpen(true);
    });
    closeCapture();
  }, [capture]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const reset = useCallback(() => {
    setUrl("");
    setNote("");
    setTags("");
    setFilePaths([]);
  }, []);

  const chooseFiles = useCallback(async () => {
    const res = (await window.pond.query("saves.pickFiles", {})) as {
      ok: boolean;
      paths: string[];
    };
    if (res.ok && res.paths.length > 0) setFilePaths(res.paths);
  }, []);

  const submit = useCallback(async () => {
    const trimmed = url.trim();
    const trimmedNote = note.trim();
    if (!trimmed && filePaths.length === 0 && !trimmedNote) return;
    setBusy(true);
    try {
      const tagList = tags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#+/, "").toLowerCase())
        .filter(Boolean);
      const result =
        filePaths.length > 0
          ? ((await window.pond.query("saves.createManual", {
              url: trimmed || null,
              note: trimmedNote || null,
              tags: tagList,
              filePaths,
            })) as { ok: boolean; id?: string; error?: string })
          : ((await window.pond.query("saves.quickAdd", {
              url: trimmed,
              note: trimmedNote,
              tags: tagList,
            })) as { ok: boolean; id?: string; error?: string });
      if (!result.ok) {
        toast.add({
          title: "Couldn't save",
          description: result.error ?? "Unknown error",
          type: "error",
        });
        return;
      }
      toast.add({
        title: "Saved to library",
        description:
          filePaths.length > 0
            ? "Imported your files."
            : "Pond is fetching the rich metadata in the background.",
        type: "success",
      });
      if (result.id) primarySelection.set(result.id);
      reset();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }, [url, note, tags, filePaths, toast, reset]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Title>Quick save</Title>
            <Hint>
              Paste a URL, choose files, or jot a note. Pond fills in the rest
              in the background.
            </Hint>
            <Field.Root>
              <Field.Label>URL</Field.Label>
              <Input.Field
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                autoComplete="off"
                spellCheck={false}
              />
            </Field.Root>
            <button
              type="button"
              className={styles["pick-files"]}
              onClick={() => void chooseFiles()}
            >
              {filePaths.length > 0
                ? `${filePaths.length} file${filePaths.length === 1 ? "" : "s"} selected`
                : "Choose files"}
            </button>
            <Field.Root>
              <Field.Label>Note (optional)</Field.Label>
              <Input.Field
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why are you saving this?"
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Tags (optional)</Field.Label>
              <Input.Field
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="design, inspiration, todo"
              />
            </Field.Root>
            <Actions>
              <Button
                variant="ghost"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={
                  busy ||
                  (!url.trim() && filePaths.length === 0 && !note.trim())
                }
              >
                {busy ? "Saving…" : "Save"}
              </Button>
            </Actions>
          </Form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface FormProps extends React.ComponentPropsWithoutRef<"form"> {}

function Form({ className, ...props }: FormProps) {
  return <form className={cn(styles.form, className)} {...props} />;
}

interface TitleProps extends React.ComponentPropsWithoutRef<"h2"> {}

function Title({ className, ...props }: TitleProps) {
  return <h2 className={cn(styles.title, className)} {...props} />;
}

interface HintProps extends React.ComponentPropsWithoutRef<"p"> {}

function Hint({ className, ...props }: HintProps) {
  return <p className={cn(styles.hint, className)} {...props} />;
}

interface ActionsProps extends React.ComponentPropsWithoutRef<"div"> {}

function Actions({ className, ...props }: ActionsProps) {
  return <div className={cn(styles.actions, className)} {...props} />;
}

export const QuickCapture = {
  Root,
  Form,
  Title,
  Hint,
  Actions,
};

async function primeFromClipboard(): Promise<string | null> {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return null;
    const trimmed = text.trim();
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
