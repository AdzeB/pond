import { IconXmarkOutline18 as Cross } from "@pond/icons/outline/18";
import { Button, TitleBar, Tooltip } from "@pond/ui";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { KebabMenu } from "@/components/save/detail/kebab";
import { Section } from "@/components/save/detail/section";
import { SaveTags } from "@/components/save/detail/tags";
import { VideoNotesSection } from "@/components/save/detail/video-notes";
import { pickAuthorColor } from "@/components/save/preview/lib/helpers";
import { ColorSwatch } from "@/components/shared/color-swatch";
import { ExpandableText } from "@/components/shared/expandable-text";
import { useSaveDetail } from "@/hooks/use-save-detail";
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
import { closeSave } from "@/lib/ui/save-nav";
import { initials } from "@/lib/util/initials";
import { sourceDetail } from "@/stores/source-detail";
import styles from "./styles.module.css";

function DetailCard({
  title,
  start,
  end,
  children,
}: {
  title: string;
  start?: ReactNode;
  end?: ReactNode;
  children: ReactNode;
}) {
  const scrollFade = useScrollFade<HTMLDivElement>();
  return (
    <div className={styles.card}>
      <TitleBar.Root className={styles.header}>
        <TitleBar.Start>{start}</TitleBar.Start>
        <TitleBar.Title>
          <TitleBar.Label>{title}</TitleBar.Label>
        </TitleBar.Title>
        <TitleBar.End>{end}</TitleBar.End>
      </TitleBar.Root>
      <div className={styles.scroll} {...scrollFade}>
        {children}
      </div>
    </div>
  );
}

export function SaveAbout({
  save,
  fileIndex = null,
}: {
  save: Save;
  /** Active media file in the viewer; kebab file actions target this asset. */
  fileIndex?: number | null;
}) {
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
    <DetailCard
      title="About"
      start={<KebabMenu save={save} fileIndex={fileIndex} />}
    >
      {showTitle ? (
        <Section title="Title">
          {local ? (
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
          )}
        </Section>
      ) : null}

      {showContent ? (
        <Section title="Content">
          <ExpandableText text={description} compact />
        </Section>
      ) : null}

      <Section title="Tags">
        <SaveTags save={save} />
      </Section>

      {hasVideo ? <VideoNotesSection save={save} /> : null}
    </DetailCard>
  );
}

export function SaveInfo({ save }: { save: Save }) {
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
    <DetailCard
      title="Details"
      end={
        <Button
          type="button"
          icon
          size="xs"
          variant="ghost"
          aria-label="Close"
          onClick={() => closeSave()}
        >
          <Cross />
        </Button>
      }
    >
      {groups.map((group) => (
        <Section key={group.title} title={group.title}>
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
    </DetailCard>
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
  return (
    <span
      className={styles["row-avatar"]}
      style={{ background: pickAuthorColor(name) }}
      aria-hidden
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
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
              {row.value}
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
            {row.value}
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
