import { Button, Input, Select, Slider } from "@pond/ui";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  type CSSProperties,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { exportFile, openDefaultApp } from "@/features/saves/lib/actions";
import { estimateBpm } from "@/features/saves/lib/media/audio-bpm";
import { downsamplePeaks } from "@/features/saves/lib/media/audio-peaks";
import { storedFileViewerKind } from "@/features/saves/lib/media/file-viewer";
import { buildPondUrl, previewUrlFor } from "@/features/saves/lib/media/url";
import type { Save, SaveFile } from "@/features/saves/types";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { formatBytes } from "@/shared/lib/format";
import { addPdfRenderWindow } from "./pdf-render-window";
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

const SafeWebViewer = lazy(() =>
  import("@/features/saves/components/viewers/safe-web-viewer").then(
    (module) => ({ default: module.SafeWebViewer }),
  ),
);

const DEFAULT_SPECIMEN = "Sphinx of black quartz, judge my vow.";
const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789  !?&@#%()[]{}";

export function StoredFileViewer(props: { save: Save; file: SaveFile }) {
  return (
    <Suspense
      fallback={<div className={styles.previewStatus}>Loading preview</div>}
    >
      <StoredFileContent {...props} />
    </Suspense>
  );
}

function StoredFileContent({ save, file }: { save: Save; file: SaveFile }) {
  const kind = storedFileViewerKind(file);
  const fileIndex = save.files.indexOf(file);
  const url = buildPondUrl(save.id, file);

  if (kind === "pdf")
    return (
      <PdfViewer save={save} file={file} url={url} fileIndex={fileIndex} />
    );
  if (kind === "audio")
    return (
      <AudioViewer save={save} file={file} url={url} fileIndex={fileIndex} />
    );
  if (kind === "font")
    return (
      <FontViewer save={save} file={file} url={url} fileIndex={fileIndex} />
    );
  if (kind === "native-preview")
    return (
      <NativePreviewViewer
        save={save}
        file={file}
        url={url}
        fileIndex={fileIndex}
      />
    );
  if (kind === "model")
    return (
      <ModelFileViewer
        save={save}
        file={file}
        url={url}
        fileIndex={fileIndex}
      />
    );
  if (kind === "epub")
    return (
      <EpubFileViewer save={save} file={file} url={url} fileIndex={fileIndex} />
    );
  if (kind === "archive")
    return (
      <ArchiveViewer save={save} file={file} url={url} fileIndex={fileIndex} />
    );
  if (kind === "safe-web")
    return (
      <SafeWebFileViewer
        save={save}
        file={file}
        url={url}
        fileIndex={fileIndex}
      />
    );
  return <GenericFileViewer save={save} file={file} fileIndex={fileIndex} />;
}

function PdfViewer(props: ViewerProps & { url: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pagesToRender, setPagesToRender] = useState<Set<number>>(new Set());
  const [width, setWidth] = useState(800);
  const [error, setError] = useState(false);

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
    const root = scrollRef.current;
    if (!root) return;
    const update = () => setWidth(Math.max(240, root.clientWidth - 48));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.pdf}>
      <div ref={scrollRef} className={styles.pdfScroll}>
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
                render={pagesToRender.has(pageNumber)}
                scrollRoot={scrollRef.current}
                onNear={schedulePage}
              />
            ))
          : null}
      </div>
      <FileBar {...props} />
    </div>
  );
}

function PdfPage({
  document,
  pageNumber,
  width,
  render,
  scrollRoot,
  onNear,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  width: number;
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
      const base = page.getViewport({ scale: 1 });
      const cssScale = Math.min(2, width / base.width);
      const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: cssScale * pixelRatio });
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
  }, [document, pageNumber, render, width]);

  return (
    <figure
      ref={figureRef}
      className={styles.pdfPage}
      aria-label={`Page ${pageNumber}`}
      style={{
        width,
        minHeight: Math.round((width * 11) / 8.5),
      }}
    >
      {render ? <canvas ref={canvasRef} /> : null}
      <figcaption>{pageNumber}</figcaption>
    </figure>
  );
}

function AudioViewer(props: ViewerProps & { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hoverStartedRef = useRef(false);
  const [bpm, setBpm] = useState<number | null>(props.file.bpm ?? null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

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

  return (
    <div className={styles.root}>
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
        {/* biome-ignore lint/a11y/useMediaCaption: imported audio has no guaranteed transcript track. */}
        <audio
          ref={audioRef}
          preload="metadata"
          src={props.url}
          loop={loop}
          onLoadedMetadata={(event) =>
            setDuration(event.currentTarget.duration || 0)
          }
          onTimeUpdate={(event) =>
            setCurrentTime(event.currentTarget.currentTime)
          }
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        <div className={styles.audioControls}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              if (audio.paused) void audio.play();
              else audio.pause();
            }}
          >
            {playing ? "Pause" : "Play"}
          </Button>
          <Button
            size="sm"
            variant={loop ? "tertiary" : "secondary"}
            aria-pressed={loop}
            onClick={() => setLoop((value) => !value)}
          >
            Loop
          </Button>
          <span className={styles.time}>
            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
          </span>
          <Select.Root
            value={speed}
            onValueChange={(value) => {
              if (value === null) return;
              setSpeed(value);
              if (audioRef.current)
                audioRef.current.playbackRate = Number(value);
            }}
          >
            <Select.Trigger aria-label="Playback Speed">
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
            aria-label="Audio Volume"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? (value[0] ?? 1) : value;
              setVolume(next);
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
        </div>
        <FileActions {...props} />
      </div>
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
  const [mode, setMode] = useState<"specimen" | "waterfall" | "characters">(
    "specimen",
  );
  const [background, setBackground] = useState<"light" | "dark">("light");
  const scrollFade = useScrollFade<HTMLDivElement>();
  const family = useMemo(
    () => `pond-preview-${props.save.id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [props.save.id],
  );

  useEffect(() => {
    let active = true;
    const face = new FontFace(family, `url(${JSON.stringify(props.url)})`);
    void face
      .load()
      .then((font) => {
        if (!active) return;
        document.fonts.add(font);
        setLoaded(true);
      })
      .catch(() => setLoaded(false));
    return () => {
      active = false;
      document.fonts.delete(face);
    };
  }, [family, props.url]);

  const style: CSSProperties & {
    "--preview-font": string;
    "--preview-size": string;
  } = {
    "--preview-font": loaded ? JSON.stringify(family) : "inherit",
    "--preview-size": `${size}px`,
  };

  return (
    <div className={styles.fontRoot} style={style} data-background={background}>
      <ViewerHud.Root>
        <ViewerHud.Cluster anchor="top-left">
          <ViewerHud.Pill className={styles.query}>
            <Input.Root size="sm" variant="secondary" className={styles.field}>
              <Input.Field
                value={specimen}
                aria-label="Font specimen text"
                onChange={(event) => setSpecimen(event.target.value)}
              />
            </Input.Root>
          </ViewerHud.Pill>
        </ViewerHud.Cluster>
        <ViewerHud.Cluster anchor="top-right">
          <ViewerHud.Pill>
            {(["specimen", "waterfall", "characters"] as const).map((value) => (
              <Button
                key={value}
                size="xs"
                variant={mode === value ? "tertiary" : "ghost"}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {value === "specimen"
                  ? "Specimen"
                  : value === "waterfall"
                    ? "Waterfall"
                    : "Characters"}
              </Button>
            ))}
          </ViewerHud.Pill>
          <ViewerHud.Pill>
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                setBackground((value) => (value === "light" ? "dark" : "light"))
              }
            >
              {background === "light" ? "Dark Background" : "Light Background"}
            </Button>
          </ViewerHud.Pill>
          <ViewerHud.Pill className={styles.size} aria-label="Preview size">
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
          </ViewerHud.Pill>
        </ViewerHud.Cluster>
      </ViewerHud.Root>
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
        <dl className={styles.fontMetadata}>
          <div>
            <dt>File</dt>
            <dd>{props.file.path}</dd>
          </div>
          <div>
            <dt>Family</dt>
            <dd>{props.file.family ?? props.save.title ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{formatBytes(props.file.size)}</dd>
          </div>
        </dl>
        <FileBar {...props} />
      </div>
    </div>
  );
}

function GenericFileViewer(props: ViewerProps) {
  return (
    <div className={styles.root}>
      <GenericFileCard {...props} />
    </div>
  );
}

function NativePreviewViewer(props: ViewerProps & { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={styles.root}>
        <GenericFileCard
          {...props}
          message="No preview provider is installed for this format."
        />
      </div>
    );
  }

  return (
    <div className={styles.previewRoot}>
      <div className={styles.previewStage} data-loaded={loaded || undefined}>
        {!loaded ? (
          <div className={styles.previewStatus}>Rendering preview</div>
        ) : null}
        <img
          className={styles.generatedPreview}
          src={previewUrlFor(props.url)}
          alt={props.save.title ?? props.file.path}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </div>
      <FileBar {...props} />
    </div>
  );
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
      />
      <FileBar {...props} />
    </div>
  );
}

function EpubFileViewer(props: ViewerProps & { url: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  if (unavailable) return <NativePreviewViewer {...props} />;
  return (
    <div className={styles.previewRoot}>
      <EpubViewer url={props.url} onUnavailable={onUnavailable} />
      <FileBar {...props} />
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
      />
      <FileBar {...props} />
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
        size={props.file.size}
        onUnavailable={onUnavailable}
      />
      <FileBar {...props} />
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
      <FileActions {...props} />
    </div>
  );
}

interface ViewerProps {
  save: Save;
  file: SaveFile;
  fileIndex: number;
}

function FileActions({ save, fileIndex }: ViewerProps) {
  return (
    <div className={styles.actions}>
      {save.mediaType === "font" ? <FontActivate save={save} /> : null}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void openDefaultApp(save, fileIndex)}
      >
        Open in Default App
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void exportFile(save, fileIndex)}
      >
        Export
      </Button>
    </div>
  );
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
    <Button
      size="sm"
      variant="secondary"
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
      {activated ? "Deactivate Font" : "Activate Font"}
    </Button>
  );
}

function FileBar(props: ViewerProps) {
  return (
    <div className={styles.fileBar}>
      <span>{props.file.path}</span>
      <span>{formatBytes(props.file.size)}</span>
      <FileActions {...props} />
    </div>
  );
}

function FileMark({ file }: { file: SaveFile }) {
  const dot = file.path.lastIndexOf(".");
  const label =
    dot >= 0 ? file.path.slice(dot + 1, dot + 13).toUpperCase() : "FILE";
  return <div className={styles.fileMark}>{label || "FILE"}</div>;
}
