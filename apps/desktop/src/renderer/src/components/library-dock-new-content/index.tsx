import { IconLinkOutline18 as Link } from "@pond/icons/outline/18";
import { Button, Input } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { pushToast } from "@/stores/toasts";
import styles from "./styles.module.css";

interface QuickAddResult {
  ok: boolean;
  error?: string;
}

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://");
}

// The "new save" surface as a dock view: a single capture row that morphs out
// of the pill instead of floating as a popover. Enter saves; Escape (handled by
// the dock) collapses back to nav.
export function NewContent() {
  const dock = useDock();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Prefill from the clipboard when it holds a link, so paste-and-go is a
  // single keystroke. Best-effort: ignore unavailable clipboard or non-URLs.
  useEffect(() => {
    let cancelled = false;
    void navigator.clipboard
      .readText()
      .then((clip) => {
        if (!cancelled && looksLikeUrl(clip)) setUrl(clip.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = url.trim();
  const canSubmit = trimmed.length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    let ok = false;
    try {
      const res = (await window.pond.query("saves.quickAdd", {
        url: trimmed,
      })) as QuickAddResult;
      ok = !!res?.ok;
    } finally {
      setBusy(false);
    }
    if (ok) {
      dock.closeNew();
    } else {
      pushToast("Couldn't save. Check the link and try again.", "error");
      inputRef.current?.focus();
    }
  };

  return (
    // The dock's AnimatePresence wraps this in the swap motion.div; the pill's
    // `layout` owns the size morph, so this is just the card content.
    <div className={styles.card}>
      <Input.Root className={styles.inputRoot}>
        <Input.Icon>
          <Link width={16} height={16} />
        </Input.Icon>
        {/* biome-ignore lint/a11y/noAutofocus: capture surface exists to receive the link immediately */}
        <Input.Field
          ref={inputRef}
          className={styles.inputField}
          value={url}
          placeholder="Paste a link to save…"
          spellCheck={false}
          autoComplete="off"
          autoFocus
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
      </Input.Root>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={!canSubmit}
        onClick={() => void submit()}
      >
        Add
        <kbd className={styles.kbd} aria-hidden>
          ↵
        </kbd>
      </Button>
    </div>
  );
}
