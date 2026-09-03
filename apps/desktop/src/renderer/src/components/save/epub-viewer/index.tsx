import type { Book, NavItem, Rendition } from "epubjs";
import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

interface EpubViewerProps {
  url: string;
  onUnavailable: () => void;
}

function flattenNavigation(
  items: NavItem[],
  depth = 0,
): Array<NavItem & { depth: number }> {
  return items.flatMap((item) => [
    { ...item, depth },
    ...flattenNavigation(item.subitems ?? [], depth + 1),
  ]);
}

export function EpubViewer({ url, onUnavailable }: EpubViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [toc, setToc] = useState<Array<NavItem & { depth: number }>>([]);
  const [fontSize, setFontSize] = useState(100);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let alive = true;
    let book: Book | null = null;
    let rendition: Rendition | null = null;

    void Promise.all([
      fetch(url).then((response) => response.arrayBuffer()),
      import("epubjs"),
    ])
      .then(async ([buffer, module]) => {
        if (!alive) return;
        book = module.default();
        await book.open(buffer, "binary");
        if (!alive || !book) return;
        rendition = book.renderTo(root, {
          width: "100%",
          height: "100%",
          flow: "scrolled-doc",
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;
        rendition.themes.default({
          body: {
            "font-family": "ui-serif, Georgia, serif !important",
            color: "#202124 !important",
            background: "#f7f3e9 !important",
            padding: "24px !important",
          },
          img: { "max-width": "100% !important" },
        });
        const navigation = await book.loaded.navigation;
        if (alive) setToc(flattenNavigation(navigation.toc));
        await rendition.display();
        if (alive) setReady(true);
      })
      .catch(() => {
        if (alive) onUnavailable();
      });

    return () => {
      alive = false;
      renditionRef.current = null;
      rendition?.destroy();
      book?.destroy();
      root.replaceChildren();
    };
  }, [onUnavailable, url]);

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSize}%`);
  }, [fontSize]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button type="button" onClick={() => void renditionRef.current?.prev()}>
          Previous
        </button>
        <button type="button" onClick={() => void renditionRef.current?.next()}>
          Next
        </button>
        <select
          aria-label="Table of contents"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              void renditionRef.current?.display(event.target.value);
            }
          }}
        >
          <option value="">Contents</option>
          {toc.map((item) => (
            <option key={`${item.id}-${item.href}`} value={item.href}>
              {`${"  ".repeat(item.depth)}${item.label}`}
            </option>
          ))}
        </select>
        <label>
          <span>{fontSize}%</span>
          <input
            type="range"
            min="75"
            max="175"
            value={fontSize}
            aria-label="Book font size"
            onChange={(event) => setFontSize(Number(event.target.value))}
          />
        </label>
      </div>
      <div ref={rootRef} className={styles.reader} />
      {!ready ? <div className={styles.status}>Opening book…</div> : null}
    </div>
  );
}
