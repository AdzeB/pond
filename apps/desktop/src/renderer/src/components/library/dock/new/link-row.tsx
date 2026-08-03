import { IconXmarkOutline12 as Remove } from "@pond/icons/outline/12";
import { IconLink2Outline18 as Link } from "@pond/icons/outline/18";
import { useEffect, useState } from "react";
import { getSourceLogo } from "@/lib/save/sources-registry";
import styles from "./link-row.module.css";

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://");
}

/** Classification is cheap pattern matching in the main process, debounced for typing. */
function useUrlSource(candidate: string): string | null {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    if (!looksLikeUrl(candidate)) {
      setSource(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void window.pond
        .query("saves.classifyUrl", { url: candidate })
        .then((res) => {
          if (cancelled) return;
          setSource((res as { source?: string | null })?.source ?? null);
        })
        .catch(() => {});
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidate]);
  return source;
}

export function SourceGlyph({ url }: { url: string }) {
  const source = useUrlSource(url);
  const logo = source ? getSourceLogo(source) : null;
  return (
    /** The glyph remounts when the URL classifies to a source, so the brand mark pops in. */
    <span
      key={source ?? "link"}
      className={`${styles["lead-icon"]} ${styles.glyph}`}
      aria-hidden
    >
      {logo ? (
        <img src={logo} alt="" width={16} height={16} />
      ) : (
        <Link width={16} height={16} />
      )}
    </span>
  );
}

export function LinkRow({
  url,
  onRemove,
}: {
  url: string;
  onRemove: () => void;
}) {
  return (
    <div className={styles.link}>
      <SourceGlyph url={url} />
      <span className={styles["link-text"]}>
        {url.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        aria-label={`Remove ${url}`}
        className={styles["link-remove"]}
        onClick={onRemove}
      >
        <Remove strokeWidth={2} />
      </button>
    </div>
  );
}
