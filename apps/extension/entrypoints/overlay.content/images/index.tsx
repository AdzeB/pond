import { IconXmark } from "@pond/icons";
import { Button } from "@pond/ui/button";
import { Checkbox } from "@pond/ui/checkbox";
import { useEffect, useId, useRef, useState } from "react";
import { CaptureFields } from "@/components/capture-fields";
import type { Folder, OverlayResult } from "@/utils/messaging";
import { useEscape } from "../use-escape";
import styles from "./styles.module.css";

/** Pond accepts at most 500 items in one capture. */
const MAX_IMAGES = 500;
/** Wordmarks and spacers are wide but short, so both edges count. */
const SMALL_EDGE = 100;

interface PageImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

function pageImages(): PageImage[] {
  const images = new Map<string, PageImage>();
  for (const image of Array.from(document.images)) {
    const url = image.currentSrc || image.src;
    /** Lazy images below the fold haven't decoded yet, so fall back to their laid-out size. */
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width === 0 || !/^https?:/i.test(url)) continue;
    if (images.has(url)) continue;
    images.set(url, { url, width, height, alt: image.alt });
  }
  return [...images.values()];
}

interface ImageCollectorProps {
  folders: Folder[];
  container: HTMLElement;
  onFinish: (result: OverlayResult | null) => void;
}

export function ImageCollector({
  folders,
  container,
  onFinish,
}: ImageCollectorProps) {
  const [images] = useState(pageImages);
  const [hideSmall, setHideSmall] = useState(true);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [tags, setTags] = useState("");
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useEscape(() => onFinish(null));

  useEffect(() => panel.current?.focus(), []);

  const shown = hideSmall
    ? images.filter(
        (image) => image.width >= SMALL_EDGE * 2 && image.height >= SMALL_EDGE,
      )
    : images;
  const allShown = shown.length > 0 && shown.every((i) => selected.has(i.url));
  const over = selected.size > MAX_IMAGES;

  const toggle = (url: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(url);
    else next.delete(url);
    setSelected(next);
  };

  const toggleAll = () => {
    const next = new Set(selected);
    for (const image of shown) {
      if (allShown) next.delete(image.url);
      else next.add(image.url);
    }
    setSelected(next);
  };

  return (
    <div className={styles.backdrop}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className={styles.panel}
      >
        <header className={styles.header}>
          <h2 id={`${id}-title`} className={styles.title}>
            Collect Images
          </h2>
          <span className={styles.meta}>
            {images.length === 1
              ? "1 image on this page"
              : `${images.length} images on this page`}
          </span>
          <label className={styles.option} htmlFor={`${id}-small`}>
            <Checkbox.Root
              id={`${id}-small`}
              size="sm"
              checked={hideSmall}
              onCheckedChange={setHideSmall}
            >
              <Checkbox.Indicator />
            </Checkbox.Root>
            Hide small images
          </label>
          <Button
            size="sm"
            variant="secondary"
            disabled={shown.length === 0}
            onClick={toggleAll}
          >
            {allShown ? "Clear Selection" : "Select All"}
          </Button>
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="Close"
            onClick={() => onFinish(null)}
          >
            <IconXmark size={12} />
          </Button>
        </header>

        {shown.length > 0 ? (
          <div className={styles.grid}>
            {shown.map((image, index) => {
              const checked = selected.has(image.url);
              const checkId = `${id}-${index}`;
              return (
                <label
                  key={image.url}
                  className={styles.tile}
                  htmlFor={checkId}
                  data-checked={checked || undefined}
                >
                  <img
                    className={styles.image}
                    src={image.url}
                    alt=""
                    loading="lazy"
                  />
                  <span className={styles.meta}>
                    <Checkbox.Root
                      id={checkId}
                      size="sm"
                      checked={checked}
                      aria-label={
                        image.alt || `${image.width} by ${image.height} image`
                      }
                      onCheckedChange={(next) => toggle(image.url, next)}
                    >
                      <Checkbox.Indicator />
                    </Checkbox.Root>
                    <span className={styles.size}>
                      {image.width} × {image.height}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>
            {images.length === 0
              ? "No images found on this page."
              : "Every image here is small. Show small images to pick from them."}
          </p>
        )}

        <footer className={styles.footer}>
          <CaptureFields.Root className={styles.fields}>
            <CaptureFields.Tags value={tags} onValueChange={setTags} />
            {folders.length > 0 ? (
              <CaptureFields.Folders
                folders={folders}
                value={folderIds}
                onValueChange={setFolderIds}
                container={container}
              />
            ) : null}
          </CaptureFields.Root>
          <div className={styles.actions}>
            {over ? (
              <span className={styles.meta} role="status">
                Pick up to {MAX_IMAGES} images at a time.
              </span>
            ) : null}
            <Button
              variant="primary"
              disabled={selected.size === 0 || over}
              onClick={() =>
                onFinish({
                  kind: "images",
                  urls: [...selected],
                  tagText: tags,
                  folderIds,
                })
              }
            >
              {selected.size === 1
                ? "Save 1 Image"
                : `Save ${selected.size} Images`}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
