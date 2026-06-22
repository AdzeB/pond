import {
  IconLinkOutline18 as Link,
  IconNotepadOutline18 as Note,
  IconPlusOutline18 as Plus,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, Popover } from "@pond/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { pickAndImportFiles } from "@/lib/save-actions";
import { useTags } from "@/stores/tags";
import { pushToast } from "@/stores/toasts";
import styles from "./styles.module.css";

type PopoverAnchor = Element | null | (() => Element | null) | undefined;

interface NewSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Anchor the popover to the dock pill so it floats above the dock and
  // inherits its width.
  anchor?: PopoverAnchor;
}

interface QuickAddResult {
  ok: boolean;
  error?: string;
}

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://");
}

// Split a textarea value into one trimmed candidate per line, dropping blanks —
// so pasting a list of links becomes a batch add.
function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function hostFor(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function NewSaveDialog({
  open,
  onOpenChange,
  anchor,
}: NewSaveDialogProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side="top"
          align="center"
          sideOffset={11}
        >
          <Popover.Popup className={styles.popup}>
            {open ? <NewSaveForm onClose={() => onOpenChange(false)} /> : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NewSaveForm({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dropping, setDropping] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  // Prefill from the clipboard when it holds a link, so a paste-and-go flow is
  // a single keystroke. Best-effort: ignore unavailable clipboard or non-URLs.
  useEffect(() => {
    let cancelled = false;
    void navigator.clipboard
      .readText()
      .then((clip) => {
        if (!cancelled && looksLikeUrl(clip)) setText(clip.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const lines = useMemo(() => parseLines(text), [text]);
  const isBatch = lines.length > 1;
  const previewHost = !isBatch && lines[0] ? hostFor(lines[0]) : null;
  const noteFilled = note.trim().length > 0;
  const hasContent = lines.length > 0 || noteFilled;
  const canSubmit = hasContent && !busy;

  const addLabel = isBatch
    ? `Add ${lines.length} links`
    : lines.length === 0 && noteFilled
      ? "Save note"
      : "Add";

  const focusField = () => fieldRef.current?.focus();

  const toggleTag = (name: string) => {
    const clean = normalizeLabelName(name);
    if (!clean) return;
    const lower = clean.toLowerCase();
    setTags((prev) =>
      prev.some((t) => t.toLowerCase() === lower)
        ? prev.filter((t) => t.toLowerCase() !== lower)
        : [...prev, clean],
    );
  };

  const submit = async (keepOpen = false) => {
    if (!canSubmit) return;
    setBusy(true);
    const trimmedNote = note.trim() || undefined;
    const targets = lines.length === 0 ? [""] : lines;
    let okCount = 0;
    const failed: string[] = [];
    try {
      for (const url of targets) {
        const res = (await window.pond.query("saves.quickAdd", {
          url,
          note: trimmedNote,
          tags,
        })) as QuickAddResult;
        if (res?.ok) okCount++;
        else failed.push(url || "note");
      }
    } finally {
      setBusy(false);
    }

    const total = targets.length;
    if (failed.length > 0) {
      pushToast(
        failed.length === total
          ? "Couldn't save. Check the link and try again."
          : `Saved ${okCount} of ${total} — ${failed.length} failed.`,
        "error",
      );
      return; // Leave the form open so the user can retry.
    }

    if (total > 1) pushToast(`Saved ${total} links.`, "success");

    if (keepOpen) {
      // Keep tags for rapid same-tag captures; clear the rest and refocus.
      setText("");
      setNote("");
      setShowNote(false);
      focusField();
    } else {
      onClose();
    }
  };

  const importFiles = async () => {
    onClose();
    await pickAndImportFiles();
  };

  const onFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit(true);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(false);
    }
  };

  // Files dropped onto the popover import directly; dropped links append to the
  // field. Mirrors the grid's drop handling (Electron resolves real paths via
  // the preload bridge since File.path was removed).
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    const paths = Array.from(dt.files ?? [])
      .map((f) => {
        try {
          return window.pond.pathForFile(f);
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    if (paths.length > 0) {
      onClose();
      await window.pond.query("saves.importFiles", { paths });
      return;
    }
    const uri = dt.getData("text/uri-list") || dt.getData("text/plain");
    const dropped = parseLines(uri).filter((l) => !l.startsWith("#"));
    if (dropped.length > 0) {
      setText((prev) =>
        prev ? `${prev}\n${dropped.join("\n")}` : dropped.join("\n"),
      );
      focusField();
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer?.types ?? []);
    if (
      types.includes("Files") ||
      types.includes("text/uri-list") ||
      types.includes("text/plain")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDropping(true);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop drop zone, not a control
    <div
      className={styles.form}
      data-dropping={dropping || undefined}
      onDragOver={onDragOver}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => void onDrop(e)}
    >
      <header className={styles.header}>
        <Popover.Title className={styles.title}>New save</Popover.Title>
        <Popover.Close
          render={<Button icon size="sm" variant="ghost" aria-label="Close" />}
        >
          <X />
        </Popover.Close>
      </header>

      <div className={styles.field} data-multiline={isBatch || undefined}>
        <span className={styles.fieldIcon} aria-hidden>
          <Link width={14} height={14} />
        </span>
        <textarea
          ref={fieldRef}
          className={styles.fieldInput}
          rows={1}
          value={text}
          placeholder="Paste a link to save…"
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onFieldKeyDown}
        />
        {text ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear"
            onClick={() => {
              setText("");
              focusField();
            }}
          >
            <X width={14} height={14} />
          </button>
        ) : null}
      </div>

      {(previewHost || isBatch) && (
        <div className={styles.meta}>
          {isBatch ? (
            <span className={styles.metaChip}>{lines.length} links ready</span>
          ) : previewHost && lines[0] ? (
            <span className={styles.metaChip}>
              <img
                src={`${new URL(lines[0]).origin}/favicon.ico`}
                alt=""
                className={styles.favicon}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              {previewHost}
            </span>
          ) : null}
        </div>
      )}

      <TagEditor tags={tags} onToggle={toggleTag} />

      {showNote ? (
        <textarea
          className={styles.note}
          value={note}
          placeholder="Add a note…"
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit(false);
            }
          }}
        />
      ) : null}

      <footer className={styles.footer}>
        <div className={styles.footerStart}>
          <Button variant="ghost" size="sm" onClick={() => void importFiles()}>
            Import files…
          </Button>
          {!showNote ? (
            <Button variant="ghost" size="sm" onClick={() => setShowNote(true)}>
              <Note width={14} height={14} />
              Note
            </Button>
          ) : null}
        </div>
        <Button
          variant="primary"
          size="sm"
          disabled={!canSubmit}
          onClick={() => void submit(false)}
        >
          {addLabel}
          <kbd className={styles.addKbd} aria-hidden>
            ↵
          </kbd>
        </Button>
      </footer>

      {dropping ? (
        <div className={styles.dropHint} aria-hidden>
          Drop files to import
        </div>
      ) : null}
    </div>
  );
}

function TagEditor({
  tags,
  onToggle,
}: {
  tags: string[];
  onToggle: (name: string) => void;
}) {
  const all = useTags();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const applied = useMemo(
    () => new Set(tags.map((t) => t.toLowerCase())),
    [tags],
  );

  const needle = query.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      all
        .filter((t) => !applied.has(t.name.toLowerCase()))
        .filter((t) => !needle || t.name.toLowerCase().includes(needle))
        .slice(0, 6),
    [all, applied, needle],
  );

  const exactExists = all.some((t) => t.name.toLowerCase() === needle);
  const canCreate = needle.length > 0 && !exactExists && !applied.has(needle);

  const commit = async (name: string, create = false) => {
    const clean = normalizeLabelName(name);
    if (!clean) return;
    if (
      create &&
      !all.some((t) => t.name.toLowerCase() === clean.toLowerCase())
    ) {
      try {
        await window.pond.query("tags.create", { name: clean });
      } catch {
        /* best-effort */
      }
    }
    onToggle(clean);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className={styles.tags}>
      {tags.map((tag) => (
        <span key={tag.toLowerCase()} className={styles.tagChip}>
          {tag}
          <button
            type="button"
            className={styles.tagRemove}
            aria-label={`Remove ${tag}`}
            onClick={() => onToggle(tag)}
          >
            <X width={12} height={12} />
          </button>
        </span>
      ))}

      {adding ? (
        <div className={styles.tagInputWrap}>
          <input
            ref={inputRef}
            className={styles.tagInput}
            value={query}
            placeholder="Tag…"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (suggestions[0]) void commit(suggestions[0].name);
                else if (canCreate) void commit(query, true);
              } else if (
                e.key === "Escape" ||
                (e.key === "Backspace" && !query)
              ) {
                e.preventDefault();
                setAdding(false);
                setQuery("");
              }
            }}
            onBlur={() => {
              if (!query) setAdding(false);
            }}
          />
          {(suggestions.length > 0 || canCreate) && (
            <div className={styles.tagSuggestions}>
              {suggestions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.tagOption}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void commit(t.name);
                  }}
                >
                  {t.name}
                </button>
              ))}
              {canCreate ? (
                <button
                  type="button"
                  className={styles.tagOption}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void commit(query, true);
                  }}
                >
                  <Plus width={12} height={12} />
                  Create “{normalizeLabelName(query)}”
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={styles.addTag}
          onClick={() => setAdding(true)}
        >
          <Plus width={12} height={12} />
          {tags.length === 0 ? "Add tags" : "Tag"}
        </button>
      )}
    </div>
  );
}
