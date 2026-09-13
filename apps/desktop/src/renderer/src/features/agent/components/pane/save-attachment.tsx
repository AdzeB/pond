import { IconFileOutline18, IconXmarkOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import type { AssistantSource } from "@shared/assistant";
import { useState } from "react";
import { useSave } from "@/features/saves/hooks/use-saves";
import { pickCardUnit } from "@/features/saves/lib/media/units";
import { thumbUrlFor } from "@/features/saves/lib/media/url";
import styles from "./save-attachment.module.css";

export function SaveAttachment({
  source,
  onOpen,
  onRemove,
}: {
  source: AssistantSource;
  onOpen: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const save = useSave(source.id);
  const [failed, setFailed] = useState<string | null>(null);
  const visual = save?.mediaType === "image" || save?.mediaType === "video";
  const unit = save && visual ? pickCardUnit(save) : null;
  const candidate = unit?.isVideo ? unit.posterUrl : unit?.url;
  const src = candidate?.startsWith("pond://")
    ? thumbUrlFor(candidate, 240)
    : undefined;
  const image = src && src !== failed ? src : undefined;
  const title = source.title || "Untitled";
  return (
    <span className={styles.attachment} data-image={Boolean(image)}>
      <button
        type="button"
        className={styles.open}
        aria-label={`Open ${title}`}
        title={title}
        onClick={() => onOpen(source.id)}
      >
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            onError={() => setFailed(image)}
          />
        ) : (
          <IconFileOutline18 />
        )}
        <span>{title}</span>
      </button>
      {onRemove ? (
        <Button
          type="button"
          icon
          size="xs"
          variant="secondary"
          className={styles.remove}
          aria-label={`Remove ${title}`}
          onClick={() => onRemove(source.id)}
        >
          <IconXmarkOutline18 />
        </Button>
      ) : null}
    </span>
  );
}
