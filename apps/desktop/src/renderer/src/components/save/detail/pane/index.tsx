import { IconXmarkOutline18 as Cross } from "@pond/icons/outline/18";
import { Button, TitleBar } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { KebabMenu } from "@/components/save/detail/kebab";
import { Section } from "@/components/save/detail/section";
import { TagsSection } from "@/components/save/detail/tags";
import { VideoNotesSection } from "@/components/save/detail/video-notes";
import { pickAuthorColor } from "@/components/save/preview/lib/helpers";
import { ColorSwatch } from "@/components/shared/color-swatch";
import { ExpandableText } from "@/components/shared/expandable-text";
import { useSaveDetail } from "@/hooks/use-save-detail";
import { buildMediaUnits } from "@/lib/media/units";
import { mutateSave } from "@/lib/save/mutate";
import { isTextOnlySave } from "@/lib/save/text";
import type { Save } from "@/lib/types";
import { initials } from "@/lib/util/initials";
import styles from "./styles.module.css";

export function SaveDetails({
  save,
  fileIndex = null,
}: {
  save: Save;
  /** Active media file in the viewer; kebab file actions target this asset. */
  fileIndex?: number | null;
}) {
  const {
    rows,
    description,
    colors,
    avatarUrl,
    sourceLogo,
    sourceIcon: SourceIcon,
  } = useSaveDetail(save.id);

  const displayTitle = save.title?.trim() || save.author?.trim() || "Untitled";
  const local = save.source === "local";
  const [titleDraft, setTitleDraft] = useState(displayTitle);
  const titleRef = useRef(titleDraft);
  titleRef.current = titleDraft;

  useEffect(() => {
    setTitleDraft(displayTitle);
  }, [displayTitle]);

  const hasVideo = buildMediaUnits(save).some((u) => u.isVideo);
  const textOnly = isTextOnlySave(save);

  const commitTitle = async () => {
    const next = titleRef.current.trim();
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
    <div className={styles["detail-card"]}>
      <TitleBar.Root className={styles["detail-header"]}>
        <TitleBar.Start>
          <KebabMenu save={save} fileIndex={fileIndex} />
        </TitleBar.Start>
        <TitleBar.Title>
          <TitleBar.Label className={styles["header-label"]}>
            Save Details
          </TitleBar.Label>
        </TitleBar.Title>
        <TitleBar.End>
          <Button icon size="sm" variant="ghost" aria-label="Close">
            <Cross />
          </Button>
        </TitleBar.End>
      </TitleBar.Root>

      <div className={styles["detail-scroll"]}>
        <div className={styles.heading}>
          {local ? (
            <input
              data-pane-title
              className={`${styles["heading-title"]} ${styles["heading-input"]}`}
              value={titleDraft}
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
        </div>

        {description && !textOnly ? (
          <Section title="Content">
            <ExpandableText text={description} compact />
          </Section>
        ) : null}

        <Section title="Properties">
          <div className={styles.rows}>
            {rows.map((row) => (
              <div key={row.id} className={styles.row}>
                <span className={styles["row-label"]}>{row.label}</span>
                {row.kind === "author" ? (
                  <span className={styles["row-inline"]}>
                    <span
                      className={styles["row-avatar"]}
                      style={{ background: pickAuthorColor(row.value) }}
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
                        initials(row.value)
                      )}
                    </span>
                    <span className={styles["row-value"]}>{row.value}</span>
                  </span>
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
                    <span className={styles["row-value"]}>{row.value}</span>
                  </span>
                ) : (
                  <span className={styles["row-value"]} title={row.value}>
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>

        <TagsSection save={save} />

        {hasVideo ? <VideoNotesSection save={save} /> : null}

        {colors.length > 0 ? (
          <Section title="Colors">
            <div className={styles.colors}>
              {colors.map((color) => (
                <ColorSwatch key={color} color={color} />
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
