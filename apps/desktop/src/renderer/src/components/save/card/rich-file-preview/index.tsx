import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { RichFilePreviewKind } from "@/lib/media/rich-file-preview";
import type { SaveFile } from "@/lib/types";
import styles from "./styles.module.css";

const ModelCardPreview = lazy(async () => {
  const module = await import("./model-preview");
  return { default: module.ModelCardPreview };
});

interface RichFilePreviewProps {
  kind: RichFilePreviewKind;
  saveId: string;
  title: string | null;
  file: SaveFile;
  url: string;
}

export function RichFilePreview(props: RichFilePreviewProps) {
  switch (props.kind) {
    case "model":
      return (
        <Suspense fallback={<PreviewStatus label="Loading model…" />}>
          <ModelCardPreview url={props.url} path={props.file.path} />
        </Suspense>
      );
    case "epub":
      return <EpubCardPreview url={props.url} title={props.title} />;
    case "font":
      return <FontCardPreview url={props.url} saveId={props.saveId} />;
    case "archive":
      return <ArchiveCardPreview />;
  }
}

function PreviewStatus({ label }: { label: string }) {
  return (
    <div className={styles.status}>
      <span>{label}</span>
    </div>
  );
}

const epubCache = new Map<
  string,
  Promise<{ bytes: Uint8Array; mimeType: string } | null>
>();

function loadEpubCover(url: string) {
  const existing = epubCache.get(url);
  if (existing) return existing;
  const request = Promise.all([
    fetch(url).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    }),
    import("./epub-cover"),
  ])
    .then(([buffer, module]) => module.extractEpubCover(buffer))
    .catch(() => null);
  epubCache.set(url, request);
  return request;
}

function EpubCardPreview({
  url,
  title,
}: {
  url: string;
  title: string | null;
}) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    void loadEpubCover(url).then((cover) => {
      if (!alive || !cover) return;
      const bytes = cover.bytes.slice().buffer as ArrayBuffer;
      objectUrl = URL.createObjectURL(
        new Blob([bytes], { type: cover.mimeType }),
      );
      setCoverUrl(objectUrl);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return (
    <div className={styles.epub} data-loaded={loaded || undefined}>
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setCoverUrl(null)}
        />
      ) : null}
      {!loaded ? (
        <div className={styles.bookFallback}>
          <span>EPUB</span>
          <strong>{title || "eBook"}</strong>
          <i />
        </div>
      ) : null}
    </div>
  );
}

function FontCardPreview({ url, saveId }: { url: string; saveId: string }) {
  const family = useMemo(
    () => `pond-card-${saveId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [saveId],
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const face = new FontFace(family, `url(${JSON.stringify(url)})`);
    void face
      .load()
      .then((font) => {
        if (!alive) return;
        document.fonts.add(font);
        setLoaded(true);
      })
      .catch(() => setLoaded(false));
    return () => {
      alive = false;
      document.fonts.delete(face);
    };
  }, [family, url]);

  const style = {
    "--pond-card-font": loaded ? JSON.stringify(family) : "inherit",
  } as React.CSSProperties;
  return (
    <div
      className={styles.font}
      style={style}
      data-loaded={loaded || undefined}
    >
      <span>ABCDEFG</span>
      <span>abcdefg</span>
      <span>0123456</span>
    </div>
  );
}

function ArchiveCardPreview() {
  return (
    <div className={styles.archive}>
      <svg className={styles.archiveIcon} viewBox="0 0 64 80" aria-hidden>
        <title>Archive</title>
        <path className={styles.archivePage} d="M9 2h29l17 17v56H9z" />
        <path className={styles.archiveFold} d="M38 2v17h17" />
        <path
          className={styles.archiveZip}
          d="M29 7h7v6h-7zm7 6h7v6h-7zm-7 6h7v6h-7zm7 6h7v6h-7zm-7 6h7v6h-7zm7 6h7v6h-7z"
        />
        <path className={styles.archivePull} d="M31 43h10v12H31z" />
      </svg>
    </div>
  );
}
