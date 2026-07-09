import { IconArrowUpFill18 as ArrowUp } from "@pond/icons/fill/18";
import {
  IconLinkOutline18 as Link,
  IconNotepadOutline18 as Notepad,
  IconTagsOutline18 as Tags,
} from "@pond/icons/outline/18";
import { Input, Menu } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { TagMenu } from "@/components/tag-menu";
import { getSourceIcon } from "@/lib/save/sources-registry";
import { primarySelection } from "@/stores/selection";
import { pushToast } from "@/stores/toasts";
import styles from "./styles.module.css";

interface QuickAddResult {
  ok: boolean;
  id?: string;
  /** False when the URL was already in the library. */
  created?: boolean;
  error?: string;
}

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://");
}

// Forgive a missing scheme: "example.com/page" should classify as a real URL
// in the pipeline, not fall through to a manual bookmark. Anything that isn't
// clearly a bare domain is left untouched (it becomes a manual note/bookmark).
function withScheme(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
  return value;
}

// The "new save" surface as a dock view: a small capture form that morphs out
// of the pill. The link is the primary field; a note and tags ride along on
// the same `saves.quickAdd` call. A note without a link becomes a manual note
// save. Enter saves; Escape (handled by the dock) collapses back to nav.
export function NewContent() {
  const dock = useDock();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<readonly string[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Prefill from the clipboard when it holds a link, so paste-and-go is a
  // single keystroke. The prefill is selected so typing replaces it when it's
  // not the link the user wanted. Best-effort: ignore unavailable clipboard or
  // non-URLs.
  useEffect(() => {
    let cancelled = false;
    void navigator.clipboard
      .readText()
      .then((clip) => {
        if (cancelled || !looksLikeUrl(clip)) return;
        setUrl(clip.trim());
        requestAnimationFrame(() => inputRef.current?.select());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Recognize the source as the user types so the link glyph can morph into
  // the matching brand mark — quiet feedback that the URL will be fully
  // captured (or fall back to the globe for a generic web page). Debounced;
  // classification is cheap pattern matching in the main process.
  useEffect(() => {
    const tokens = url.trim().split(/\s+/).filter(Boolean);
    const candidate = tokens.length === 1 ? withScheme(tokens[0] ?? "") : "";
    if (!looksLikeUrl(candidate)) {
      setSource(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void window.pond
        .query("saves.classifyUrl", { url: candidate })
        .then((res) => {
          if (cancelled) return;
          const next = (res as { source?: string | null })?.source ?? null;
          setSource(next);
        })
        .catch(() => {});
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  const trimmedUrl = url.trim();
  const trimmedNote = note.trim();
  const canSubmit = (trimmedUrl.length > 0 || trimmedNote.length > 0) && !busy;

  const toggleTag = (rawName: string) => {
    const name = rawName.trim();
    if (!name) return;
    const lower = name.toLowerCase();
    setTags((prev) =>
      prev.some((t) => t.toLowerCase() === lower)
        ? prev.filter((t) => t.toLowerCase() !== lower)
        : [...prev, name],
    );
  };

  const quickAdd = (u: string) =>
    window.pond.query("saves.quickAdd", {
      url: u,
      ...(trimmedNote ? { note: trimmedNote } : {}),
      ...(tags.length > 0 ? { tags: [...tags] } : {}),
    }) as Promise<QuickAddResult>;

  const submitMany = async (urls: readonly string[]) => {
    let saved = 0;
    let existing = 0;
    for (const u of urls) {
      const res = await quickAdd(u);
      if (!res?.ok) continue;
      if (res.created === false) existing += 1;
      else saved += 1;
    }
    if (saved === 0 && existing === 0) {
      pushToast("Couldn't save those links.", "error");
      inputRef.current?.focus();
      return;
    }
    const parts: string[] = [];
    if (saved > 0) parts.push(`Saved ${saved} link${saved === 1 ? "" : "s"}.`);
    if (existing > 0) parts.push(`${existing} already in your library.`);
    pushToast(parts.join(" "));
    dock.closeNew();
  };

  const submitOne = async (u: string) => {
    const res = await quickAdd(u);
    if (res?.ok) {
      // `created: false` means the link was already in the library; say so
      // instead of silently closing, so the collapse isn't mistaken for a
      // second copy being saved.
      if (res.created === false) {
        const id = res.id;
        pushToast("Already in your library.", {
          action: id
            ? { label: "View", onAction: () => primarySelection.set(id) }
            : undefined,
        });
      }
      dock.closeNew();
    } else {
      pushToast("Couldn't save. Check the link and try again.", "error");
      inputRef.current?.focus();
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    // A pasted list of links (whitespace-separated) saves each one, with the
    // note and tags riding along on every save — the same fan-out the library
    // grid does for a dropped uri-list. Mixed text falls through to the single
    // path and becomes one manual save.
    const tokens = trimmedUrl.split(/\s+/).filter(Boolean).map(withScheme);
    const isMulti = tokens.length > 1 && tokens.every(looksLikeUrl);
    setBusy(true);
    try {
      if (isMulti) await submitMany(tokens);
      else await submitOne(trimmedUrl ? withScheme(trimmedUrl) : "");
    } finally {
      setBusy(false);
    }
  };

  const onFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  const appliedKeys = new Set(tags.map((t) => t.toLowerCase()));
  const SourceIcon = source ? getSourceIcon(source) : null;

  return (
    // The dock's AnimatePresence wraps this in the swap motion.div; the pill's
    // `layout` owns the size morph, so this is just the card content. The
    // anatomy mirrors the ask composer: bare fields, then a bottom toolbar
    // with quiet actions on the left and the circular submit on the right.
    <div className={styles.card}>
      <div className={styles.row}>
        <span
          key={source ?? "link"}
          className={`${styles["lead-icon"]} ${styles.glyph}`}
          aria-hidden
        >
          {SourceIcon ? (
            <SourceIcon width={16} height={16} />
          ) : (
            <Link width={16} height={16} />
          )}
        </span>
        <Input.Field
          ref={inputRef}
          className={styles.input}
          value={url}
          placeholder="Paste a link to save…"
          spellCheck={false}
          autoComplete="off"
          autoFocus
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onFieldKeyDown}
        />
      </div>

      <div className={styles.row}>
        <Notepad width={16} height={16} className={styles["lead-icon"]} />
        <Input.Field
          className={styles.input}
          value={note}
          placeholder="Add a note…"
          autoComplete="off"
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={onFieldKeyDown}
        />
      </div>

      <div className={styles.toolbar}>
        <div className={styles["toolbar-group"]}>
          <Menu.Root open={tagsOpen} onOpenChange={setTagsOpen}>
            <Menu.Trigger
              className={styles["icon-button"]}
              aria-label="Add tags"
            >
              <Tags width={16} height={16} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="top" align="start" sideOffset={8}>
                <Menu.Popup>
                  <TagMenu
                    appliedKeys={appliedKeys}
                    onToggle={toggleTag}
                    allowCreate
                    groupsAs="submenu"
                  />
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.chip}
              title={`Remove “${tag}”`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.primary}
          aria-label="Save"
          disabled={!canSubmit}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void submit()}
        >
          <ArrowUp width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
