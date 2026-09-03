import { IconXmarkOutline18 as Cross } from "@pond/icons/outline/18";
import { Button, Input, TitleBar, Tooltip } from "@pond/ui";
import { type ComponentType, useEffect, useState } from "react";
import { KebabMenu } from "@/components/save/detail/kebab";
import { RatingStars } from "@/components/save/detail/rating";
import { Section } from "@/components/save/detail/section";
import { SaveTags } from "@/components/save/detail/tags";
import { VideoNotesSection } from "@/components/save/detail/video-notes";
import { pickAuthorColor } from "@/components/save/preview/lib/helpers";
import { ColorSwatch } from "@/components/shared/color-swatch";
import { ExpandableText } from "@/components/shared/expandable-text";
import { useSaveDetail } from "@/hooks/use-save-detail";
import { useSave } from "@/hooks/use-saves";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { buildMediaUnits } from "@/lib/media/units";
import {
  type DetailRow,
  groupDetailRows,
  isSameTitleAndContent,
} from "@/lib/save/detail";
import { mutateSave } from "@/lib/save/mutate";
import { isTextOnlySave } from "@/lib/save/text";
import type { Save } from "@/lib/types";
import { initials } from "@/lib/util/initials";
import { libraryChrome } from "@/stores/library-chrome";
import { useSaveViewerFileIndex } from "@/stores/save-viewer";
import { sourceDetail } from "@/stores/source-detail";
import styles from "./styles.module.css";

export function SaveInspector({ saveId }: { saveId: string }) {
  const save = useSave(saveId);
  const fileIndex = useSaveViewerFileIndex();
  const scrollFade = useScrollFade<HTMLDivElement>();

  return (
    <div className={styles.root}>
      <TitleBar.Root className={styles.header}>
        <TitleBar.Start>
          <TitleBar.Label>Details</TitleBar.Label>
        </TitleBar.Start>
        <TitleBar.End>
          {save ? <KebabMenu save={save} fileIndex={fileIndex} /> : null}
          <Button
            type="button"
            icon
            size="xs"
            variant="ghost"
            aria-label="Close Details"
            onClick={libraryChrome.closeRightPane}
          >
            <Cross />
          </Button>
        </TitleBar.End>
      </TitleBar.Root>
      {save ? (
        <div className={styles.scroll} {...scrollFade}>
          <AboutSections save={save} />
          <InfoSections save={save} />
        </div>
      ) : null}
    </div>
  );
}

function AboutSections({ save }: { save: Save }) {
  const { description } = useSaveDetail(save.id);
  const displayTitle = save.title?.trim() || save.author?.trim() || "Untitled";
  const local = save.source === "local";
  const [titleDraft, setTitleDraft] = useState(save.title ?? "");

  useEffect(() => {
    setTitleDraft(save.title ?? "");
  }, [save.title]);

  const hasVideo = buildMediaUnits(save).some((u) => u.isVideo);
  const textOnly = isTextOnlySave(save);
  const showContent = Boolean(description) && !textOnly;
  const showTitle =
    local || !showContent || !isSameTitleAndContent(displayTitle, description);

  const commitTitle = async () => {
    const next = titleDraft.trim();
    const prev = save.title?.trim() ?? "";
    if (next === prev) return;
    if (!next && !prev) return;
    await mutateSave(
      save.id,
      { title: next || null },
      { actorReason: "user:rename" },
    );
  };

  return (
    <>
      <div className={styles.about}>
        {showTitle ? (
          local ? (
            <input
              data-pane-title
              className={`${styles["heading-title"]} ${styles["heading-input"]}`}
              value={titleDraft}
              placeholder="Untitled"
              aria-label="Title"
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void commitTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
            />
          ) : (
            <h2 className={styles["heading-title"]}>{displayTitle}</h2>
          )
        ) : null}

        {showContent ? <ExpandableText text={description} compact /> : null}
      </div>

      <div className={styles.tags}>
        <span className={styles.label}>Tags</span>
        <SaveTags save={save} />
      </div>

      <div className={styles.tags}>
        <span className={styles.label}>Rating</span>
        <RatingStars save={save} />
      </div>

      {hasVideo ? <VideoNotesSection save={save} /> : null}
      {(save.comments ?? []).length > 0 ? (
        <div className={styles.tags}>
          <span className={styles.label}>Comments</span>
          <ul>
            {(save.comments ?? []).map((comment) => (
              <li key={comment.id}>{comment.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <CommentComposer save={save} />
    </>
  );
}

function CommentComposer({ save }: { save: Save }) {
  const [text, setText] = useState("");
  return (
    <div className={styles.tags}>
      <span className={styles.label}>Add Comment</span>
      <Input.Root size="sm">
        <Input.Field
          value={text}
          placeholder="Write a comment"
          onValueChange={setText}
        />
      </Input.Root>
      <Button
        size="xs"
        variant="secondary"
        disabled={!text.trim()}
        onClick={() => {
          const next = text.trim();
          if (!next) return;
          void mutateSave(
            save.id,
            {
              comments: [
                ...(save.comments ?? []),
                {
                  id: crypto.randomUUID(),
                  x: 0.46,
                  y: 0.46,
                  w: 0.08,
                  h: 0.08,
                  text: next,
                },
              ],
            },
            { actorReason: "inspect:comment" },
          );
          setText("");
        }}
      >
        Add
      </Button>
    </div>
  );
}

function InfoSections({ save }: { save: Save }) {
  const {
    rows,
    colors,
    avatarUrl,
    sourceLogo,
    sourceIcon: SourceIcon,
  } = useSaveDetail(save.id);

  const groups = groupDetailRows(rows);
  const hasProperties = groups.some((group) => group.title === "Properties");

  return (
    <>
      {groups.map((group) => (
        <Section
          key={group.title}
          title={group.title}
          defaultOpen={group.title !== "File" && group.title !== "Dates"}
        >
          <div className={styles.rows}>
            {group.rows.map((row) => (
              <PropertyRow
                key={row.id}
                row={row}
                avatarUrl={avatarUrl}
                sourceLogo={sourceLogo}
                SourceIcon={SourceIcon}
              />
            ))}
            {group.title === "Properties" ? (
              <PropertyColors colors={colors} />
            ) : null}
          </div>
        </Section>
      ))}

      {!hasProperties && colors.length > 0 ? (
        <Section title="Properties">
          <div className={styles.rows}>
            <PropertyColors colors={colors} />
          </div>
        </Section>
      ) : null}
    </>
  );
}

function PropertyColors({ colors }: { colors: string[] }) {
  if (colors.length === 0) return null;
  return (
    <div className={styles.row}>
      <span className={styles.label}>Colors</span>
      <div className={styles.colors}>
        {colors.map((color) => (
          <ColorSwatch key={color} color={color} />
        ))}
      </div>
    </div>
  );
}

function AuthorAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span
      className={styles["row-avatar"]}
      style={{ background: pickAuthorColor(name) }}
      aria-hidden
    >
      {avatarUrl && avatarUrl !== failedUrl ? (
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function PropertyRow({
  row,
  avatarUrl,
  sourceLogo,
  SourceIcon,
}: {
  row: DetailRow;
  avatarUrl: string | null;
  sourceLogo: string | null;
  SourceIcon: ComponentType<{
    width?: number;
    height?: number;
  }> | null;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{row.label}</span>
      {row.kind === "author" ? (
        row.href ? (
          <Tooltip label="Open in browser" side="left">
            <Button
              type="button"
              variant="link"
              size="sm"
              className={styles["row-author"]}
              onClick={() => {
                const href = row.href;
                if (href) void window.pond.openExternal(href);
              }}
            >
              <AuthorAvatar name={row.value} avatarUrl={avatarUrl} />
              <span className={styles.value}>{row.value}</span>
            </Button>
          </Tooltip>
        ) : (
          <span className={styles["row-inline"]}>
            <AuthorAvatar name={row.value} avatarUrl={avatarUrl} />
            <span className={styles.value}>{row.value}</span>
          </span>
        )
      ) : row.kind === "account" && row.accountId ? (
        <Tooltip label="Open source" side="left">
          <Button
            type="button"
            variant="link"
            size="sm"
            className={styles["row-author"]}
            onClick={() => {
              const id = row.accountId;
              if (!id) return;
              if (row.watch) sourceDetail.openWatch(id);
              else sourceDetail.openAccount(id);
            }}
          >
            <AuthorAvatar name={row.value} avatarUrl={row.avatarUrl ?? null} />
            <span className={styles.value}>{row.value}</span>
          </Button>
        </Tooltip>
      ) : row.kind === "platform" ? (
        <span className={styles["row-inline"]}>
          {sourceLogo ? (
            <span className={styles["row-source-icon"]} aria-hidden>
              <img src={sourceLogo} alt="" width={16} height={16} />
            </span>
          ) : SourceIcon ? (
            <span className={styles["row-source-icon"]} aria-hidden>
              <SourceIcon width={16} height={16} />
            </span>
          ) : null}
          <span className={styles.value}>{row.value}</span>
        </span>
      ) : (
        <span className={styles.value} title={row.value}>
          {row.value}
        </span>
      )}
    </div>
  );
}
