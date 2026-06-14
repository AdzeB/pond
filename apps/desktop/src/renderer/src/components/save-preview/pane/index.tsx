import {
  IconChevronDownOutline18 as ChevronDown,
  IconPlusOutline18 as Plus,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  descriptionMatchesTitle,
  pickAuthorColor,
} from "@/components/save-preview/helpers";
import { collectInfoRows, type PaneRow } from "@/components/save-preview/rows";
import { TagPicker } from "@/components/tag-picker";
import { mutateSave, setSaveTags } from "@/lib/mutate-save";
import type { Save } from "@/lib/types";
import { pickAuthorAvatarUrl } from "@/lib/url";
import styles from "./styles.module.css";

// The metadata column (title, author, description, tags, notes, stats), shared by the drawer and standalone window.
export function SaveInfo({ save }: { save: Save }) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const info = useMemo(() => collectInfoRows(save), [save]);
  const avatarUrl = useMemo(() => pickAuthorAvatarUrl(save), [save]);
  const description = save.description?.trim() ?? "";
  const showDescription =
    description.length > 0 && !descriptionMatchesTitle(save);

  return (
    <>
      <h2
        className={styles["pane-title"]}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-pane-title
        onBlur={async (e) => {
          const next = e.currentTarget.textContent?.trim() ?? "";
          if (next === (save.title ?? "")) return;
          await mutateSave(save.id, { title: next || null });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLElement).blur();
          }
        }}
      >
        {save.title ?? ""}
      </h2>

      {save.author ? (
        <div className={styles["pane-author"]}>
          <span
            className={styles["pane-author-dot"]}
            style={{ background: pickAuthorColor(save.author) }}
            aria-hidden
          >
            {avatarUrl && !avatarBroken ? (
              <img
                src={avatarUrl}
                alt=""
                className={styles["pane-author-avatar"]}
                onError={() => setAvatarBroken(true)}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ) : null}
          </span>
          <span className={styles["pane-author-name"]}>{save.author}</span>
        </div>
      ) : null}

      {showDescription ? (
        <PaneSection label="Description">
          <DescriptionBlock save={save} />
        </PaneSection>
      ) : null}

      <PaneSection label="Tags">
        <TagsEditor save={save} />
      </PaneSection>

      <PaneSection label="Notes">
        <NotesEditor save={save} />
      </PaneSection>

      {info.length > 0 ? (
        <PaneSection label="Details">
          <PaneRowList rows={info} />
        </PaneSection>
      ) : null}
    </>
  );
}

function PaneSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className={styles["pane-section"]}>
      <h3 className={styles["pane-section-header"]}>{label}</h3>
      {children}
    </section>
  );
}

function PaneRowList({ rows }: { rows: PaneRow[] }) {
  return (
    <div className={styles["pane-row-list"]}>
      {rows.map((row) => (
        <div key={row.id} className={styles["pane-row"]}>
          <span className={styles["pane-row-label"]}>{row.label}</span>
          <span className={styles["pane-row-value"]}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

// Read-only source description with a clamp + "Read More" toggle. Renders a
// muted placeholder when empty so it can stand alone in a card.
export function DescriptionBlock({ save }: { save: Save }) {
  const [expanded, setExpanded] = useState(false);
  const description = save.description?.trim() ?? "";

  if (!description) {
    return <p className={styles["pane-empty"]}>No description.</p>;
  }

  return (
    <>
      <div
        className={styles["pane-description"]}
        data-clamped={expanded ? undefined : "true"}
      >
        {description}
      </div>
      {description.length > 200 ? (
        <button
          type="button"
          className={styles["pane-read-more"]}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span>{expanded ? "Show Less" : "Read More"}</span>
          <ChevronDown
            width={12}
            height={12}
            data-rotate={expanded ? "true" : undefined}
            className={styles["pane-read-more-icon"]}
          />
        </button>
      ) : null}
    </>
  );
}

export function NotesEditor({ save }: { save: Save }) {
  const [draft, setDraft] = useState(save.notes ?? "");

  // Resync the draft when selection changes or notes update elsewhere (e.g. an undo).
  useEffect(() => {
    setDraft(save.notes ?? "");
  }, [save.notes]);

  const commit = useCallback(async () => {
    const next = draft.trim() || null;
    if (next === (save.notes ?? null)) return;
    await mutateSave(save.id, { notes: next });
  }, [draft, save.id, save.notes]);

  return (
    <textarea
      className={styles["notes-input"]}
      value={draft}
      placeholder="Add a note"
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
    />
  );
}

export function TagsEditor({ save }: { save: Save }) {
  const [busy, setBusy] = useState(false);

  const remove = useCallback(
    async (name: string) => {
      setBusy(true);
      try {
        await setSaveTags(
          save.id,
          save.tags.filter((t) => t.toLowerCase() !== name.toLowerCase()),
        );
      } finally {
        setBusy(false);
      }
    },
    [save.id, save.tags],
  );

  return (
    <div className={styles["pane-tags"]}>
      {save.tags.map((tag) => (
        <span key={tag} className={styles["pane-tag"]}>
          <span className={styles["pane-tag-label"]}>{tag}</span>
          <button
            type="button"
            className={styles["pane-tag-remove"]}
            onClick={() => void remove(tag)}
            aria-label={`Remove tag ${tag}`}
            disabled={busy}
          >
            <X width={10} height={10} />
          </button>
        </span>
      ))}
      <TagPicker.Root target={{ kind: "save", save }}>
        <TagPicker.Trigger
          render={
            <button
              type="button"
              className={styles["pane-tag-add"]}
              aria-label="Add tag"
              data-tag-add
            >
              <Plus width={10} height={10} />
            </button>
          }
        />
        <TagPicker.Content side="left" align="start" sideOffset={6} />
      </TagPicker.Root>
    </div>
  );
}
