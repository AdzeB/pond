import {
  IconChevronLeftOutline12,
  IconXmarkOutline12,
} from "@pond/icons/outline/12";
import { Logo, Tooltip } from "@pond/ui";
import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "../../src/renderer/src/styles.css";
import "./styles.css";
import {
  P3_CHROMA_BOOST,
  themeCssVars,
} from "../../../../packages/schema/src/color";
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
} from "../../../../packages/schema/src/prefs.types";
import { buttonCases } from "./button-cases";
import { captureComponent } from "./capture-component";
import { catalog, categories, type Entry } from "./catalog";
import { LinearSpecimen, linearSamples } from "./linear-specimens";
import pondSources from "./public/evidence/pond-sources.json";
import { Specimen } from "./specimens";

type Metrics = Record<string, string>;
type Measurement = {
  revision?: number;
  theme?: string;
  sample: string | null;
  target: string;
  metrics: Metrics;
  computed: Metrics;
};
const keys = [
  "height",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "padding",
  "gap",
  "borderRadius",
  "border",
  "boxShadow",
  "background",
  "color",
  "transition",
  "fontFamily",
];
const labels = [
  "Height",
  "Font size",
  "Weight",
  "Line height",
  "Tracking",
  "Padding",
  "Gap",
  "Radius",
  "Border",
  "Shadow",
  "Background",
  "Text color",
  "Transition",
  "Typeface",
];
const hasReference = (entry: Entry) => Boolean(entry.app);
const available = catalog.filter(hasReference).length;
const sourceFiles = (entry: Entry) =>
  pondSources.files.filter(
    (file) =>
      file.path.startsWith(`packages/ui/src/${entry.folder}/`) ||
      (["Dialog", "AlertDialog"].includes(entry.id) &&
        file.path.startsWith("packages/ui/src/shared/styles/dialog/")),
  );

function collect(element: Element): Measurement {
  const css = getComputedStyle(element);
  return {
    sample:
      element.getAttribute("data-linear-overlay") ??
      element.getAttribute("data-linear-primary"),
    target:
      element.hasAttribute("data-linear-overlay") ||
      element.hasAttribute("data-overlay-measure") ||
      element.getAttribute("role") === "menu"
        ? "Open surface"
        : "Primary element",
    metrics: Object.fromEntries(
      keys.map((key) => [
        key,
        key === "background"
          ? css.backgroundColor
          : String(css[key as keyof CSSStyleDeclaration]),
      ]),
    ),
    computed: Object.fromEntries(
      [...css].map((key) => [key, css.getPropertyValue(key)]),
    ),
  };
}

function useMeasurement(
  host: RefObject<HTMLDivElement | null>,
  entry: Entry,
  side: "linear" | "pond",
  revision: number,
  theme: string,
) {
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const overlays = document.querySelectorAll(
          side === "linear"
            ? "[data-linear-overlay]"
            : "[data-overlay-measure], [role=menu], [role=tooltip], [role=listbox]",
        );
        const overlay = [...overlays].find(
          (element) =>
            element.getBoundingClientRect().height > 0 &&
            (side === "linear" || !element.closest("[data-linear-root]")),
        );
        const primary = host.current?.querySelector(
          side === "linear"
            ? entry.id === "Keyboard"
              ? "kbd"
              : entry.id === "Button"
                ? `[data-linear-primary="${entry.app}"]`
                : "[data-linear-primary]"
            : (entry.measure ?? "[data-primary]"),
        );
        const element =
          overlay ??
          primary ??
          (side === "pond" ? host.current?.firstElementChild : null);
        const next = element ? { ...collect(element), revision, theme } : null;
        setMeasurement((previous) =>
          JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
        );
      });
    };
    measure();
    void document.fonts.ready.then(measure);
    const resize = new ResizeObserver(measure);
    if (host.current) resize.observe(host.current);
    const mutations = new MutationObserver(measure);
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    document.addEventListener("focusin", measure);
    document.addEventListener("transitionend", measure, true);
    document.addEventListener("animationend", measure, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      document.removeEventListener("focusin", measure);
      document.removeEventListener("transitionend", measure, true);
      document.removeEventListener("animationend", measure, true);
    };
  }, [host, entry, side, revision, theme]);
  return measurement;
}

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Compare({
  entry,
  theme,
  revision,
}: {
  entry: Entry;
  theme: string;
  revision: number;
}) {
  const linearHost = useRef<HTMLDivElement>(null);
  const pondHost = useRef<HTMLDivElement>(null);
  const [buttonSample, setButtonSample] = useState<string>(buttonCases[0].id);
  const measuredEntry = useMemo(
    () =>
      entry.id === "Button"
        ? {
            ...entry,
            app: buttonSample,
            measure: `[data-button-case="${buttonSample}"]`,
          }
        : entry,
    [entry, buttonSample],
  );
  const linear = useMeasurement(
    linearHost,
    measuredEntry,
    "linear",
    revision,
    theme,
  );
  const pond = useMeasurement(pondHost, measuredEntry, "pond", revision, theme);
  const [mode, setMode] = useState("metrics");
  const [sourcePath, setSourcePath] = useState("");
  const [captureStatus, setCaptureStatus] = useState("");
  const source = linearSamples.find(
    (item) => item.id === (linear?.sample ?? entry.app),
  );
  const files = sourceFiles(entry);
  const file =
    files.find((item) => item.path === sourcePath) ??
    files.find((item) => item.path.endsWith(".css")) ??
    files[0];
  return (
    <>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">{entry.group}</div>
          <h1>{entry.id}</h1>
          <p>{entry.description}</p>
        </div>
        <span className="status">
          {entry.app ? "Partial reconstruction" : "Linear extraction pending"}
        </span>
      </div>
      {entry.app && (
        <p className="comparison-note comparison-scope">
          {entry.appRelation} This is a reconstruction, not Linear’s original
          component code.
        </p>
      )}
      {entry.id === "Button" && (
        <label className="button-measure-picker">
          Inspect button{" "}
          <select
            value={buttonSample}
            onChange={(event) => setButtonSample(event.target.value)}
          >
            {buttonCases.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="comparison" data-component={entry.id}>
        <section className="compare-side" aria-label="Linear example">
          <div className="side-heading">
            <span className="brand-name">Linear</span>
            <span>App styles · light</span>
          </div>
          <div className="stage linear-stage" data-linear-root>
            <div
              ref={linearHost}
              className="linear-specimen"
              key={`${entry.id}-${revision}`}
            >
              <LinearSpecimen entry={entry} />
            </div>
          </div>
          <div className="side-caption">
            {entry.app
              ? "Rendered from extracted app CSS. Neutral content; local interactions."
              : "No public-site or invented counterpart is substituted."}
          </div>
        </section>
        <section className="compare-side" aria-label="Pond example">
          <div className="side-heading">
            <span className="brand-name">
              <Logo size={13} />
              Pond
            </span>
            <span>Production component · {theme}</span>
          </div>
          <div className="stage pond-stage">
            <div
              ref={pondHost}
              className={`specimen specimen-${entry.id}`}
              data-specimen={entry.id}
              data-measure-selector={entry.measure ?? "[data-primary]"}
              key={`${entry.id}-${revision}`}
            >
              <Specimen entry={entry} />
            </div>
          </div>
          <div className="side-caption">
            Actual @pond/ui component, with unchanged production styles.
          </div>
        </section>
      </div>
      {theme !== "light" && (
        <p className="comparison-note">
          Linear’s extracted colors are light mode. Switch Pond to light for a
          matched color comparison.
        </p>
      )}
      <details className="comparison-details">
        <summary>
          Inspect styles{" "}
          <span>Measurements, source, and reconstruction scope</span>
        </summary>
        <p className="comparison-note">
          {entry.appRelation ??
            "This family has no inspected Linear counterpart yet."}
        </p>
        {entry.app && (
          <p className="comparison-note">
            Linear’s measured properties are applied directly. Sample
            composition, icons, focus feedback, and interactions are recreated
            locally; unmeasured details are not claimed as exact Linear source.
            Captured CSS values are evidence; complete visual fidelity and
            uncaptured states are not verified.
          </p>
        )}
        <div className="inspector">
          <div
            className="inspector-tabs"
            role="tablist"
            aria-label="Style inspector"
          >
            {[
              ["metrics", "Measurements"],
              ["source", "Pond source"],
              ["raw", "Extracted CSS"],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id ?? "metrics")}
              >
                {label}
              </button>
            ))}
            <button
              className="download"
              type="button"
              onClick={() =>
                download(`pond-linear-${entry.id.toLowerCase()}.json`, {
                  component: entry.id,
                  linearSource: source ?? null,
                  linearRender: linear,
                  pond,
                  theme,
                  files,
                })
              }
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={async () => {
                const root = pondHost.current;
                if (root) {
                  const captured = await captureComponent(root);
                  download(
                    `pond-${entry.id.toLowerCase()}-anatomy.json`,
                    captured,
                  );
                  setCaptureStatus(
                    `Captured ${captured.count} elements${captured.truncated ? " (truncated)" : ""}; text and URLs excluded.`,
                  );
                }
              }}
            >
              Export Pond anatomy
            </button>
          </div>
          {captureStatus && (
            <p className="table-note" role="status">
              {captureStatus}
            </p>
          )}
          {mode === "metrics" && (
            <>
              <p className="table-note">
                Both live columns follow their own open overlays. The source
                column is the measured Linear app element, before
                reconstruction. Context, content, and equivalent CSS color
                notations can differ.
                <span className="measured-target">
                  Linear: {linear?.target ?? "Not extracted"} · Pond:{" "}
                  {pond?.target ?? "Measuring…"} · Source:{" "}
                  {source?.id ?? "None"}
                </span>
              </p>
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Linear app CSS</th>
                    <th>Linear rendered</th>
                    <th>Pond rendered</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key, index) => (
                    <tr key={key}>
                      <th>{labels[index]}</th>
                      <td>
                        {(source?.metrics as Metrics | undefined)?.[key] ?? "—"}
                      </td>
                      <td>{linear?.metrics[key] ?? "—"}</td>
                      <td>{pond?.metrics[key] ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {mode === "source" && (
            <div className="source-panel">
              <label>
                Authored file
                <select
                  value={file?.path ?? ""}
                  onChange={(event) => setSourcePath(event.target.value)}
                >
                  {files.map((item) => (
                    <option key={item.path}>{item.path}</option>
                  ))}
                </select>
              </label>
              <pre>
                {file?.content ?? "This component composes shared parts."}
              </pre>
            </div>
          )}
          {mode === "raw" && (
            <div className="raw-grid">
              <div>
                <h3>Linear · extracted app styles</h3>
                <pre>{JSON.stringify(source ?? null, null, 2)}</pre>
              </div>
              <div>
                <h3>Linear · current reconstruction</h3>
                <pre>{JSON.stringify(linear, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </details>
    </>
  );
}

function Evidence() {
  return (
    <>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">App source only</div>
          <h1>Extraction</h1>
          <p>Styles behind the rendered examples.</p>
        </div>
      </div>
      <div className="evidence-summary">
        <div>
          <strong>{linearSamples.length}</strong>
          <span>Extracted Linear elements</span>
        </div>
        <div>
          <strong>
            {available} / {catalog.length}
          </strong>
          <span>Component families reconstructed</span>
        </div>
        <div>
          <strong>{pondSources.files.length}</strong>
          <span>Pond source files</span>
        </div>
      </div>
      <p className="audit-intro">
        Linear examples are local reconstructions of inspected app components,
        using the measured CSS directly. They are not embedded Linear code. No
        public marketing examples are used. Layout and behavior that were not
        captured remain prototype implementations. The extraction is incomplete;
        all Pond families remain in the inventory.
      </p>
      <div className="evidence-actions">
        <a href="/evidence/linear-native-styles.json" download>
          Download native component styles
        </a>
        <a href="/evidence/linear-authored-rules.json" download>
          Download authored CSS and variables
        </a>
        <a href="/evidence/linear-app-styles.json" download>
          Download earlier app samples
        </a>
        <a href="/evidence/pond-sources.json" download>
          Download Pond sources
        </a>
      </div>
      <table className="metrics-table coverage-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>Linear source</th>
            <th>Relationship</th>
          </tr>
        </thead>
        <tbody>
          {catalog.map((entry) => (
            <tr key={entry.id}>
              <th>
                <a href={`/?component=${entry.id}`}>{entry.id}</a>
              </th>
              <td>{entry.app ?? "Not extracted"}</td>
              <td>{entry.appRelation ?? "No inspected counterpart yet."}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Audit() {
  const findings = [
    [
      "Sidebar",
      "Both use 28 px rows, 13 px labels, weight 500, and 8 px corners. Linear’s horizontal padding is 8 / 9 px; Pond uses 8 / 8 px.",
    ],
    [
      "Menus",
      "The inspected Linear popups use 12 px corners and 32 px option rows, matching Pond’s shared menu dimensions. Visible Linear option labels use weight 450.",
    ],
    [
      "Search",
      "Linear and Pond’s picker search fields are now 36 px high, with a borderless surface and a bottom divider. Compare the open pickers rather than a standalone input.",
    ],
    [
      "Dialog",
      "The Linear composer surface uses 22 px corners and three shadow layers. Pond’s edit dialog uses 12 px corners. These dialogs have different content and sizes.",
    ],
    [
      "Motion",
      "Linear’s create button transitions border, background color, color, and opacity over 150 ms. Pond’s base button transitions all properties over 200 ms.",
    ],
    [
      "Switch",
      "Both switch tracks are now 22 × 14 px with a 10 px thumb and 8 px travel. Pond retains its theme colors and transition behavior, with an expanded invisible pointer target.",
    ],
  ];
  return (
    <>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">Density & precision</div>
          <h1>Audit notes</h1>
          <p>Observed differences, with Pond production styles left intact.</p>
        </div>
      </div>
      <div className="findings">
        {findings.map(([title, body], index) => (
          <article className="finding" key={title}>
            <span className="finding-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function initialEntry(): Entry {
  const initial =
    catalog.find(
      (entry) =>
        entry.id === new URLSearchParams(location.search).get("component"),
    ) ??
    catalog.find((entry) => entry.id === "Sidebar") ??
    catalog[0];
  if (!initial) throw new Error("Empty component inventory");
  return initial;
}

export default function App() {
  const [entry, setEntry] = useState(initialEntry);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState("components");
  const [theme, setTheme] = useState("light");
  const [revision, setRevision] = useState(0);
  const content = useRef<HTMLElement>(null);
  const filtered = catalog.filter(
    (item) =>
      `${item.id} ${item.group}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "ready" ? hasReference(item) : !hasReference(item))),
  );
  function showPage(next: string) {
    setPage(next);
    content.current?.scrollTo({ top: 0 });
  }
  function select(next: Entry | undefined) {
    if (!next) return;
    setEntry(next);
    setPage("components");
    setRevision((value) => value + 1);
    const url = new URL(location.href);
    url.searchParams.set("component", next.id);
    history.replaceState(null, "", url);
    content.current?.scrollTo({ top: 0 });
  }
  useLayoutEffect(() => {
    const root = document.documentElement;
    const values = themeCssVars(
      theme === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME,
    );
    if (matchMedia("(color-gamut: p3)").matches)
      values.accentC *= P3_CHROMA_BOOST;
    for (const [key, value] of Object.entries(values)) {
      if (key !== "isDark")
        root.style.setProperty(
          `--ds-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
          String(value),
        );
    }
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }, [theme]);
  return (
    <Tooltip.Provider>
      <div className="audit-app">
        <aside className="audit-sidebar">
          <a className="audit-brand" href="/?component=Sidebar">
            <Logo size={18} />
            <strong>
              Pond <span>×</span> Linear
            </strong>
            <span className="local-label">LOCAL</span>
          </a>
          <div className="audit-nav">
            {[
              ["components", "Components", catalog.length],
              ["audit", "Audit notes", 6],
              ["evidence", "Extraction", linearSamples.length],
            ].map(([id, name, count]) => (
              <button
                key={id}
                type="button"
                aria-current={page === id ? "page" : undefined}
                onClick={() => showPage(String(id))}
              >
                {name}
                <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="component-search">
            <input
              aria-label="Find a component"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a component…"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear component search"
                onClick={() => setQuery("")}
              >
                <IconXmarkOutline12 />
              </button>
            )}
          </div>
          <label className="coverage-filter">
            Show
            <select
              aria-label="Reference coverage"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All components</option>
              <option value="ready">Side by side ({available})</option>
              <option value="pending">Not extracted yet</option>
            </select>
          </label>
          <nav className="component-nav" aria-label="Component inventory">
            {categories.map((category) => {
              const items = filtered.filter((item) => item.group === category);
              return items.length ? (
                <div className="component-group" key={category}>
                  <h2>{category}</h2>
                  {items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-current={
                        page === "components" && entry.id === item.id
                          ? "page"
                          : undefined
                      }
                      onClick={() => select(item)}
                    >
                      <span>{item.id}</span>
                      <span
                        className={`coverage-dot ${hasReference(item) ? "has-ref" : "no-ref"}`}
                        title={
                          hasReference(item)
                            ? "Rendered comparison available"
                            : "Linear not extracted yet"
                        }
                      />
                    </button>
                  ))}
                </div>
              ) : null;
            })}
            {!filtered.length && (
              <p className="no-results">No matching components.</p>
            )}
          </nav>
          <div className="sidebar-foot">
            {available} comparisons · {catalog.length} components
          </div>
        </aside>
        <div className="workspace">
          <header className="audit-topbar">
            <div className="breadcrumb">
              Comparison<span>/</span>
              {page === "components"
                ? entry.id
                : page === "audit"
                  ? "Audit notes"
                  : "Extraction"}
            </div>
            <div className="topbar-actions">
              <button
                type="button"
                onClick={() =>
                  setTheme((value) => (value === "dark" ? "light" : "dark"))
                }
              >
                Pond: {theme}
                <span className="theme-swatch" />
              </button>
              {page === "components" && (
                <button
                  type="button"
                  onClick={() => setRevision((value) => value + 1)}
                >
                  Reset samples
                </button>
              )}
            </div>
          </header>
          <main className="audit-content" ref={content}>
            {page === "components" ? (
              <Compare
                key={entry.id}
                entry={entry}
                theme={theme}
                revision={revision}
              />
            ) : page === "audit" ? (
              <Audit />
            ) : (
              <Evidence />
            )}
            {page === "components" && (
              <div className="pagination">
                <button
                  type="button"
                  disabled={catalog.indexOf(entry) === 0}
                  onClick={() => select(catalog[catalog.indexOf(entry) - 1])}
                >
                  <IconChevronLeftOutline12 />
                  Previous
                </button>
                <span>
                  {catalog.indexOf(entry) + 1} / {catalog.length}
                </span>
                <button
                  type="button"
                  disabled={catalog.indexOf(entry) === catalog.length - 1}
                  onClick={() => select(catalog[catalog.indexOf(entry) + 1])}
                >
                  Next
                  <IconChevronLeftOutline12 style={{ rotate: "180deg" }} />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
