import { Button, Toolbar as PondToolbar, Tooltip } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import { useMemo } from "react";
import { VideoPlayer } from "@/components/media/video-player";
import type { ChapterCue } from "@/components/media/video-player/chapters-vtt";
import {
  SaveActionsMenu,
  SaveContextMenu,
} from "@/components/save/context-menu";
import { getYouTubeChapters } from "@/components/save/preview/helpers";
import { MediaViewer } from "@/components/save/preview/media-viewer";
import type { SaveList } from "@/lib/use-save-list";
import { buildMediaUnits } from "@/pool/media";
import { useResolvedTheme } from "@/pool/theme";
import type { Save, SaveFile } from "@/pool/types";
import { buildPondUrl } from "@/pool/url";
import styles from "./styles.module.css";

interface HeaderProps {
  save: Save;
  list: SaveList;
}

function Header({ save, list }: HeaderProps) {
  const counter =
    list.index >= 0 ? `${list.index + 1} / ${list.total}` : `- / ${list.total}`;

  return (
    <PondToolbar.Root
      aria-label="Save detail toolbar"
      className={styles.header}
    >
      <PondToolbar.Group className={styles["header-lead"]}>
        <Link className={styles["header-back"]} to={list.parentTo}>
          <ChevronLeft width={14} height={14} aria-hidden />
          <span>{list.parentLabel}</span>
        </Link>
        <span
          className={styles["header-counter"]}
          role="status"
          aria-label="Position in list"
        >
          {counter}
        </span>
      </PondToolbar.Group>

      <PondToolbar.Group data-align="end" className={styles["header-actions"]}>
        <SaveActionsMenu save={save}>
          <Button variant="ghost" size="sm" icon aria-label="More options">
            <Ellipsis />
          </Button>
        </SaveActionsMenu>
        <PondToolbar.Separator />
        <Tooltip label="Previous (K)" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            icon
            onClick={list.goPrev}
            disabled={!list.prevId}
            aria-label="Previous save"
          >
            <ChevronLeft />
          </Button>
        </Tooltip>
        <Tooltip label="Next (J)" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            icon
            onClick={list.goNext}
            disabled={!list.nextId}
            aria-label="Next save"
          >
            <ChevronRight />
          </Button>
        </Tooltip>
      </PondToolbar.Group>
    </PondToolbar.Root>
  );
}

interface ContentProps {
  save: Save;
}

function Content({ save }: ContentProps) {
  const theme = useResolvedTheme();
  const units = useMemo(() => buildMediaUnits(save, { theme }), [save, theme]);
  const useHero = units.length === 1 && units[0]?.isVideo === true;

  const chapters = useMemo(
    () =>
      useHero && save.source === "youtube"
        ? getYouTubeChapters(save)
        : undefined,
    [save, useHero],
  );

  return (
    <div className={styles.content}>
      <SaveContextMenu save={save}>
        <div className={styles.frame}>
          {useHero ? (
            <HeroVideo save={save} chapters={chapters} />
          ) : (
            <MediaViewer save={save} />
          )}
        </div>
      </SaveContextMenu>
    </div>
  );
}

interface HeroVideoProps {
  save: Save;
  chapters?: readonly ChapterCue[];
}

function HeroVideo({ save, chapters }: HeroVideoProps) {
  const files = save.files ?? [];
  const video = files.find((f) => f.kind === "video");
  if (!video) return null;
  const poster = pickPoster(files);

  const src = buildPondUrl(save.id, video);
  const posterUrl = poster ? buildPondUrl(save.id, poster) : undefined;

  return (
    <VideoPlayer
      key={src}
      src={src}
      poster={posterUrl}
      save={save}
      chapters={chapters}
    />
  );
}

function pickPoster(files: SaveFile[]): SaveFile | null {
  return (
    files.find((f) => f.kind === "poster") ??
    files.find((f) => f.kind === "cover") ??
    null
  );
}

export const SaveDetail = { Header, Content };
