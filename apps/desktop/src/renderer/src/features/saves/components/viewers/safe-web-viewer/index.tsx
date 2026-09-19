import { useEffect, useMemo, useState } from "react";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
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
  const scrollFade = useScrollFade<HTMLPreElement>();

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
      <ViewerHud.Root>
        <ViewerHud.Cluster anchor="top-left">
          <ViewerHud.Pill role="toolbar" aria-label="Preview">
            <ViewerHud.Tool
              icon={false}
              label="Rendered"
              pressed={mode === "rendered"}
              onClick={() => setMode("rendered")}
            >
              Rendered
            </ViewerHud.Tool>
            <ViewerHud.Tool
              icon={false}
              label="Source"
              pressed={mode === "source"}
              onClick={() => setMode("source")}
            >
              Source
            </ViewerHud.Tool>
          </ViewerHud.Pill>
        </ViewerHud.Cluster>
        <ViewerHud.Cluster anchor="top-right">
          <ViewerHud.Pill className={styles.hint}>
            <span>
              Scripts, forms, embeds, and network requests are disabled.
            </span>
          </ViewerHud.Pill>
        </ViewerHud.Cluster>
      </ViewerHud.Root>
      {source === null ? (
        <div className={styles.status}>Reading page</div>
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
        <pre className={styles.source} {...scrollFade}>
          {source}
        </pre>
      ) : null}
    </div>
  );
}
