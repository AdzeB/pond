import { Button } from "@pond/ui";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArchiveFileViewer } from "@/components/save/archive-file-viewer";
import { EpubViewer } from "@/components/save/epub-viewer";
import { ModelViewer } from "@/components/save/model-viewer";
import { SafeWebViewer } from "@/components/save/safe-web-viewer";
import { storedFileViewerKind } from "@/lib/media/file-viewer";
import { buildPondUrl, previewUrlFor } from "@/lib/media/url";
import { exportFile, openDefaultApp } from "@/lib/save/actions";
import type { Save, SaveFile } from "@/lib/types";
import { formatBytes } from "@/lib/util/format";
import styles from "./styles.module.css";

const DEFAULT_SPECIMEN = "Sphinx of black quartz, judge my vow.";
const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789  !?&@#%()[]{}";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function StoredFileViewer({
  save,
  file,
}: {
  save: Save;
  file: SaveFile;
}) {
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
  const [width, setWidth] = useState(800);
  const [error, setError] = useState(false);

  useEffect(() => {
    const task = getDocument({ url: props.url });
    let active = true;
    setDocument(null);
    setError(false);
    void task.promise
      .then((next) => {
        if (active) setDocument(next);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [props.url]);

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
          <div className={styles.pdfStatus}>Loading PDF…</div>
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
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  width: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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
  }, [document, pageNumber, width]);

  return (
    <figure className={styles.pdfPage} aria-label={`Page ${pageNumber}`}>
      <canvas ref={canvasRef} />
      <figcaption>{pageNumber}</figcaption>
    </figure>
  );
}

function AudioViewer(props: ViewerProps & { url: string }) {
  return (
    <div className={styles.root}>
      <div className={styles.audioCard}>
        <FileMark file={props.file} />
        <div className={styles.heading}>
          <h1>{props.save.title ?? props.file.path}</h1>
          <p>
            {props.file.path} · {formatBytes(props.file.size)}
          </p>
        </div>
        {/* biome-ignore lint/a11y/useMediaCaption: imported audio has no guaranteed transcript track. */}
        <audio controls preload="metadata" src={props.url} />
        <FileActions {...props} />
      </div>
    </div>
  );
}

function FontViewer(props: ViewerProps & { url: string }) {
  const [specimen, setSpecimen] = useState(DEFAULT_SPECIMEN);
  const [size, setSize] = useState(68);
  const [loaded, setLoaded] = useState(false);
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

  const style = {
    "--pond-preview-font": loaded ? JSON.stringify(family) : "inherit",
    "--pond-preview-size": `${size}px`,
  } as CSSProperties;

  return (
    <div className={styles.fontRoot} style={style}>
      <div className={styles.fontToolbar}>
        <input
          value={specimen}
          aria-label="Font specimen text"
          onChange={(event) => setSpecimen(event.target.value)}
        />
        <label>
          <span>{size}px</span>
          <input
            type="range"
            min="24"
            max="144"
            value={size}
            aria-label="Font preview size"
            onChange={(event) => setSize(Number(event.target.value))}
          />
        </label>
      </div>
      <div className={styles.specimen}>{specimen || DEFAULT_SPECIMEN}</div>
      <pre className={styles.glyphs}>{GLYPHS}</pre>
      <FileBar {...props} />
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
          <div className={styles.previewStatus}>Rendering preview…</div>
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
