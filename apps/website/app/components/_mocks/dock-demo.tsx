"use client";

import {
  IconGridFill18,
  IconGridLayoutColsFill18,
  IconGridLayoutRowsFill18,
} from "@pond/icons/fill/18";
import {
  IconLink2Outline18,
  IconMagnifierOutline18,
} from "@pond/icons/outline/18";
import { Tray, TrayCard } from "@pond/ui";
import Image from "next/image";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { DockNavRow } from "./dock";
import styles from "./dock-demo.module.css";

export type DockDemoView = "nav" | "search" | "layout" | "zoom" | "new";
export type DemoLayout = "waterfall" | "grid" | "justified";

export interface DockDemoState {
  view: DockDemoView;
  query: string;
  url: string;
  layout: DemoLayout;
  zoom: number;
}

const LAYOUT_OPTIONS: { value: DemoLayout; label: string; icon: ReactNode }[] =
  [
    {
      value: "waterfall",
      label: "Waterfall",
      icon: <IconGridLayoutColsFill18 />,
    },
    { value: "grid", label: "Grid", icon: <IconGridFill18 /> },
    {
      value: "justified",
      label: "Justified",
      icon: <IconGridLayoutRowsFill18 />,
    },
  ];

/** Mirrors library-view-menu-zoom STEPS. */
const ZOOM_STEPS = [
  { value: 80, label: "Tiny" },
  { value: 105, label: "Small" },
  { value: 130, label: "Medium" },
  { value: 155, label: "Large" },
  { value: 185, label: "Huge" },
  { value: 240, label: "Giant" },
];

function Caret() {
  return <span className={styles.caret} />;
}

function SearchCard({ query }: { query: string }) {
  return (
    <TrayCard.Root className={styles.card}>
      <TrayCard.Header>
        <TrayCard.Help tabIndex={-1} />
        <TrayCard.Title position="center">Search Library</TrayCard.Title>
        <TrayCard.Close tabIndex={-1} />
        <TrayCard.Separator />
        <TrayCard.Description>
          Results update live. Mix words with filters like source:twitter or
          tag:design.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.editor}>
        <IconMagnifierOutline18
          className={styles["lead-icon"]}
          width={16}
          height={16}
        />
        <span className={styles.input}>
          {query}
          <Caret />
        </span>
        {query ? null : (
          <span className={styles.placeholder}>Filter your library…</span>
        )}
      </div>
    </TrayCard.Root>
  );
}

function NewCard({ url }: { url: string }) {
  /** The app classifies the URL as you type; the brand mark pops in once the domain resolves. */
  const classified = url.includes("cosmos.so/");
  return (
    <TrayCard.Root className={styles.card}>
      <TrayCard.Header>
        <TrayCard.Title>New Save</TrayCard.Title>
        <TrayCard.Close tabIndex={-1} />
        <TrayCard.Separator />
        <TrayCard.Description>
          Paste links to add them to your library.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles["new-row"]}>
        <span key={classified ? "cosmos" : "link"} className={styles.glyph}>
          {classified ? (
            <Image src="/demo/logos/cosmos.png" alt="" width={16} height={16} />
          ) : (
            <IconLink2Outline18 width={16} height={16} />
          )}
        </span>
        <span className={styles["new-input"]}>
          {url}
          <Caret />
        </span>
        {url ? null : (
          <span className={styles["new-placeholder"]}>
            Paste a link to save
          </span>
        )}
      </div>
      <TrayCard.Footer>
        <TrayCard.Cancel tabIndex={-1} />
        <TrayCard.Confirm tabIndex={-1} disabled={!url}>
          Save
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </TrayCard.Root>
  );
}

function LayoutCard({ layout }: { layout: DemoLayout }) {
  const active = LAYOUT_OPTIONS.findIndex((o) => o.value === layout);
  return (
    <TrayCard.Root className={styles.card}>
      <TrayCard.Header>
        <TrayCard.Title>Library Layout</TrayCard.Title>
        <TrayCard.Close tabIndex={-1} />
        <TrayCard.Separator />
        <TrayCard.Description>
          Choose how items are arranged in your library.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.segmented}>
        <span
          className={styles["segment-highlight"]}
          style={{ "--index": active } as React.CSSProperties}
        />
        {LAYOUT_OPTIONS.map((option) => (
          <span
            key={option.value}
            className={styles.segment}
            data-active={option.value === layout}
          >
            <span className={styles["segment-inner"]}>
              {option.icon}
              <span className={styles["segment-label"]}>{option.label}</span>
            </span>
          </span>
        ))}
      </div>
      <TrayCard.Footer>
        <TrayCard.Cancel tabIndex={-1} />
        <TrayCard.Confirm tabIndex={-1} />
      </TrayCard.Footer>
    </TrayCard.Root>
  );
}

function ZoomCard({ zoom }: { zoom: number }) {
  const active = ZOOM_STEPS.findIndex((s) => s.value === zoom);
  return (
    <TrayCard.Root className={styles.card}>
      <TrayCard.Header>
        <TrayCard.Title>Library Zoom Level</TrayCard.Title>
        <TrayCard.Close tabIndex={-1} />
        <TrayCard.Separator />
        <TrayCard.Description>
          Control how large items appear in your library.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles["zoom-options"]}>
        <span
          className={styles["zoom-highlight"]}
          style={
            {
              "--col": active % 3,
              "--row": Math.floor(active / 3),
            } as React.CSSProperties
          }
        />
        {ZOOM_STEPS.map((step) => (
          <span
            key={step.value}
            className={styles["zoom-toggle"]}
            data-active={step.value === zoom}
          >
            <span className={styles["zoom-label"]}>{step.label}</span>
          </span>
        ))}
      </div>
      <TrayCard.Footer>
        <TrayCard.Cancel tabIndex={-1} />
        <TrayCard.Confirm tabIndex={-1} />
      </TrayCard.Footer>
    </TrayCard.Root>
  );
}

/**
 * Scripted replica of library-dock: the pill morphs between the resting nav
 * row and the 384px tray cards, sized like the app's measured viewport.
 */
export function DockDemo({ view, query, url, layout, zoom }: DockDemoState) {
  const layersRef = useRef<Map<DockDemoView, HTMLDivElement>>(new Map());
  const [sizes, setSizes] = useState<
    Partial<Record<DockDemoView, { w: number; h: number }>>
  >({});

  /** Cards resize as text lines wrap or rows appear; observed sizes drive the pill morph like the app's ResizeObserver. */
  useLayoutEffect(() => {
    const measure = () => {
      setSizes((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [key, el] of layersRef.current) {
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          if (prev[key]?.w !== w || prev[key]?.h !== h) {
            next[key] = { w, h };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of layersRef.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layer = (key: DockDemoView, children: ReactNode) => (
    <div
      ref={(el) => {
        if (el) layersRef.current.set(key, el);
        else layersRef.current.delete(key);
      }}
      className={styles.layer}
      data-view={key}
      data-active={view === key}
    >
      {children}
    </div>
  );

  const size = sizes[view];

  return (
    <TrayCard.Provider onDismiss={() => {}}>
      <Tray.Pill
        aria-hidden
        className={styles.pill}
        style={size ? { width: size.w, height: size.h } : undefined}
      >
        {layer(
          "nav",
          <div className={styles.viewport}>
            <DockNavRow />
          </div>,
        )}
        {layer("search", <SearchCard query={query} />)}
        {layer("new", <NewCard url={url} />)}
        {layer("layout", <LayoutCard layout={layout} />)}
        {layer("zoom", <ZoomCard zoom={zoom} />)}
      </Tray.Pill>
    </TrayCard.Provider>
  );
}
