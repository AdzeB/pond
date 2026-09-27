import {
  IconAnimationRepeatOutline18,
  IconArrowLeftOutline18,
  IconArrowRightOutline18,
  IconArrowsExpandOutline18,
  IconCircleInfoOutline18,
  IconDarkLightOutline18,
  IconFullScreenOutline18,
  IconKeyboardOutline18,
  IconMagnifierOutline18,
  IconMediaPauseOutline18,
  IconMediaPlayOutline18,
  IconMinusOutline18,
  IconPlusOutline18,
  IconPrintOutline18,
  IconResizeXOutline18,
  IconRotateImageClockwiseOutline18,
  IconSidebarLeftOutline18,
  IconTextAOutline18,
  IconTypeScaleOutline18,
  IconTypographyOutline18,
  IconVolumeOffOutline18,
  IconVolumeOutline18,
} from "@pond/icons/outline/18";
import { Button, Dialog, Input, Select, Slider } from "@pond/ui";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  type CSSProperties,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GeneratedRasterViewer } from "@/features/saves/components/viewers/generated-raster-viewer";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import {
  ChromePortal,
  ViewerChrome,
} from "@/features/saves/components/viewers/media-viewer/chrome/chrome";
import { OriginalFileActions } from "@/features/saves/components/viewers/original-file-actions";
import { ViewerFallback } from "@/features/saves/components/viewers/viewer-fallback";
import { ViewerResultCount } from "@/features/saves/components/viewers/viewer-result-count";
import {
  type ViewerNavigation,
  ViewerNavigationControls,
  ViewerToolbarGroups,
} from "@/features/saves/components/viewers/viewer-toolbar-groups";
import { estimateBpm } from "@/features/saves/lib/media/audio-bpm";
import { downsamplePeaks } from "@/features/saves/lib/media/audio-peaks";
import {
  type StoredFileViewerKind,
  storedFileViewerKind,
} from "@/features/saves/lib/media/file-viewer";
import { buildPondUrl } from "@/features/saves/lib/media/url";
import type { Save, SaveFile } from "@/features/saves/types";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { formatBytes } from "@/shared/lib/format";
import {
  addPdfRenderWindow,
  pdfPageWidth,
  stepPdfZoom,
} from "./pdf-render-window";
import styles from "./styles.module.css";

const ArchiveFileViewer = lazy(() =>
  import("@/features/saves/components/viewers/archive-file-viewer").then(
    (module) => ({ default: module.ArchiveFileViewer }),
  ),
);

const EpubViewer = lazy(() =>
  import("@/features/saves/components/viewers/epub-viewer").then((module) => ({
    default: module.EpubViewer,
  })),
);

const ModelViewer = lazy(() =>
  import("@/features/saves/components/viewers/model-viewer").then((module) => ({
    default: module.ModelViewer,
  })),
);

const LivePhotoViewer = lazy(() =>
  import("@/features/saves/components/viewers/live-photo-viewer").then(
    (module) => ({ default: module.LivePhotoViewer }),
  ),
);

const SafeWebViewer = lazy(() =>
  import("@/features/saves/components/viewers/safe-web-viewer").then(
    (module) => ({ default: module.SafeWebViewer }),
  ),
);

const TextFileViewer = lazy(() =>
  import("@/features/saves/components/viewers/text-file-viewer").then(
    (module) => ({ default: module.TextFileViewer }),
  ),
);

const DEFAULT_SPECIMEN = "Sphinx of black quartz, judge my vow.";
const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789  !?&@#%()[]{}";
const SYMBOLS =
  "© ® ™ § ¶ † ‡ • … ‰ ′ ″ ‹ › « »\n$ ¢ £ € ¥ ₩ ₹ ₽ ₿\n+ − × ÷ = ≠ ≈ < > ≤ ≥ ± ∞ √ ∑ ∏ ∫ ∂ ∆\n← ↑ → ↓ ↔ ↕ ⇐ ⇑ ⇒ ⇓ ⇔";

const FONT_MODES = [
  { value: "specimen", label: "Specimen", Icon: IconTypographyOutline18 },
  { value: "waterfall", label: "Waterfall", Icon: IconTypeScaleOutline18 },
  { value: "characters", label: "Characters", Icon: IconTextAOutline18 },
  { value: "symbols", label: "Symbols", Icon: IconKeyboardOutline18 },
  { value: "information", label: "Information", Icon: IconCircleInfoOutline18 },
] as const;

type FontMode = (typeof FONT_MODES)[number]["value"];

export function StoredFileViewer({
  save,
  file,
  showControls = true,
}: {
  save: Save;
  file: SaveFile;
  showControls?: boolean;
}) {
  return (
    <ViewerChrome enabled={showControls}>
      <Suspense
        fallback={<div className={styles.previewStatus}>Loading preview</div>}
      >
        <StoredFileContent
          key={`${save.id}:${file.path}:${file.sha256}`}
          save={save}
          file={file}
          fileIndex={save.files.indexOf(file)}
          active
        />
      </Suspense>
    </ViewerChrome>
  );
}

interface StoredFileContentProps {
  save: Save;
  file: SaveFile;
  fileIndex: number;
  url?: string;
  active?: boolean;
  navigation?: ViewerNavigation;
  viewerKind?: StoredFileViewerKind;
}

export function StoredFileContent({
  save,
  file,
  fileIndex,
  url = buildPondUrl(save.id, file),
  active = true,
  navigation,
  viewerKind,
}: StoredFileContentProps) {
  const kind = viewerKind ?? storedFileViewerKind(file);
  const props = { save, file, fileIndex, active, navigation };

  if (kind === "pdf") return <PdfViewer {...props} url={url} />;
  if (kind === "audio") return <AudioViewer {...props} url={url} />;
  if (kind === "font") return <FontViewer {...props} url={url} />;
  if (kind === "text") return <TextFileViewer {...props} url={url} />;
  if (kind === "native-preview")
    return <NativePreviewViewer {...props} url={url} />;
  if (kind === "model") return <ModelFileViewer {...props} url={url} />;
  if (kind === "epub") return <EpubFileViewer {...props} url={url} />;
  if (kind === "live-photo")
    return <LivePhotoFileViewer {...props} url={url} />;
  if (kind === "archive") return <ArchiveViewer {...props} url={url} />;
  if (kind === "safe-web") return <SafeWebFileViewer {...props} url={url} />;
  return <GenericFileViewer {...props} />;
}

function PdfViewer(props: ViewerProps & { url: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRunRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pagesToRender, setPagesToRender] = useState<Set<number>>(new Set());
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [pageAspectRatio, setPageAspectRatio] = useState(8.5 / 11);
  const [fitMode, setFitMode] = useState<"width" | "page" | null>("width");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [thumbnailRoot, setThumbnailRoot] = useState<HTMLElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [searchResultIndex, setSearchResultIndex] = useState(0);
  const [pageEntry, setPageEntry] = useState("1");
  const [error, setError] = useState(false);

  useEffect(() => setPageEntry(String(currentPage)), [currentPage]);

  useEffect(() => {
    let task: PDFDocumentLoadingTask | undefined;
    let active = true;
    setDocument(null);
    setError(false);
    void import("pdfjs-dist")
      .then(async (pdf) => {
        if (!active) return;
        pdf.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        task = pdf.getDocument({ url: props.url });
        const next = await task.promise;
        if (active) {
          setDocument(next);
          setPagesToRender(addPdfRenderWindow(new Set(), 1, next.numPages));
          const firstPage = await next.getPage(1);
          if (active) {
            const firstViewport = firstPage.getViewport({ scale: 1 });
            setPageAspectRatio(firstViewport.width / firstViewport.height);
          }
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      void task?.destroy();
    };
  }, [props.url]);

  const schedulePage = useCallback(
    (pageNumber: number) => {
      if (!document) return;
      setPagesToRender((current) =>
        addPdfRenderWindow(current, pageNumber, document.numPages),
      );
    },
    [document],
  );

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const update = () =>
      setViewport({ width: root.clientWidth, height: root.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      searchRunRef.current += 1;
      if (scrollFrameRef.current !== null)
        cancelAnimationFrame(scrollFrameRef.current);
    },
    [],
  );

  const width = pdfPageWidth({
    containerWidth: viewport.width,
    containerHeight: viewport.height,
    pageAspectRatio:
      rotation % 180 === 0 ? pageAspectRatio : 1 / pageAspectRatio,
    thumbnailsOpen,
    fitMode,
    zoom,
  });

  const goToPage = useCallback(
    (pageNumber: number) => {
      if (!document) return;
      const page = Math.min(document.numPages, Math.max(1, pageNumber));
      setCurrentPage(page);
      setPagesToRender((current) =>
        addPdfRenderWindow(current, page, document.numPages),
      );
      const target = scrollRef.current?.querySelector<HTMLElement>(
        `[data-pdf-page="${page}"]`,
      );
      const reduceMotion = globalThis.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [document],
  );

  const syncCurrentPage = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const root = scrollRef.current;
      if (!root) return;
      const rootTop = root.getBoundingClientRect().top;
      let nearestPage = currentPage;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const page of root.querySelectorAll<HTMLElement>(
        "[data-pdf-page]",
      )) {
        const pageNumber = Number(page.dataset.pdfPage);
        const distance = Math.abs(
          page.getBoundingClientRect().top - rootTop - 24,
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPage = pageNumber;
        }
      }
      if (Number.isFinite(nearestPage)) setCurrentPage(nearestPage);
    });
  }, [currentPage]);

  const runSearch = useCallback(async () => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!document || !query) {
      setSearchResults([]);
      setSearchResultIndex(0);
      return;
    }
    const run = searchRunRef.current + 1;
    searchRunRef.current = run;
    setSearching(true);
    try {
      const matches: number[] = [];
      for (
        let pageNumber = 1;
        pageNumber <= document.numPages;
        pageNumber += 1
      ) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .toLocaleLowerCase();
        if (text.includes(query)) matches.push(pageNumber);
        if (searchRunRef.current !== run) return;
      }
      setSearchResults(matches);
      setSearchResultIndex(0);
      const first = matches[0];
      if (first) goToPage(first);
    } catch {
      if (searchRunRef.current === run) {
        setSearchResults([]);
        setSearchResultIndex(0);
      }
    } finally {
      if (searchRunRef.current === run) setSearching(false);
    }
  }, [document, goToPage, searchQuery]);

  const stepSearchResult = useCallback(
    (direction: -1 | 1) => {
      if (!searchResults.length) return;
      const next =
        (searchResultIndex + direction + searchResults.length) %
        searchResults.length;
      setSearchResultIndex(next);
      const page = searchResults[next];
      if (page) goToPage(page);
    },
    [goToPage, searchResultIndex, searchResults],
  );

  return (
    <div className={styles.pdf}>
      <div ref={bodyRef} className={styles.pdfBody}>
        {document && thumbnailsOpen ? (
          <nav
            ref={setThumbnailRoot}
            className={styles.pdfThumbnails}
            aria-label="Page thumbnails"
          >
            {Array.from(
              { length: document.numPages },
              (_, pageIndex) => pageIndex + 1,
            ).map((pageNumber) => (
              <PdfThumbnail
                key={pageNumber}
                document={document}
                pageNumber={pageNumber}
                rotation={rotation}
                root={thumbnailRoot}
                active={pageNumber === currentPage}
                onSelect={goToPage}
              />
            ))}
          </nav>
        ) : null}
        <div
          ref={scrollRef}
          className={styles.pdfScroll}
          onScroll={syncCurrentPage}
        >
          {!document && !error ? (
            <div className={styles.pdfStatus}>Loading PDF</div>
          ) : null}
          {error ? (
            <div className={styles.pdfStatus}>
              This PDF could not be rendered. You can still open or export it.
            </div>
          ) : null}
          {document
            ? Array.from(
                { length: document.numPages },
                (_, pageIndex) => pageIndex + 1,
              ).map((pageNumber) => (
                <PdfPage
                  key={pageNumber}
                  document={document}
                  pageNumber={pageNumber}
                  width={width}
                  rotation={rotation}
                  render={pagesToRender.has(pageNumber)}
                  scrollRoot={scrollRef.current}
                  onNear={schedulePage}
                />
              ))
            : null}
        </div>
      </div>
      <FileBar {...props} label="PDF">
        <ViewerHud.Tool
          label="Page Thumbnails"
          pressed={thumbnailsOpen}
          disabled={!document}
          onClick={() => setThumbnailsOpen((value) => !value)}
        >
          <IconSidebarLeftOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Search Document"
          pressed={searchOpen}
          disabled={!document}
          onClick={() => setSearchOpen((value) => !value)}
        >
          <IconMagnifierOutline18 />
        </ViewerHud.Tool>
        {searchOpen ? (
          <form
            className={styles.pdfSearch}
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
          >
            <Input.Root size="sm" variant="secondary">
              <Input.Field
                autoFocus
                value={searchQuery}
                aria-label="Search PDF"
                placeholder="Find"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </Input.Root>
            <span className={styles.pdfSearchCount} aria-live="polite">
              {searching
                ? "Searching"
                : searchResults.length
                  ? `${searchResultIndex + 1} / ${searchResults.length}`
                  : searchQuery
                    ? "No results"
                    : ""}
            </span>
            <ViewerHud.Tool
              label="Previous Result"
              disabled={!searchResults.length}
              onClick={() => stepSearchResult(-1)}
            >
              <IconArrowLeftOutline18 />
            </ViewerHud.Tool>
            <ViewerHud.Tool
              label="Next Result"
              disabled={!searchResults.length}
              onClick={() => stepSearchResult(1)}
            >
              <IconArrowRightOutline18 />
            </ViewerHud.Tool>
          </form>
        ) : null}
        <ViewerHud.Tool
          label="Previous Page"
          disabled={!document || currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          <IconArrowLeftOutline18 />
        </ViewerHud.Tool>
        <form
          className={styles.pdfPageEntry}
          onSubmit={(event) => {
            event.preventDefault();
            const next = Number.parseInt(pageEntry, 10);
            if (Number.isFinite(next)) goToPage(next);
          }}
        >
          <Input.Root size="sm" variant="secondary">
            <Input.Field
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Page number"
              value={pageEntry}
              onChange={(event) => setPageEntry(event.target.value)}
              onBlur={() => {
                const next = Number.parseInt(pageEntry, 10);
                if (Number.isFinite(next)) goToPage(next);
                else setPageEntry(String(currentPage));
              }}
            />
          </Input.Root>
          <span aria-hidden>/ {document?.numPages ?? 0}</span>
        </form>
        <ViewerHud.Tool
          label="Next Page"
          disabled={!document || currentPage >= document.numPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          <IconArrowRightOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Zoom Out"
          disabled={!document}
          onClick={() => {
            setFitMode(null);
            setZoom((value) => stepPdfZoom(value, -1));
          }}
        >
          <IconMinusOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Scale>{Math.round(zoom * 100)}%</ViewerHud.Scale>
        <ViewerHud.Tool
          label="Zoom In"
          disabled={!document}
          onClick={() => {
            setFitMode(null);
            setZoom((value) => stepPdfZoom(value, 1));
          }}
        >
          <IconPlusOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Fit Width"
          pressed={fitMode === "width"}
          disabled={!document}
          onClick={() => {
            setFitMode("width");
            setZoom(1);
          }}
        >
          <IconResizeXOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Fit Page"
          pressed={fitMode === "page"}
          disabled={!document}
          onClick={() => {
            setFitMode("page");
            setZoom(1);
          }}
        >
          <IconArrowsExpandOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Rotate Clockwise"
          disabled={!document}
          onClick={() => setRotation((value) => (value + 90) % 360)}
        >
          <IconRotateImageClockwiseOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Print"
          disabled={!document}
          onClick={() => printPdf(props.url)}
        >
          <IconPrintOutline18 />
        </ViewerHud.Tool>
      </FileBar>
    </div>
  );
}

function PdfPage({
  document,
  pageNumber,
  width,
  rotation,
  render,
  scrollRoot,
  onNear,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  rotation: number;
  render: boolean;
  scrollRoot: HTMLDivElement | null;
  onNear: (pageNumber: number) => void;
}) {
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const figure = figureRef.current;
    if (render || !figure || !scrollRoot) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onNear(pageNumber);
      },
      { root: scrollRoot, rootMargin: "100% 0px" },
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, [onNear, pageNumber, render, scrollRoot]);

  useEffect(() => {
    if (!render) return;
    let active = true;
    let renderTask: ReturnType<
      Awaited<ReturnType<typeof document.getPage>>["render"]
    > | null = null;
    void document.getPage(pageNumber).then((page) => {
      if (!active || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1, rotation });
      const cssScale = Math.min(2, width / base.width);
      const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({
        scale: cssScale * pixelRatio,
        rotation,
      });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${Math.round(viewport.width / pixelRatio)}px`;
      canvas.style.height = `${Math.round(viewport.height / pixelRatio)}px`;
      renderTask = page.render({ canvas, canvasContext: context, viewport });
      void renderTask.promise.catch(() => {});
    });
    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, pageNumber, render, rotation, width]);

  return (
    <figure
      ref={figureRef}
      className={styles.pdfPage}
      aria-label={`Page ${pageNumber}`}
      data-pdf-page={pageNumber}
      style={{
        width,
        minHeight: Math.round(
          width * (rotation % 180 === 0 ? 11 / 8.5 : 8.5 / 11),
        ),
      }}
    >
      {render ? <canvas ref={canvasRef} /> : null}
      <figcaption>{pageNumber}</figcaption>
    </figure>
  );
}

function PdfThumbnail({
  document,
  pageNumber,
  rotation,
  root,
  active,
  onSelect,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  rotation: number;
  root: HTMLElement | null;
  active: boolean;
  onSelect: (pageNumber: number) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 3);

  useEffect(() => {
    const button = buttonRef.current;
    if (visible || !button || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { root, rootMargin: "100% 0px" },
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, [root, visible]);

  useEffect(() => {
    if (!visible) return;
    let activeRender = true;
    let renderTask: ReturnType<
      Awaited<ReturnType<typeof document.getPage>>["render"]
    > | null = null;
    void document.getPage(pageNumber).then((page) => {
      if (!activeRender || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1, rotation });
      const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({
        scale: (96 / base.width) * pixelRatio,
        rotation,
      });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = "96px";
      canvas.style.height = `${Math.round(viewport.height / pixelRatio)}px`;
      renderTask = page.render({ canvas, canvasContext: context, viewport });
      void renderTask.promise.catch(() => {});
    });
    return () => {
      activeRender = false;
      renderTask?.cancel();
    };
  }, [document, pageNumber, rotation, visible]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.pdfThumbnail}
      data-active={active || undefined}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(pageNumber)}
    >
      {visible ? <canvas ref={canvasRef} /> : <span aria-hidden />}
      <strong>{pageNumber}</strong>
    </button>
  );
}

function AudioViewer(props: ViewerProps & { url: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hoverStartedRef = useRef(false);
  const [bpm, setBpm] = useState<number | null>(props.file.bpm ?? null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const context = new AudioContext();
    let active = true;
    void fetch(props.url)
      .then((response) => response.arrayBuffer())
      .then((buffer) => context.decodeAudioData(buffer))
      .then((audio) => {
        if (!active) return;
        const samples = audio.getChannelData(0);
        const peaks = downsamplePeaks(samples, 120);
        const canvas = canvasRef.current;
        const gfx = canvas?.getContext("2d");
        if (canvas && gfx) {
          const width = canvas.width;
          const height = canvas.height;
          gfx.clearRect(0, 0, width, height);
          gfx.fillStyle = getComputedStyle(canvas).color;
          const bar = width / peaks.length;
          for (let index = 0; index < peaks.length; index += 1) {
            const magnitude = peaks[index] ?? 0;
            const barHeight = Math.max(1, magnitude * height);
            gfx.fillRect(
              index * bar,
              (height - barHeight) / 2,
              Math.max(1, bar - 1),
              barHeight,
            );
          }
        }
        const tempo = estimateBpm(samples, audio.sampleRate);
        if (tempo) {
          setBpm(tempo);
          void window.pond.query("saves.setAudioAnalysis", {
            id: props.save.id,
            bpm: tempo,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      void context.close();
    };
  }, [props.save.id, props.url]);

  if (failed) {
    return (
      <ViewerFallback
        {...props}
        reason="decode"
        active={props.active}
        slideNavigation={props.navigation}
      />
    );
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.audioCard}>
        <FileMark file={props.file} />
        <div className={styles.heading}>
          <h1>{props.save.title ?? props.file.path}</h1>
          <p>
            {props.file.path} · {formatBytes(props.file.size)}
            {bpm ? ` · ${bpm} BPM` : ""}
          </p>
        </div>
        <canvas
          ref={canvasRef}
          className={styles.waveform}
          width={480}
          height={64}
          aria-label="Waveform"
          onClick={(event) => {
            const audio = audioRef.current;
            if (!audio?.duration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            audio.currentTime =
              ((event.clientX - rect.left) / rect.width) * audio.duration;
          }}
          onMouseEnter={() => {
            const audio = audioRef.current;
            if (audio?.paused) {
              hoverStartedRef.current = true;
              void audio.play();
            }
          }}
          onMouseLeave={() => {
            const audio = audioRef.current;
            if (audio && hoverStartedRef.current) {
              hoverStartedRef.current = false;
              audio.pause();
            }
          }}
        />
        <audio
          ref={audioRef}
          preload="metadata"
          src={props.url}
          loop={loop}
          muted={muted}
          onLoadedMetadata={(event) =>
            setDuration(event.currentTarget.duration || 0)
          }
          onTimeUpdate={(event) =>
            setCurrentTime(event.currentTarget.currentTime)
          }
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setFailed(true)}
        />
      </div>
      <FileBar {...props} />
      <ChromePortal slot="bottom">
        <ViewerHud.Tools
          tooltipSide="top"
          className={styles.audioTransport}
          role="toolbar"
          aria-label="Audio playback"
        >
          <ViewerHud.Tool
            label={playing ? "Pause" : "Play"}
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              if (audio.paused) void audio.play();
              else audio.pause();
            }}
          >
            {playing ? <IconMediaPauseOutline18 /> : <IconMediaPlayOutline18 />}
          </ViewerHud.Tool>
          <ViewerHud.Tool
            label={muted || volume === 0 ? "Unmute" : "Mute"}
            onClick={() => setMuted((value) => !value)}
          >
            {muted || volume === 0 ? (
              <IconVolumeOffOutline18 />
            ) : (
              <IconVolumeOutline18 />
            )}
          </ViewerHud.Tool>
          <ViewerHud.Scale>
            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
          </ViewerHud.Scale>
          <Slider.Root
            className={styles.audioProgress}
            aria-label="Audio Position"
            min={0}
            max={Math.max(duration, 0.01)}
            step={0.01}
            value={currentTime}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? (value[0] ?? 0) : value;
              setCurrentTime(next);
              if (audioRef.current) audioRef.current.currentTime = next;
            }}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Indicator />
                <Slider.Thumb />
              </Slider.Track>
            </Slider.Control>
          </Slider.Root>
          <Select.Root
            value={speed}
            onValueChange={(value) => {
              if (value === null) return;
              setSpeed(value);
              if (audioRef.current)
                audioRef.current.playbackRate = Number(value);
            }}
          >
            <Select.Trigger
              size="xs"
              variant="ghost"
              aria-label="Playback Speed"
            >
              <Select.Value>{(value: string) => `${value}×`}</Select.Value>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner sideOffset={6}>
                <Select.Popup>
                  <Select.Items
                    items={["0.5", "0.75", "1", "1.25", "1.5", "2"].map(
                      (value) => ({ value, label: `${value}×` }),
                    )}
                  />
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
          <Slider.Root
            className={styles.audioVolume}
            aria-label="Audio Volume"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? (value[0] ?? 1) : value;
              setVolume(next);
              setMuted(false);
              if (audioRef.current) audioRef.current.volume = next;
            }}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Indicator />
                <Slider.Thumb />
              </Slider.Track>
            </Slider.Control>
          </Slider.Root>
          <ViewerHud.Tool
            label="Loop"
            pressed={loop}
            onClick={() => setLoop((value) => !value)}
          >
            <IconAnimationRepeatOutline18 />
          </ViewerHud.Tool>
          <ViewerHud.Tool
            label="Full Screen"
            onClick={() => {
              const root = rootRef.current;
              if (!root) return;
              if (document.fullscreenElement) void document.exitFullscreen();
              else void root.requestFullscreen();
            }}
          >
            <IconFullScreenOutline18 />
          </ViewerHud.Tool>
        </ViewerHud.Tools>
      </ChromePortal>
    </div>
  );
}

function formatAudioTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function FontViewer(props: ViewerProps & { url: string }) {
  const [specimen, setSpecimen] = useState(DEFAULT_SPECIMEN);
  const [size, setSize] = useState(68);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<FontMode>("specimen");
  const [background, setBackground] = useState<"light" | "dark">("light");
  const scrollFade = useScrollFade<HTMLDivElement>();
  const family = useMemo(
    () => `pond-preview-${props.save.id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [props.save.id],
  );

  useEffect(() => {
    let active = true;
    setFailed(false);
    const face = new FontFace(family, `url(${JSON.stringify(props.url)})`);
    void face
      .load()
      .then((font) => {
        if (!active) return;
        document.fonts.add(font);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(false);
        setFailed(true);
      });
    return () => {
      active = false;
      document.fonts.delete(face);
    };
  }, [family, props.url]);

  if (failed) {
    return (
      <ViewerFallback
        {...props}
        reason="decode"
        active={props.active}
        slideNavigation={props.navigation}
      />
    );
  }

  const style: CSSProperties & {
    "--preview-font": string;
    "--preview-size": string;
  } = {
    "--preview-font": loaded ? JSON.stringify(family) : "inherit",
    "--preview-size": `${size}px`,
  };

  return (
    <div className={styles.fontRoot} style={style} data-background={background}>
      <ChromePortal slot="top">
        <ViewerHud.Bar
          label="Font"
          start={<ViewerResultCount saveId={props.save.id} />}
          center={
            <>
              <Input.Root
                size="sm"
                variant="secondary"
                className={styles.field}
              >
                <Input.Field
                  value={specimen}
                  aria-label="Font specimen text"
                  onChange={(event) => setSpecimen(event.target.value)}
                />
              </Input.Root>
              <div className={styles.size}>
                <ViewerHud.Scale>{size}px</ViewerHud.Scale>
                <Slider.Root
                  min={24}
                  max={144}
                  step={1}
                  value={size}
                  onValueChange={(next) => {
                    const value = Array.isArray(next) ? (next[0] ?? 68) : next;
                    setSize(value);
                  }}
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Indicator />
                      <Slider.Thumb aria-label="Font preview size" />
                    </Slider.Track>
                  </Slider.Control>
                </Slider.Root>
              </div>
            </>
          }
          end={
            <ViewerToolbarGroups
              actions={<FileActions {...props} />}
              view={
                <>
                  {FONT_MODES.map(({ value, label, Icon }) => (
                    <ViewerHud.Tool
                      key={value}
                      label={label}
                      pressed={mode === value}
                      onClick={() => setMode(value)}
                    >
                      <Icon />
                    </ViewerHud.Tool>
                  ))}
                  <ViewerHud.Tool
                    label={
                      background === "light"
                        ? "Use Dark Background"
                        : "Use Light Background"
                    }
                    onClick={() =>
                      setBackground((value) =>
                        value === "light" ? "dark" : "light",
                      )
                    }
                  >
                    <IconDarkLightOutline18 />
                  </ViewerHud.Tool>
                </>
              }
              navigation={navigationControls(props.navigation)}
            />
          }
        />
      </ChromePortal>
      <div className={styles.scroll} {...scrollFade}>
        {mode === "specimen" ? (
          <div className={styles.specimen}>{specimen || DEFAULT_SPECIMEN}</div>
        ) : null}
        {mode === "waterfall" ? (
          <div className={styles.waterfall}>
            {[18, 24, 32, 48, 64, 96, 128].map((previewSize) => (
              <div key={previewSize} style={{ fontSize: previewSize }}>
                <span>{previewSize}</span>
                {specimen || DEFAULT_SPECIMEN}
              </div>
            ))}
          </div>
        ) : null}
        {mode === "characters" ? (
          <pre className={styles.glyphs}>{GLYPHS}</pre>
        ) : null}
        {mode === "symbols" ? (
          <pre className={styles.glyphs}>{SYMBOLS}</pre>
        ) : null}
        {mode === "information" ? (
          <>
            <dl className={styles.fontMetadata}>
              <div>
                <dt>File</dt>
                <dd>{props.file.path}</dd>
              </div>
              <div>
                <dt>Family</dt>
                <dd>{props.file.family ?? props.save.title ?? "Unknown"}</dd>
              </div>
              {props.file.subfamily ? (
                <div>
                  <dt>Style</dt>
                  <dd>{props.file.subfamily}</dd>
                </div>
              ) : null}
              {props.file.fontWeight ? (
                <div>
                  <dt>Weight</dt>
                  <dd>{props.file.fontWeight}</dd>
                </div>
              ) : null}
              <div>
                <dt>Size</dt>
                <dd>{formatBytes(props.file.size)}</dd>
              </div>
            </dl>
            <div className={styles.fontInfoActions}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  Dialog.prompt({
                    title: "Rename Font",
                    initialValue: props.save.title ?? props.file.family ?? "",
                    confirmLabel: "Rename",
                    onConfirm: async (name) => {
                      if (!name.trim()) throw new Error("Enter a name.");
                      const result = await window.pond.query(
                        "saves.batchRename",
                        {
                          ids: [props.save.id],
                          pattern: name.trim(),
                        },
                      );
                      if (!result.ok)
                        throw new Error("Could not rename this font.");
                    },
                  })
                }
              >
                Rename Font
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function GenericFileViewer({
  message,
  ...props
}: ViewerProps & { message?: string }) {
  return (
    <div className={styles.root}>
      <GenericFileCard {...props} message={message} />
      <FileBar {...props} />
    </div>
  );
}

function NativePreviewViewer(props: ViewerProps & { url: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <ViewerFallback
        {...props}
        reason="preview"
        active={props.active}
        slideNavigation={props.navigation}
      />
    );
  }

  return (
    <div className={styles.previewRoot}>
      <GeneratedRasterViewer
        save={props.save}
        fileIndex={props.fileIndex}
        url={props.url}
        active={props.active ?? true}
        slideNavigation={props.navigation}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function printPdf(url: string): void {
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.src = url;
  frame.title = "Print PDF";
  frame.addEventListener(
    "load",
    () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 1_000);
    },
    { once: true },
  );
  document.body.append(frame);
}

function ModelFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <ModelViewer
        url={props.url}
        path={props.file.path}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileToolbarEnd {...props} />}
      />
    </div>
  );
}

function EpubFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <EpubViewer
        url={props.url}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileActions {...props} />}
        toolbarNavigation={navigationControls(props.navigation)}
      />
    </div>
  );
}

function ArchiveViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <ArchiveFileViewer
        url={props.url}
        path={props.file.path}
        size={props.file.size}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileToolbarEnd {...props} />}
      />
    </div>
  );
}

function LivePhotoFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <LivePhotoViewer
        url={props.url}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileToolbarEnd {...props} />}
      />
    </div>
  );
}

function SafeWebFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <SafeWebViewer
        url={props.url}
        path={props.file.path}
        size={props.file.size}
        onUnavailable={onUnavailable}
        toolbarStart={<ViewerResultCount saveId={props.save.id} />}
        toolbarEnd={<FileToolbarEnd {...props} />}
      />
    </div>
  );
}

function GenericFileCard({
  message,
  ...props
}: ViewerProps & { message?: string }) {
  return (
    <div className={styles.fileCard}>
      <FileMark file={props.file} />
      <div className={styles.heading}>
        <h1>{props.save.title ?? props.file.path}</h1>
        <p>{props.file.path}</p>
        <p>
          {props.file.mimeType || "File"} · {formatBytes(props.file.size)}
        </p>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}

interface ViewerProps {
  save: Save;
  file: SaveFile;
  fileIndex: number;
  active?: boolean;
  navigation?: ViewerNavigation;
}

function FontActivate({ save }: { save: Save }) {
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    let active = true;
    void window.pond
      .query("saves.fontStatus", { id: save.id })
      .then((status) => {
        if (active) setActivated(status.activated);
      });
    return () => {
      active = false;
    };
  }, [save.id]);

  return (
    <ViewerHud.Tool
      label={activated ? "Deactivate Font" : "Activate Font"}
      pressed={activated}
      onClick={() => {
        void window.pond
          .query(activated ? "saves.deactivateFont" : "saves.activateFont", {
            id: save.id,
          })
          .then((result) => {
            if (result.ok) setActivated(!activated);
          });
      }}
    >
      <IconTypographyOutline18 />
    </ViewerHud.Tool>
  );
}

function FileBar({
  children,
  label = "File viewer",
  ...props
}: ViewerProps & { children?: ReactNode; label?: string }) {
  return (
    <ChromePortal slot="top">
      <ViewerHud.Bar
        label={label}
        start={<ViewerResultCount saveId={props.save.id} />}
        end={
          <ViewerToolbarGroups
            actions={<FileActions {...props} />}
            view={children}
            navigation={navigationControls(props.navigation)}
          />
        }
      />
    </ChromePortal>
  );
}

function FileToolbarEnd(props: ViewerProps) {
  return (
    <ViewerToolbarGroups
      actions={<FileActions {...props} />}
      navigation={navigationControls(props.navigation)}
    />
  );
}

function navigationControls(navigation?: ViewerNavigation): ReactNode {
  return navigation && navigation.count > 1 ? (
    <ViewerNavigationControls navigation={navigation} />
  ) : null;
}

function FileActions(props: ViewerProps) {
  return (
    <>
      {props.save.mediaType === "font" ? (
        <FontActivate save={props.save} />
      ) : null}
      <OriginalFileActions save={props.save} fileIndex={props.fileIndex} />
    </>
  );
}

function FileMark({ file }: { file: SaveFile }) {
  const dot = file.path.lastIndexOf(".");
  const label =
    dot >= 0 ? file.path.slice(dot + 1, dot + 13).toUpperCase() : "FILE";
  return <div className={styles.fileMark}>{label || "FILE"}</div>;
}
