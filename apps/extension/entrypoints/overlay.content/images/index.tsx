import { IconArrowsExpandY, IconImages, IconXmark } from "@pond/icons";
import { Button } from "@pond/ui/button";
import { Checkbox } from "@pond/ui/checkbox";
import { Empty } from "@pond/ui/empty";
import { Slider } from "@pond/ui/slider";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LibraryTargets, OverlayResult } from "@/utils/messaging";
import { useEscape } from "../use-escape";
import {
  type Candidate,
  collectCandidates,
  describe,
  facetCounts,
  type ImageFilters,
  matchesFilters,
  type PageImage,
  sizeBucket,
} from "./discover";
import { Sidebar } from "./sidebar";
import styles from "./styles.module.css";

const ZOOM = { min: 96, max: 320, initial: 160 };
const SCROLL_STEPS = 40;
const SCROLL_PAUSE_MS = 250;

const INITIAL_FILTERS: ImageFilters = {
  query: "",
  sizes: new Set(["large", "medium", "small"]),
  hiddenFormats: new Set(),
  hiddenDomains: new Set(),
  minWidth: 0,
  minHeight: 0,
};

function merge(current: Candidate[], found: Candidate[]): Candidate[] {
  const known = new Set(current.map((candidate) => candidate.url));
  return [
    ...current,
    ...found.filter((candidate) => !known.has(candidate.url)),
  ];
}

/** Loads images Pond doesn't know the size of yet, so size filters and tile labels can fill in. */
function useProbedSizes(candidates: Candidate[]) {
  const [sizes, setSizes] = useState<ReadonlyMap<string, [number, number]>>(
    new Map(),
  );
  const probing = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => {
    for (const candidate of candidates) {
      if (candidate.width || probing.current.has(candidate.url)) continue;
      const probe = new Image();
      probe.decoding = "async";
      probe.onload = () =>
        setSizes((current) =>
          new Map(current).set(candidate.url, [
            probe.naturalWidth,
            probe.naturalHeight,
          ]),
        );
      probe.src = candidate.url;
      probing.current.set(candidate.url, probe);
    }
  }, [candidates]);
  useEffect(
    () => () => {
      for (const probe of probing.current.values()) probe.src = "";
    },
    [],
  );
  return sizes;
}

async function scrollThroughPage(): Promise<void> {
  const start = { left: scrollX, top: scrollY };
  for (let step = 0; step < SCROLL_STEPS; step++) {
    const before = scrollY;
    window.scrollBy({ top: innerHeight, behavior: "instant" });
    await new Promise((resolve) => setTimeout(resolve, SCROLL_PAUSE_MS));
    if (scrollY === before) break;
  }
  window.scrollTo({ ...start, behavior: "instant" });
}

interface ImagePickerProps {
  library: LibraryTargets;
  container: HTMLElement;
  onFinish: (result: OverlayResult | null) => void;
}

export function ImagePicker({
  library,
  container,
  onFinish,
}: ImagePickerProps) {
  const id = useId();
  const [candidates, setCandidates] = useState(() =>
    collectCandidates(document),
  );
  const probed = useProbedSizes(candidates);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [zoom, setZoom] = useState(ZOOM.initial);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const shift = useRef(false);
  useEscape(() => onFinish(null));

  useEffect(() => {
    const track = (event: KeyboardEvent | PointerEvent) => {
      shift.current = event.shiftKey;
    };
    for (const type of ["pointerdown", "keydown", "keyup"] as const)
      window.addEventListener(type, track, true);
    return () => {
      for (const type of ["pointerdown", "keydown", "keyup"] as const)
        window.removeEventListener(type, track, true);
    };
  }, []);

  const images: PageImage[] = useMemo(
    () =>
      candidates.map((candidate) => {
        const size = probed.get(candidate.url);
        return describe(
          size ? { ...candidate, width: size[0], height: size[1] } : candidate,
        );
      }),
    [candidates, probed],
  );
  const shown = images.filter((image) => matchesFilters(image, filters));
  const picked = shown.filter((image) => selected.has(image.url));
  const allShown = shown.length > 0 && picked.length === shown.length;

  const sizes = facetCounts(images, selected, (image) =>
    image.width ? sizeBucket(image.width, image.height) : null,
  );
  const formats = facetCounts(images, selected, (image) => image.format);
  const domains = facetCounts(images, selected, (image) => image.domain);

  const setMany = (urls: string[], on: boolean) => {
    const next = new Set(selected);
    for (const url of urls) {
      if (on) next.add(url);
      else next.delete(url);
    }
    setSelected(next);
  };

  /** Shift extends from the last tile you toggled, whether by click or Space. */
  const toggleTile = (index: number, on: boolean) => {
    const range =
      shift.current && anchor !== null
        ? shown.slice(Math.min(anchor, index), Math.max(anchor, index) + 1)
        : shown.slice(index, index + 1);
    setMany(
      range.map((image) => image.url),
      on,
    );
    setAnchor(index);
  };

  const save = () =>
    onFinish({
      kind: "images",
      urls: picked.map((image) => image.url),
      tags,
      folderIds,
    });

  const loadMore = async () => {
    setLoading(true);
    await scrollThroughPage();
    setCandidates((current) => merge(current, collectCandidates(document)));
    setLoading(false);
  };

  return (
    <div className={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className={styles.window}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey))
            return;
          event.preventDefault();
          if (picked.length > 0) save();
        }}
      >
        <header className={styles.header}>
          <h2 id={`${id}-title`} className={styles.title}>
            Save Images
          </h2>
          <span className={styles.meta}>
            {picked.length} of {shown.length} selected
          </span>
          <Slider.Root
            className={styles.zoom}
            aria-label="Thumbnail size"
            min={ZOOM.min}
            max={ZOOM.max}
            value={zoom}
            onValueChange={(value) => {
              const [next] = [value].flat();
              if (next !== undefined) setZoom(next);
            }}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Indicator />
                <Slider.Thumb aria-label="Thumbnail size" />
              </Slider.Track>
            </Slider.Control>
          </Slider.Root>
          <Button
            size="sm"
            variant="ghost"
            loading={loading}
            onClick={() => void loadMore()}
          >
            <IconArrowsExpandY size={12} />
            Load More
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={shown.length === 0}
            onClick={() =>
              setMany(
                shown.map((image) => image.url),
                !allShown,
              )
            }
          >
            {allShown ? "Deselect All" : "Select All"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={shown.length === 0}
            onClick={() => {
              const next = new Set(selected);
              for (const image of shown) {
                if (next.has(image.url)) next.delete(image.url);
                else next.add(image.url);
              }
              setSelected(next);
            }}
          >
            Invert
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

        <div className={styles.body}>
          <Sidebar
            filters={filters}
            onFiltersChange={setFilters}
            sizes={sizes}
            formats={formats}
            domains={domains}
            library={library}
            tags={tags}
            onTagsChange={setTags}
            folderIds={folderIds}
            onFolderIdsChange={setFolderIds}
            container={container}
            count={picked.length}
            onSave={save}
          />

          {shown.length > 0 ? (
            <div
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))`,
              }}
            >
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
                    <span className={styles.frame}>
                      <img
                        className={styles.image}
                        src={image.url}
                        alt=""
                        loading="lazy"
                      />
                      <Checkbox.Root
                        id={checkId}
                        size="sm"
                        className={styles.check}
                        checked={checked}
                        aria-label={image.alt || image.name}
                        onCheckedChange={(next) => toggleTile(index, next)}
                      >
                        <Checkbox.Indicator />
                      </Checkbox.Root>
                    </span>
                    <span className={styles.name}>{image.name}</span>
                    <span className={styles.size}>
                      {image.width
                        ? `${image.width} × ${image.height} · ${image.format}`
                        : image.format}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <Empty.Root className={styles.empty}>
              <Empty.Media>
                <IconImages />
              </Empty.Media>
              <Empty.Title>
                {images.length === 0 ? "No images found" : "No matching images"}
              </Empty.Title>
              <Empty.Description>
                {images.length === 0
                  ? "Load More scrolls the page to find images that load later."
                  : "Turn a filter back on to see more images."}
              </Empty.Description>
            </Empty.Root>
          )}
        </div>
      </div>
    </div>
  );
}
