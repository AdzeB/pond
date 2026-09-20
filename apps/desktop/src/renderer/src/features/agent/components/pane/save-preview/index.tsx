import {
  IconArrowUpRightOutline18,
  IconFileOutline18,
} from "@pond/icons/outline/18";
import { Button, Popover } from "@pond/ui";
import type { AssistantSource } from "@shared/assistant";
import { sourceExcerpt } from "@shared/assistant-text";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { pickCardUnit } from "@/features/saves/lib/media/units";
import { thumbUrlFor } from "@/features/saves/lib/media/url";
import { savesStore } from "@/features/saves/state/pool";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";

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
  source,
  visual = false,
}: {
  id: string;
  source?: AssistantSource;
  visual?: boolean;
}) {
  const save = useSelector(savesStore, (state) => state.byId.get(id));
  const unit = useMemo(() => (save ? pickCardUnit(save) : null), [save]);
  const candidate = unit?.isVideo ? unit.posterUrl : unit?.url;
  const src = candidate?.startsWith("pond://")
    ? thumbUrlFor(candidate, 360)
    : undefined;
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <span
      className={styles.thumbnail}
      data-visual={visual || undefined}
      aria-hidden
    >
      {src && broken !== src ? (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(src)} />
      ) : (
        <span className={styles["cover-fallback"]}>
          <IconFileOutline18 />
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

export function SavePreview({
  source,
  reference,
  onOpenSave,
  onAttach,
  compact = false,
}: {
  source: AssistantSource;
  reference: number;
  onOpenSave: (id: string) => void;
  onAttach?: (sources: AssistantSource[]) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const scrollFade = useScrollFade<HTMLDivElement>();
  useSourceCovers(open ? [source.id] : []);
  const title = sourceExcerpt(source.title, 200) || "Untitled";
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next, details) => {
        if (details.reason === "trigger-press") {
          details.cancel();
          return;
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger
        openOnHover
        delay={250}
        closeDelay={150}
        className={styles.citation}
        aria-label={`Open source ${reference}: ${title}`}
        onClick={(event) => {
          event.preventDefault();
          setOpen(false);
          onOpenSave(source.id);
        }}
        title={`Open ${title}`}
      >
        <span>{reference}</span>
        {compact ? null : (
          <span className={styles["citation-title"]}>{title}</span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8}>
          <Popover.Popup className={styles.preview} {...scrollFade}>
            <SavePreviewContent
              source={source}
              onOpenSave={(id) => {
                setOpen(false);
                onOpenSave(id);
              }}
              onAttach={
                onAttach
                  ? (sources) => {
                      setOpen(false);
                      onAttach(sources);
                    }
                  : undefined
              }
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SavePreviewContent({
  source,
  onOpenSave,
  onAttach,
  preview = false,
}: {
  source: AssistantSource;
  onOpenSave: (id: string) => void;
  onAttach?: (sources: AssistantSource[]) => void;
  preview?: boolean;
}) {
  const title = sourceExcerpt(source.title, 200) || "Untitled";
  const excerpt = sourceExcerpt(source.notes || source.description, 320);
  return (
    <>
      <div className={styles["preview-heading"]}>
        <Button
          variant="text"
          aria-label={`Open ${title}`}
          onClick={() => onOpenSave(source.id)}
        >
          <SourceThumbnail id={source.id} source={source} />
        </Button>
        <div>
          <small>{sourceDomain(source)}</small>
          {preview ? <h3>{title}</h3> : <Popover.Title>{title}</Popover.Title>}
        </div>
      </div>
      {preview ? (
        <p className={styles.excerpt}>
          {excerpt || "Only the saved title is available."}
        </p>
      ) : (
        <Popover.Description className={styles.excerpt}>
          {excerpt || "Only the saved title is available."}
        </Popover.Description>
      )}
      <div className={styles["preview-actions"]}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpenSave(source.id)}
        >
          Open Save <IconArrowUpRightOutline18 />
        </Button>
        {onAttach ? (
          <Button size="sm" variant="text" onClick={() => onAttach([source])}>
            Add to Message
          </Button>
        ) : null}
      </div>
    </>
  );
}
