import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ArchiveManifest,
  archiveUrlKey,
  buildArchiveViewerUrl,
  loadArchiveManifest,
} from "@/features/saves/lib/media/archive";
import type { Save } from "@/features/saves/types";
import type { PondWebviewElement } from "@/shared/types/electron-webview";
import styles from "./archive-viewer.module.css";

export function SaveArchiveViewer({ save }: { save: Save }) {
  const [manifest, setManifest] = useState<ArchiveManifest | null>(null);
  useEffect(() => {
    let alive = true;
    void loadArchiveManifest(save).then((m) => {
      if (alive) setManifest(m);
    });
    return () => {
      alive = false;
    };
  }, [save]);

  if (!manifest || manifest.pages.length === 0) return null;
  return <ArchiveFrame key={save.id} save={save} manifest={manifest} />;
}

function ArchiveFrame({
  save,
  manifest,
}: {
  save: Save;
  manifest: ArchiveManifest;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const guestIdRef = useRef<number | null>(null);
  const webviewRef = useRef<PondWebviewElement | null>(null);

  const pageIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    manifest.pages.forEach((page, i) => {
      const key = archiveUrlKey(page.url);
      if (!map.has(key)) map.set(key, i);
    });
    return map;
  }, [manifest]);

  const page = manifest.pages[pageIndex] ?? manifest.pages[0];
  const src = page ? buildArchiveViewerUrl(save, page.url, manifest) : null;

  const attachWebview = useCallback((el: PondWebviewElement | null) => {
    webviewRef.current = el;
    if (!el) {
      guestIdRef.current = null;
      return;
    }
    el.addEventListener("dom-ready", () => {
      try {
        guestIdRef.current = el.getWebContentsId();
      } catch {
        guestIdRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    return window.pond.onArchiveNavigate(({ guestId, url }) => {
      if (guestId == null || guestId !== guestIdRef.current) return;
      const index = pageIndexByKey.get(archiveUrlKey(url));
      if (index != null) {
        setPageIndex(index);
      } else {
        void window.pond.openExternal(url);
      }
    });
  }, [pageIndexByKey]);

  if (!page || !src) return null;

  return (
    <div className={styles.root}>
      <div className={styles.frame}>
        <webview ref={attachWebview} src={src} className={styles.webview} />
      </div>
    </div>
  );
}
