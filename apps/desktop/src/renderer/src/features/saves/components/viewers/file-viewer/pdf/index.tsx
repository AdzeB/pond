import {
  IconArrowLeftOutline18,
  IconArrowRightOutline18,
  IconArrowsExpandOutline18,
  IconMagnifierOutline18,
  IconMinusOutline18,
  IconPlusOutline18,
  IconPrintOutline18,
  IconResizeXOutline18,
  IconRotateImageClockwiseOutline18,
  IconSidebarLeftOutline18,
} from "@pond/icons/outline/18";
import { Input } from "@pond/ui";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useCallback, useEffect, useRef, useState } from "react";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { FileBar } from "..";
import {
  addPdfRenderWindow,
  pdfPageWidth,
  stepPdfZoom,
} from "../pdf-render-window";
import type { ViewerProps } from "../types";
import styles from "./styles.module.css";

export function PdfViewer(props: ViewerProps & { url: string }) {
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
