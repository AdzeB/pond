import { IconXmarkOutline18 as Cross } from "@pond/icons/outline/18";
import { Button, TitleBar } from "@pond/ui";
import { useEffect, useState } from "react";
import { ImageComments } from "@/features/saves/components/annotations/image-comments";
import { SaveInfoSections } from "@/features/saves/components/detail/info-sections";
import { KebabMenu } from "@/features/saves/components/detail/kebab/kebab";
import { RatingStars } from "@/features/saves/components/detail/rating";
import { SaveTags } from "@/features/saves/components/detail/tags";
import { VideoNotesSection } from "@/features/saves/components/detail/video-notes";
import { useSaveDetail } from "@/features/saves/hooks/use-save-detail";
import { useSave } from "@/features/saves/hooks/use-saves";
import { isSameTitleAndContent } from "@/features/saves/lib/detail";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import { buildMediaUnits } from "@/features/saves/lib/media/units";
import { mutateSave } from "@/features/saves/lib/mutate";
import { isTextOnlySave } from "@/features/saves/lib/text";
import { useSaveViewerFileIndex } from "@/features/saves/state/save-viewer";
import type { Save } from "@/features/saves/types";
import { ExpandableText } from "@/shared/components/expandable-text";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";

export function SaveInspector({ saveId }: { saveId: string }) {
  const save = useSave(saveId);
  const fileIndex = useSaveViewerFileIndex();
  const scrollFade = useScrollFade<HTMLDivElement>();

  return (
    <div className={styles.root}>
      <TitleBar.Root className={styles.header}>
        <TitleBar.Start>
          <TitleBar.Label className={styles.label}>Details</TitleBar.Label>
        </TitleBar.Start>
        <TitleBar.End className={styles.actions}>
          {save ? <KebabMenu save={save} fileIndex={fileIndex} /> : null}
          <Button
            type="button"
            icon
            size="sm"
            variant="ghost"
            aria-label="Close Details"
            onClick={saveLibraryBridge.closeRightPane}
          >
            <Cross />
          </Button>
        </TitleBar.End>
      </TitleBar.Root>
      {save ? (
        <div className={styles.scroll} {...scrollFade}>
          <AboutSections save={save} />
          <SaveInfoSections save={save} />
        </div>
      ) : null}
    </div>
  );
}

function AboutSections({ save }: { save: Save }) {
  const { description } = useSaveDetail(save.id);
  const fileIndex = useSaveViewerFileIndex() ?? 0;
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
    !textOnly &&
    (local ||
      !showContent ||
      !isSameTitleAndContent(displayTitle, description));

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
        <span className={styles["field-label"]}>Tags</span>
        <SaveTags save={save} />
      </div>

      <div className={styles.tags}>
        <span className={styles["field-label"]}>Rating</span>
        <RatingStars save={save} />
      </div>

      {hasVideo ? <VideoNotesSection save={save} /> : null}
      <ImageComments save={save} fileIndex={fileIndex} />
    </>
  );
}
