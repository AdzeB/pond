"use client";

import {
  IconArchiveContent2Fill18,
  IconGear3Fill18,
  IconGlobeFill18,
  IconTrash2ContentFill18,
} from "@pond/icons/fill/18";
import { TitleBar, Tray } from "@pond/ui";
import {
  type ComponentType,
  type SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./app-window.module.css";
import { DockDemo, type DockDemoState } from "./dock-demo";
import { SaveThumb } from "./save-thumb";
import { demoImage, packMasonry, packUniform, SAVES } from "./saves";

type RailItem = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  active?: boolean;
};

/** Tab order and icons mirror library-dock/lib/nav-tabs. */
const RAIL_MAIN: RailItem[] = [
  { icon: IconArchiveContent2Fill18, label: "Library", active: true },
  { icon: IconGlobeFill18, label: "Sources" },
];

const RAIL_UTILITY: RailItem[] = [
  { icon: IconTrash2ContentFill18, label: "Trash" },
  { icon: IconGear3Fill18, label: "Settings" },
];

/** Shell.Main content width at the default 1280px window: 24px inline padding each side. */
const CONTENT_WIDTH = 1280 - 48;

/** App defaults: 130px zoom, 16px gap, 44px meta chrome (name + date on). */
const ITEM_GAP = 16;
const CHROME_HEIGHT = 44;
const ZOOM_DEFAULT = 130;

interface TimelineStep extends DockDemoState {
  hold: number;
}

const SEARCH_TEXT = "design";
const NEW_URL = "cosmos.so/stallboerger";

/** The looping scene script: rest, search-as-you-type, new save, layout swap, zoom swap. */
function buildScript(): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const push = (patch: Partial<DockDemoState>, hold: number) => {
    const prev: DockDemoState = steps.at(-1) ?? {
      view: "nav",
      query: "",
      url: "",
      layout: "waterfall",
      zoom: ZOOM_DEFAULT,
    };
    steps.push({ ...prev, ...patch, hold });
  };

  push({}, 3000);
  push({ view: "search" }, 1000);
  for (let i = 1; i <= SEARCH_TEXT.length; i += 1) {
    push(
      { query: SEARCH_TEXT.slice(0, i) },
      i === SEARCH_TEXT.length ? 2800 : 140,
    );
  }
  push({ view: "nav", query: "" }, 3000);

  push({ view: "new" }, 1000);
  for (let i = 1; i <= NEW_URL.length; i += 1) {
    push({ url: NEW_URL.slice(0, i) }, i === NEW_URL.length ? 2600 : 45);
  }
  push({ view: "nav", url: "" }, 3000);

  push({ view: "layout" }, 1400);
  push({ layout: "grid" }, 2400);
  push({ layout: "waterfall" }, 1000);
  push({ view: "nav" }, 3000);

  push({ view: "zoom" }, 1400);
  push({ zoom: 185 }, 2400);
  push({ zoom: ZOOM_DEFAULT }, 1000);

  return steps;
}

const SCRIPT = buildScript();
const REST_STATE = SCRIPT[0] as TimelineStep;

function RailTab({ icon: Icon, label, active }: RailItem) {
  return (
    <Tray.Item
      render={<span />}
      data-status={active ? "active" : undefined}
      title={label}
    >
      {active ? <Tray.Indicator /> : null}
      <Icon />
    </Tray.Item>
  );
}

/** Advances through SCRIPT while the window is on screen; parks at rest otherwise so nothing animates invisibly. */
function useTimeline(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => setRunning(visible && !reduce.matches);
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;
        update();
      },
      { threshold: 0.2 },
    );
    observer.observe(root);
    reduce.addEventListener("change", update);
    return () => {
      observer.disconnect();
      reduce.removeEventListener("change", update);
    };
  }, [rootRef]);

  useEffect(() => {
    if (!running) {
      setStep(0);
      return;
    }
    const hold = SCRIPT[step]?.hold ?? 3000;
    const timer = window.setTimeout(
      () => setStep((current) => (current + 1) % SCRIPT.length),
      hold,
    );
    return () => window.clearTimeout(timer);
  }, [running, step]);

  return SCRIPT[step] ?? REST_STATE;
}

/** Native-resolution (1280x800) replica of the desktop Library screen; scale it down to present. */
export function AppWindow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useTimeline(rootRef);

  const packed = useMemo(() => {
    const q = state.query.toLowerCase();
    const filtered = q
      ? SAVES.filter((save) => save.title.toLowerCase().includes(q))
      : SAVES;
    return state.layout === "grid"
      ? packUniform(
          filtered,
          CONTENT_WIDTH,
          state.zoom,
          ITEM_GAP,
          CHROME_HEIGHT,
        )
      : packMasonry(
          filtered,
          CONTENT_WIDTH,
          state.zoom,
          ITEM_GAP,
          CHROME_HEIGHT,
        );
  }, [state.query, state.layout, state.zoom]);

  /** Toolbar meta mirrors library-toolbar: `matching "…" / count` while a search narrows the grid. */
  const meta = state.query
    ? `matching \u201C${state.query}\u201D / ${packed.items.length}`
    : "1,284";

  return (
    <div ref={rootRef} className={styles.window} aria-hidden inert>
      <span className={styles.lights}>
        <span className={styles.light} data-tone="close" />
        <span className={styles.light} data-tone="min" />
        <span className={styles.light} data-tone="max" />
      </span>
      <div className={styles.main}>
        <TitleBar.Root className={styles["title-bar"]}>
          <TitleBar.Title>
            <TitleBar.Label>Library</TitleBar.Label>
            <TitleBar.Meta>{meta}</TitleBar.Meta>
          </TitleBar.Title>
        </TitleBar.Root>
        <div className={styles.grid} style={{ height: packed.totalHeight }}>
          {packed.items.map(({ save, top, left, width }) => (
            <div
              key={save.seed}
              className={styles.cell}
              style={{ top, left, width }}
            >
              <SaveThumb
                {...save}
                image={demoImage(save.seed)}
                mediaHeight={
                  state.layout === "grid" ? width : width / (save.aspect ?? 1)
                }
              />
            </div>
          ))}
        </div>
      </div>
      <Tray.Pill orientation="vertical" className={styles.rail}>
        {RAIL_MAIN.map((item) => (
          <RailTab key={item.label} {...item} />
        ))}
        <Tray.Separator />
        {RAIL_UTILITY.map((item) => (
          <RailTab key={item.label} {...item} />
        ))}
      </Tray.Pill>
      <div className={styles.fade} />
      <div className={styles["dock-slot"]}>
        <DockDemo
          view={state.view}
          query={state.query}
          url={state.url}
          layout={state.layout}
          zoom={state.zoom}
        />
      </div>
    </div>
  );
}
