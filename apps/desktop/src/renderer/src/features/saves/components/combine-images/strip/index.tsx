import { IconXmark } from "@pond/icons";
import { Button } from "@pond/ui";
import { useState } from "react";
import { buildPondUrl, thumbUrlFor } from "@/features/saves/lib/media/url";
import type { CombineImage } from "../preview";
import styles from "./styles.module.css";

const THUMB_SIZE = 48;

export function Strip({
  images,
  onReorder,
  onRemove,
}: {
  images: readonly CombineImage[];
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const reset = () => {
    setDragging(null);
    setOver(null);
  };
  return (
    <ol className={styles.strip} aria-label="Image order">
      {images.map(({ save, file }, index) => {
        const title = save.title || "Untitled";
        return (
          <li
            key={save.id}
            className={styles.item}
            draggable
            title={title}
            data-dragging={dragging === index || undefined}
            data-over={(over === index && dragging !== index) || undefined}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              setDragging(index);
            }}
            onDragOver={(event) => {
              if (dragging === null) return;
              event.preventDefault();
              setOver(index);
            }}
            onDrop={(event) => {
              if (dragging === null) return;
              event.preventDefault();
              event.stopPropagation();
              if (dragging !== index) onReorder(dragging, index);
              reset();
            }}
            onDragEnd={reset}
          >
            <img
              className={styles.thumb}
              alt=""
              draggable={false}
              src={thumbUrlFor(buildPondUrl(save.id, file), THUMB_SIZE)}
            />
            <Button
              className={styles.remove}
              icon
              size="xs"
              variant="secondary"
              aria-label={`Remove ${title}`}
              onClick={() => onRemove(save.id)}
            >
              <IconXmark size={12} />
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
