import { Tooltip, useToast } from "@pond/ui";
import { ChevronLeft, ChevronRight, Ellipsis, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { VideoPlayer } from "@/components/media/video-player";
import type { ChapterCue } from "@/components/media/video-player/chapters-vtt";
import { SaveActionsMenu } from "@/components/save/context-menu";
import { getYouTubeChapters } from "@/components/save/preview/helpers";
import { MediaViewer } from "@/components/save/preview/media-viewer";
import type { ListContext } from "@/lib/use-save-list-context";
import { buildMediaUnits } from "@/pool/media";
import { useResolvedTheme } from "@/pool/theme";
import type { Save, SaveFile } from "@/pool/types";
import { buildPondUrl } from "@/pool/url";
import styles from "./styles.module.css";

interface HeaderProps {
  save: Save;
  list: ListContext;
}

function Header({ save, list }: HeaderProps) {
  const counter =
    list.index >= 0 ? `${list.index + 1} / ${list.total}` : `- / ${list.total}`;

  return (
    <header className={styles.header}>
      <div className={styles["header-lead"]}>
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
      </div>

      <div className={styles["header-actions"]}>
        <StatusPill save={save} />
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <button
                type="button"
                className={styles["header-icon-btn"]}
                aria-label="Star (coming soon)"
                disabled
              >
                <Star width={14} height={14} />
              </button>
            }
          />
          <Tooltip.Portal>
            <Tooltip.Positioner side="bottom">
              <Tooltip.Popup>Star</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        <SaveActionsMenu save={save}>
          <button
            type="button"
            className={styles["header-icon-btn"]}
            aria-label="More options"
          >
            <Ellipsis width={14} height={14} />
          </button>
        </SaveActionsMenu>
        <span className={styles["header-divider"]} aria-hidden />
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <button
                type="button"
                className={styles["header-icon-btn"]}
                onClick={list.goPrev}
                disabled={!list.prevId}
                aria-label="Previous save"
              >
                <ChevronLeft width={14} height={14} />
              </button>
            }
          />
          <Tooltip.Portal>
            <Tooltip.Positioner side="bottom">
              <Tooltip.Popup>Previous (K)</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <button
                type="button"
                className={styles["header-icon-btn"]}
                onClick={list.goNext}
                disabled={!list.nextId}
                aria-label="Next save"
              >
                <ChevronRight width={14} height={14} />
              </button>
            }
          />
          <Tooltip.Portal>
            <Tooltip.Positioner side="bottom">
              <Tooltip.Popup>Next (J)</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </header>
  );
}

function StatusPill({ save }: { save: Save }) {
  const toast = useToast();
  const [retrying, setRetrying] = useState(false);
  const status = save.status ?? "complete";
  if (status === "complete") return null;
  if (status === "ingesting") {
    const running = save.tasks?.find((t) => t.status === "running");
    const label = running ? running.op.replace(/_/g, " ") : "ingesting";
    return (
      <span
        className={styles["status-pill"]}
        data-state="ingesting"
        title={`Pipeline running: ${label}`}
      >
        <span className={styles["status-dot"]} aria-hidden />
        {label}
      </span>
    );
  }
  const failedTask = save.tasks?.find((t) => t.status === "failed");
  const reason = failedTask?.lastError ?? "Ingest failed";
  return (
    <button
      type="button"
      className={styles["status-pill"]}
      data-state="failed"
      disabled={retrying}
      title={reason}
      onClick={async () => {
        setRetrying(true);
        try {
          const r = await window.pond.refreshSave(save.id);
          toast.add({
            title: r.ok ? "Retrying ingest" : "Couldn't retry",
            description: r.ok
              ? "The pipeline will pick this up shortly."
              : "Try again in a moment.",
            type: r.ok ? "success" : "error",
          });
        } finally {
          setRetrying(false);
        }
      }}
    >
      {retrying ? "Retrying…" : "Retry ingest"}
    </button>
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
      <div className={styles.frame}>
        {useHero ? (
          <HeroVideo save={save} chapters={chapters} />
        ) : (
          <MediaViewer save={save} />
        )}
      </div>
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
