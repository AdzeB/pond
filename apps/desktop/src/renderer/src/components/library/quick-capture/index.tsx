import { Button, cn, Dialog, Field, Input, useToast } from "@pond/ui";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { navigateTo, patchSearch } from "@/lib/navigate-path";
import styles from "./styles.module.css";

function Root() {
  const [open, setOpen] = useState(false);
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.capture === "1") {
      void primeFromClipboard().then((seed) => {
        if (seed) setUrl(seed);
        setOpen(true);
      });
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          delete out.capture;
          return out;
        },
        { replace: true },
      );
    }
  }, [search.capture, navigate]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const reset = useCallback(() => {
    setUrl("");
    setNote("");
    setTags("");
  }, []);

  const submit = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const tagList = tags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#+/, "").toLowerCase())
        .filter(Boolean);
      const result = (await window.pond.query("saves.quickAdd", {
        url: trimmed,
        note: note.trim(),
        tags: tagList,
      })) as { ok: boolean; id?: string; error?: string };
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
        description: "Pond is fetching the rich metadata in the background.",
        type: "success",
      });
      if (result.id) navigateTo(navigate, `/save/${result.id}`);
      reset();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }, [url, note, tags, toast, navigate, reset]);

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
              Paste a URL. Pond will fetch the rest in the background.
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
                disabled={busy || !url.trim()}
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
