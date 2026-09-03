import { useEffect, useMemo, useState } from "react";
import { sanitizeOfflineHtml } from "./sanitize";
import styles from "./styles.module.css";

interface SafeWebViewerProps {
  url: string;
  size: number;
  onUnavailable: () => void;
}

const MAX_HTML_BYTES = 10 * 1024 ** 2;

export function SafeWebViewer({
  url,
  size,
  onUnavailable,
}: SafeWebViewerProps) {
  const [source, setSource] = useState<string | null>(null);
  const [mode, setMode] = useState<"rendered" | "source">("rendered");

  useEffect(() => {
    if (size > MAX_HTML_BYTES) {
      onUnavailable();
      return;
    }
    let alive = true;
    void fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        if (alive) setSource(text);
      })
      .catch(() => {
        if (alive) onUnavailable();
      });
    return () => {
      alive = false;
    };
  }, [onUnavailable, size, url]);

  const safeHtml = useMemo(
    () => (source === null ? "" : sanitizeOfflineHtml(source)),
    [source],
  );

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button
          type="button"
          aria-pressed={mode === "rendered"}
          onClick={() => setMode("rendered")}
        >
          Rendered
        </button>
        <button
          type="button"
          aria-pressed={mode === "source"}
          onClick={() => setMode("source")}
        >
          Source
        </button>
        <span>Scripts, forms, embeds, and network requests are disabled.</span>
      </div>
      {source === null ? (
        <div className={styles.status}>Reading page…</div>
      ) : null}
      {source !== null && mode === "rendered" ? (
        <iframe
          className={styles.frame}
          title="Offline HTML preview"
          sandbox=""
          srcDoc={safeHtml}
        />
      ) : null}
      {source !== null && mode === "source" ? (
        <pre className={styles.source}>{source}</pre>
      ) : null}
    </div>
  );
}
