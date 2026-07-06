import { IconCheck3Outline12 as Check } from "@pond/icons/outline/12";
import {
  IconFolderOpenOutline18 as FolderOpen,
  IconPenOutline18 as Pencil,
  IconArchivePlusOutline18 as Plus,
  IconGearOutline18 as Settings,
} from "@pond/icons/outline/18";
import { IconGithub, IconXTwitter } from "@pond/icons/social-media";
import { Input } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { usePonds } from "@/hooks/use-ponds";
import { glyphKind, PondGlyph } from "@/lib/ui/pond-icons";
import { prettyPath } from "@/lib/util/pretty-path";
import { pondCustomise } from "@/stores/pond-customise";
import styles from "./styles.module.css";

const GITHUB_URL = "https://github.com/raphaelsalaja/pond";
const TWITTER_URL = "https://x.com/raphaelsalaja";

// The library switcher as a dock view: search, the scrollable pond list, and
// the library actions, morphed out of the pill instead of floating as a menu.
// Roving arrow-key focus keeps it navigable without the Menu primitive.
export function LibraryContent() {
  const dock = useDock();
  const { ponds, active, switching, switchTo } = usePonds();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ponds;
    return ponds.filter(
      (pond) =>
        pond.name.toLowerCase().includes(needle) ||
        pond.path.toLowerCase().includes(needle),
    );
  }, [ponds, query]);

  async function switchExisting() {
    const res = (await window.pond.query("library.pickExisting", {})) as
      | { ok: true; path: string }
      | { ok: false; reason: string };
    if (res.ok) switchTo(res.path);
    dock.closeLibrary();
  }

  // Roving focus across every `[data-row]` (pond rows + actions). Down/Up move
  // between rows; from the search field, Down jumps into the list.
  const rows = () =>
    Array.from(
      cardRef.current?.querySelectorAll<HTMLButtonElement>("[data-row]") ?? [],
    );

  const focusRow = (delta: number, from?: HTMLElement) => {
    const items = rows();
    if (items.length === 0) return;
    const current = from ?? (document.activeElement as HTMLElement | null);
    const idx = current ? items.indexOf(current as HTMLButtonElement) : -1;
    const next = Math.max(0, Math.min(items.length - 1, idx + delta));
    items[idx === -1 && delta > 0 ? 0 : next]?.focus();
  };

  const onRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusRow(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusRow(-1);
    }
  };

  return (
    // The dock's AnimatePresence wraps this in the swap motion.div; the pill's
    // `layout` owns the size morph, so this is just the card content.
    <div ref={cardRef} className={styles.card}>
      <Input.Root className={styles.search}>
        <Input.Field
          className={styles["search-field"]}
          placeholder="Search…"
          value={query}
          spellCheck={false}
          autoComplete="off"
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              focusRow(1);
            }
          }}
        />
      </Input.Root>

      <div className={styles.list}>
        {filtered.map((pond) => (
          <button
            type="button"
            key={pond.path}
            data-row
            className={styles.row}
            disabled={switching || pond.active || !pond.exists}
            onClick={() => switchTo(pond.path)}
            onKeyDown={onRowKeyDown}
          >
            <span
              aria-hidden
              className={styles.avatar}
              data-emoji={glyphKind(pond.avatar) === "emoji" || undefined}
              data-icon={glyphKind(pond.avatar) === "icon" || undefined}
              data-missing={!pond.exists || undefined}
              style={pond.color ? { background: pond.color } : undefined}
            >
              <PondGlyph avatar={pond.avatar} name={pond.name} iconSize={18} />
            </span>
            <span className={styles["row-text"]}>
              <span className={styles["row-name"]}>{pond.name}</span>
              <span className={styles["row-path"]}>
                {prettyPath(pond.path)}
              </span>
            </span>
            {pond.active ? (
              <Check className={styles.check} aria-hidden />
            ) : null}
          </button>
        ))}
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {ponds.length === 0 ? "No libraries yet." : "No libraries match."}
          </div>
        ) : null}
      </div>

      <hr className={styles.divider} />

      <button
        type="button"
        data-row
        className={styles.action}
        onClick={() => {
          pondCustomise.open(active?.path);
          dock.closeLibrary();
        }}
        onKeyDown={onRowKeyDown}
      >
        <Pencil className={styles["action-icon"]} />
        Edit Pond
      </button>
      <button
        type="button"
        data-row
        className={styles.action}
        onClick={() => {
          void window.pond.query("library.create", {});
          dock.closeLibrary();
        }}
        onKeyDown={onRowKeyDown}
      >
        <Plus className={styles["action-icon"]} />
        Create Pond
        <kbd className={styles.keyboard}>L then C</kbd>
      </button>
      <button
        type="button"
        data-row
        className={styles.action}
        onClick={() => void switchExisting()}
        onKeyDown={onRowKeyDown}
      >
        <FolderOpen className={styles["action-icon"]} />
        Switch library…
      </button>

      <hr className={styles.divider} />

      <button
        type="button"
        data-row
        className={styles.action}
        onClick={() => {
          void navigate({ to: "/settings" });
          dock.closeLibrary();
        }}
        onKeyDown={onRowKeyDown}
      >
        <Settings className={styles["action-icon"]} />
        Settings
        <kbd className={styles.keyboard}>⌘,</kbd>
      </button>

      <hr className={styles.divider} />

      <button
        type="button"
        data-row
        className={styles.action}
        onClick={() => void window.pond.openExternal(GITHUB_URL)}
        onKeyDown={onRowKeyDown}
      >
        <IconGithub width={16} height={16} fill="currentColor" />
        GitHub
      </button>
      <button
        type="button"
        data-row
        className={styles.action}
        onClick={() => void window.pond.openExternal(TWITTER_URL)}
        onKeyDown={onRowKeyDown}
      >
        <IconXTwitter width={16} height={16} fill="currentColor" />
        Twitter
      </button>
    </div>
  );
}
