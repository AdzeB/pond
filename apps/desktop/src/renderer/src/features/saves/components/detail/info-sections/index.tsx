import type { IconComponent } from "@pond/icons/types";
import { Button, Tooltip } from "@pond/ui";
import { useState } from "react";
import { ColorSwatch } from "@/features/saves/components/detail/color-swatch";
import { Section } from "@/features/saves/components/detail/section";
import { useSaveDetail } from "@/features/saves/hooks/use-save-detail";
import {
  type DetailGroup,
  type DetailRow,
  groupDetailRows,
} from "@/features/saves/lib/detail";
import { pickAuthorColor } from "@/features/saves/lib/presentation";
import type { Save } from "@/features/saves/types";
import { sourceDetail } from "@/features/sources/state/source-detail";
import { initials } from "@/shared/lib/initials";
import styles from "./styles.module.css";

const SKELETON_ROWS = ["first", "second", "third", "fourth"] as const;

interface SaveInfoSectionsProps {
  save: Save;
  pending?: boolean;
  hideActivity?: boolean;
}

export function SaveInfoSections({
  save,
  pending,
  hideActivity,
}: SaveInfoSectionsProps) {
  const {
    rows,
    colors,
    avatarUrl,
    sourceLogo,
    sourceIcon: SourceIcon,
  } = useSaveDetail(save.id);
  const groups = groupDetailRows(rows).filter(
    (group) => !hideActivity || group.title !== "Activity",
  );
  const renderedTitles = new Set(groups.map((group) => group.title));

  return (
    <>
      {pending ? (
        <span className={styles["sr-only"]} role="status">
          Loading save details
        </span>
      ) : null}
      {groups.map((group) => (
        <InfoSection
          key={group.title}
          group={group}
          colors={colors}
          avatarUrl={avatarUrl}
          sourceLogo={sourceLogo}
          SourceIcon={SourceIcon}
          placeholders={pending ? placeholderCount(group) : 0}
        />
      ))}
      {pending && !renderedTitles.has("Properties") ? (
        <SkeletonSection title="Properties" rows={4} />
      ) : null}
      {pending && !renderedTitles.has("File") ? (
        <SkeletonSection title="File" rows={3} defaultOpen={false} />
      ) : null}
      {pending && !renderedTitles.has("Dates") ? (
        <SkeletonSection title="Dates" rows={2} defaultOpen={false} />
      ) : null}
      {!renderedTitles.has("Properties") && colors.length > 0 ? (
        <Section title="Properties">
          <div className={styles.rows}>
            <PropertyColors colors={colors} />
          </div>
        </Section>
      ) : null}
    </>
  );
}

export function SaveInfoSectionsSkeleton() {
  return (
    <>
      <span className={styles["sr-only"]} role="status">
        Loading save details
      </span>
      <SkeletonSection title="Properties" rows={4} />
      <SkeletonSection title="File" rows={3} defaultOpen={false} />
      <SkeletonSection title="Dates" rows={2} defaultOpen={false} />
    </>
  );
}

function placeholderCount(group: DetailGroup): number {
  if (group.title === "Properties") return Math.max(0, 4 - group.rows.length);
  if (group.title === "File") return Math.max(0, 3 - group.rows.length);
  return 0;
}

function InfoSection({
  group,
  colors,
  avatarUrl,
  sourceLogo,
  SourceIcon,
  placeholders,
}: {
  group: DetailGroup;
  colors: string[];
  avatarUrl: string | null;
  sourceLogo: string | null;
  SourceIcon: IconComponent | null;
  placeholders: number;
}) {
  return (
    <Section
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
        {SKELETON_ROWS.slice(0, placeholders).map((row, index) => (
          <SkeletonRow key={row} index={index} />
        ))}
      </div>
    </Section>
  );
}

function SkeletonSection({
  title,
  rows,
  defaultOpen = true,
}: {
  title: string;
  rows: number;
  defaultOpen?: boolean;
}) {
  return (
    <Section title={title} defaultOpen={defaultOpen}>
      <div className={styles.rows} aria-hidden="true">
        {SKELETON_ROWS.slice(0, rows).map((row, index) => (
          <SkeletonRow key={row} index={index} />
        ))}
      </div>
    </Section>
  );
}

function SkeletonRow({ index }: { index: number }) {
  return (
    <div className={styles.row} aria-hidden="true">
      <span className={styles["skeleton-label"]} />
      <span className={styles["skeleton-value"]} data-width={(index % 3) + 1} />
    </div>
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
  SourceIcon: IconComponent | null;
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
