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
import { TagPicker } from "@/components/popovers/tag-picker";
import { pickPrimaryUnit } from "@/pool/media";
import { mutateSave, setSaveTags } from "@/pool/mutate-save";
import { useResolvedTheme } from "@/pool/theme";
import type { Save } from "@/pool/types";
import { pickAuthorAvatarUrl } from "@/pool/url";
import { descriptionMatchesTitle, pickAuthorColor } from "../helpers";
import {
  collectMetadataRows,
  collectPropertyRows,
  type PaneRow,
} from "../rows";
import styles from "./styles.module.css";

interface SavePreviewProps extends React.ComponentPropsWithoutRef<"article"> {
  save: Save;
}

export function SavePreview({ save, className, ...props }: SavePreviewProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const theme = useResolvedTheme();
  const cover = useMemo(() => pickPrimaryUnit(save, { theme }), [save, theme]);
  const stats = useMemo(() => collectMetadataRows(save), [save]);
  const props2 = useMemo(() => collectPropertyRows(save), [save]);
  const avatarUrl = useMemo(() => pickAuthorAvatarUrl(save), [save]);
  const description = save.description?.trim() ?? "";
  const showDescription =
    description.length > 0 && !descriptionMatchesTitle(save);

  return (
    <article
      className={[styles.preview, styles.pane, className ?? ""]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {cover ? (
        <div className={styles["pane-cover"]}>
          {cover.isVideo ? (
            <PaneCoverVideo
              key={cover.url}
              src={cover.url}
              posterUrl={cover.posterUrl}
            />
          ) : (
            <img src={cover.url} alt="" className={styles["pane-cover-img"]} />
          )}
        </div>
      ) : null}

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
          <div
            className={styles["pane-description"]}
            data-clamped={descExpanded ? undefined : "true"}
          >
            {description}
          </div>
          {description.length > 200 ? (
            <button
              type="button"
              className={styles["pane-read-more"]}
              onClick={() => setDescExpanded((v) => !v)}
              aria-expanded={descExpanded}
            >
              <span>{descExpanded ? "Show Less" : "Read More"}</span>
              <ChevronDown
                width={12}
                height={12}
                data-rotate={descExpanded ? "true" : undefined}
                className={styles["pane-read-more-icon"]}
              />
            </button>
          ) : null}
        </PaneSection>
      ) : null}

      <PaneSection label="Tags">
        <PaneTags save={save} />
      </PaneSection>

      <PaneSection label="Notes">
        <PaneNotes save={save} />
      </PaneSection>

      {stats.length > 0 ? (
        <PaneSection label="Metadata">
          <PaneRowList rows={stats} />
        </PaneSection>
      ) : null}

      {props2.length > 0 ? (
        <PaneSection label="Properties">
          <PaneRowList rows={props2} />
        </PaneSection>
      ) : null}
    </article>
  );
}

function PaneCoverVideo({
  src,
  posterUrl,
}: {
  src: string;
  posterUrl?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed && posterUrl) {
    return <img src={posterUrl} alt="" className={styles["pane-cover-img"]} />;
  }

  return (
    <video
      src={src}
      poster={posterUrl}
      className={styles["pane-cover-video"]}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    >
      <track kind="captions" />
    </video>
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
          <span className={styles["pane-row-icon"]} aria-hidden>
            {row.icon}
          </span>
          <span className={styles["pane-row-label"]}>{row.label}</span>
          <span className={styles["pane-row-value"]}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function PaneNotes({ save }: { save: Save }) {
  const [draft, setDraft] = useState(save.notes ?? "");

  // Resync the local draft when the selection changes or notes update from
  // elsewhere (e.g. an undo).
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

function PaneTags({ save }: { save: Save }) {
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
