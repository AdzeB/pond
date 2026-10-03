import {
  IconBookmarkOutline12,
  IconFileOutline12,
} from "@pond/icons/outline/12";
import { IconFileOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import type { AssistantSource } from "@shared/assistant";
import { sourceExcerpt } from "@shared/assistant-text";
import { useSelector } from "@tanstack/react-store";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { pickCardUnit } from "@/features/saves/lib/media/units";
import { thumbUrlFor } from "@/features/saves/lib/media/url";
import { aspectFor, clampRatio } from "@/features/saves/state/aspect";
import { savesStore } from "@/features/saves/state/pool";
import styles from "./styles.module.css";

interface ThumbnailStyle extends CSSProperties {
  "--thumbnail-aspect": number;
  "--thumbnail-height-scale": number;
  "--thumbnail-width-scale": number;
}

export function sourceDomain(source: AssistantSource) {
  try {
    return new URL(source.url).hostname.replace(/^www\./, "") || source.source;
  } catch {
    return source.source;
  }
}

export function useSourceCovers(ids: string[]) {
  const key = JSON.stringify(ids);
  useEffect(() => {
    if (key !== "[]") void ensureSaves(JSON.parse(key)).catch(() => undefined);
  }, [key]);
}

export function SourceThumbnail({
  id,
  previewUrl,
  source,
  size,
  visual = false,
}: {
  id: string;
  previewUrl?: string;
  source?: AssistantSource;
  size?: "compact";
  visual?: boolean;
}) {
  const save = useSelector(savesStore, (state) => state.byId.get(id));
  const unit = useMemo(() => (save ? pickCardUnit(save) : null), [save]);
  const candidate = unit?.isVideo ? unit.posterUrl : unit?.url;
  const src =
    previewUrl ??
    (candidate?.startsWith("pond://")
      ? thumbUrlFor(candidate, 360)
      : undefined);
  const [broken, setBroken] = useState<string | null>(null);
  const [measured, setMeasured] = useState<{
    aspect: number;
    src: string;
  } | null>(null);
  const aspect =
    measured && measured.src === src
      ? measured.aspect
      : save
        ? aspectFor(save)
        : 1;
  const thumbnailStyle: ThumbnailStyle = {
    "--thumbnail-aspect": aspect,
    "--thumbnail-height-scale": Math.min(1, 1 / aspect),
    "--thumbnail-width-scale": Math.min(1, aspect),
  };
  return (
    <span
      className={styles.thumbnail}
      data-size={size}
      data-visual={visual || undefined}
      style={thumbnailStyle}
      aria-hidden
    >
      {src && broken !== src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={(event) => {
            setMeasured({
              aspect: clampRatio(
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight,
              ),
              src,
            });
          }}
          onError={() => setBroken(src)}
        />
      ) : (
        <span className={styles["cover-fallback"]}>
          {size === "compact" ? <IconFileOutline12 /> : <IconFileOutline18 />}
          {visual ? (
            <span>
              {sourceExcerpt(
                source?.notes || source?.description || source?.title,
                180,
              ) || "No preview available"}
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}

export function SaveCitation({
  source,
  reference,
  onOpenSave,
  compact = false,
}: {
  source: AssistantSource;
  reference: number;
  onOpenSave: (id: string) => void;
  compact?: boolean;
}) {
  const title = sourceExcerpt(source.title, 200) || "Untitled";
  return (
    <Button
      type="button"
      variant="link"
      className={styles.citation}
      aria-label={`Open source ${reference}: ${title}`}
      onClick={() => onOpenSave(source.id)}
      title={`Open ${title}`}
    >
      {compact ? (
        <span>{reference}</span>
      ) : (
        <>
          <IconBookmarkOutline12 className={styles["citation-icon"]} />
          <span className={styles["citation-title"]}>{title}</span>
        </>
      )}
    </Button>
  );
}
