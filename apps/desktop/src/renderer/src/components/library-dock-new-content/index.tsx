import { IconXmarkOutline12 as Remove } from "@pond/icons/outline/12";
import { IconLink2Outline18 as Link } from "@pond/icons/outline/18";
import { Input } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { Dock } from "@/components/library-view-menu-group";
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

/** Forgive a missing scheme so "example.com/page" classifies as a real URL; anything that isn't clearly a bare domain stays untouched. */
function withScheme(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
  return value;
}

/** Splits free text into normalized URLs, or null when any part isn't clearly a link. */
function asUrlList(value: string): string[] | null {
  const tokens = value.trim().split(/\s+/).filter(Boolean).map(withScheme);
  if (tokens.length === 0) return null;
  return tokens.every(looksLikeUrl) ? tokens : null;
}

/** Classification is cheap pattern matching in the main process, debounced for typing. */
function useUrlSource(candidate: string): string | null {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
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
          setSource((res as { source?: string | null })?.source ?? null);
        })
        .catch(() => {});
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidate]);
  return source;
}

function SourceGlyph({ url }: { url: string }) {
  const source = useUrlSource(url);
  const SourceIcon = source ? getSourceIcon(source) : null;
  return (
    /** The glyph remounts when the URL classifies to a source, so the brand mark pops in. */
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
  );
}

function LinkRow({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className={styles.link}>
      <SourceGlyph url={url} />
      <span className={styles["link-text"]}>
        {url.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        aria-label={`Remove ${url}`}
        className={styles["link-remove"]}
        onClick={onRemove}
      >
        <Remove strokeWidth={2} />
      </button>
    </div>
  );
}

/** Pasting on top of a pending link, or pasting a whitespace-separated list, commits links to visible rows instead of mashing them into one string. */
export function NewContent() {
  const dock = useDock();
  const [url, setUrl] = useState("");
  const [links, setLinks] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLinks = (urls: readonly string[]) => {
    setLinks((prev) => {
      const seen = new Set(prev);
      const next = [...prev];
      for (const u of urls) {
        if (!seen.has(u)) {
          seen.add(u);
          next.push(u);
        }
      }
      return next;
    });
  };

  /** Prefill from the clipboard when it holds a link, selected so typing replaces it if it's not the link the user wanted. */
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

  const trimmedUrl = url.trim();
  const draftUrls = asUrlList(trimmedUrl);
  const draftUrl =
    draftUrls && draftUrls.length === 1 ? (draftUrls[0] ?? "") : "";
  const pendingCount = links.length + (trimmedUrl ? 1 : 0);
  const canSubmit = pendingCount > 0 && !busy;

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = asUrlList(e.clipboardData.getData("text"));
    if (!pasted) return;
    const input = e.currentTarget;
    const replacesAll =
      input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const kept = replacesAll ? null : asUrlList(input.value);
    if (pasted.length === 1 && !kept) return;
    e.preventDefault();
    addLinks(kept ? [...kept, ...pasted] : pasted);
    setUrl("");
  };

  const onChange = (value: string) => {
    const pasted = asUrlList(value);
    if (pasted && pasted.length > 1) {
      addLinks(pasted);
      setUrl("");
      return;
    }
    setUrl(value);
  };

  const quickAdd = (u: string) =>
    window.pond.query("saves.quickAdd", { url: u }) as Promise<QuickAddResult>;

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
      /** Say the link already existed instead of silently closing, so the collapse isn't mistaken for a second copy being saved. */
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
    const all = [...links, ...(trimmedUrl ? [withScheme(trimmedUrl)] : [])];
    setBusy(true);
    try {
      if (all.length > 1) await submitMany(all);
      else await submitOne(all[0] ?? "");
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

  return (
    /** The dock's AnimatePresence and the pill's `layout` own the morph, so this is just the card content. */
    <div className={styles.card}>
      <Dock.Root>
        <Dock.Close />
        <Dock.Header>
          <Dock.Title>New Save</Dock.Title>
          <Dock.Separator />
          <Dock.Description>
            Paste a link to add it to your library. Keep pasting to build a
            list, and everything saves together.
          </Dock.Description>
        </Dock.Header>
        <div className={styles.fields}>
          {links.map((link) => (
            <LinkRow
              key={link}
              url={link}
              onRemove={() =>
                setLinks((prev) => prev.filter((l) => l !== link))
              }
            />
          ))}
          <div className={styles.row}>
            <SourceGlyph url={draftUrl} />
            <Input.Field
              ref={inputRef}
              className={styles.input}
              value={url}
              placeholder={
                links.length > 0 ? "Add another link…" : "Paste a link to save…"
              }
              spellCheck={false}
              autoComplete="off"
              autoFocus
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onFieldKeyDown}
              onPaste={onPaste}
            />
          </div>
        </div>
        <Dock.Footer>
          <Dock.Cancel />
          <Dock.Confirm
            disabled={!canSubmit}
            onClick={(e) => {
              /** Submit closes the dock itself on success and keeps the card open on failure. */
              e.preventDefault();
              void submit();
            }}
          >
            {pendingCount > 1 ? `Save ${pendingCount} Links` : "Save"}
          </Dock.Confirm>
        </Dock.Footer>
      </Dock.Root>
    </div>
  );
}
