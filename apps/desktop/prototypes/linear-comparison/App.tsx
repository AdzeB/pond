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
          : css.getPropertyValue(key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)),
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

function download(name: string, data: string) {
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" }),
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
                download(`pond-linear-${entry.id.toLowerCase()}.json`, JSON.stringify({
                  component: entry.id,
                  linearSource: source ?? null,
                  linearRender: linear,
                  pond,
                  theme,
                  files,
                }, null, 2))
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
                    JSON.stringify(captured, null, 2),
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
                        {source?.metrics[key] ?? "—"}
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
        <a href="/evidence/linear-command-menu-current.json" download>
          Download command menu extraction
        </a>
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

const commandMenuMetrics = [
  [
    "Surface",
    "720 × 450 px",
    "620 × 514 px",
    "Linear is 100 px wider and 64 px shorter.",
  ],
  ["Surface radius", "12 px", "16 px", "Pond reads softer and more modal."],
  [
    "Search input",
    "40 px, 13 px type",
    "56 px, 16 px type",
    "Pond gives the search field 40% more height.",
  ],
  [
    "Command row",
    "46 px",
    "42 px",
    "Row density is close. Pond adds more visual material inside each row.",
  ],
  [
    "Command label",
    "13 px, weight 450",
    "13 px, weight 500",
    "Pond is slightly heavier.",
  ],
  [
    "Section label",
    "12 px, weight 500",
    "12 px, weight 500",
    "The section typography already matches.",
  ],
  [
    "Focused row",
    "8 px inset layer",
    "10 px full-row layer",
    "Linear separates row hit area from the visible highlight.",
  ],
  [
    "Shortcut",
    "11 px, compact keycap",
    "10 px, mixed keycaps",
    "Linear keeps shortcuts quieter and more consistent.",
  ],
];

const commandMenuContent = [
  [
    "Default model",
    "Actions grouped by object",
    "Destinations first, then actions",
  ],
  [
    "Visible groups",
    "Issues, Projects, Documents, Views, Initiatives, Filter",
    "Go to, Actions",
  ],
  ["Row copy", "One action label", "Title plus explanatory detail"],
  ["Search handoff", "Ask Linear with Tab", "Search saves after typing"],
  ["Help", "Shortcuts sit on rows", "Persistent Navigate, Open, Close footer"],
  [
    "Catalog depth",
    "Long, scrollable command inventory",
    "10 default commands",
  ],
];

const commandMenuContexts = [
  {
    eyebrow: "Workspace search",
    title: "Project and document",
    detail:
      "A shared phrase returns typed entities with a quiet project relationship, followed by the full-workspace escape hatch.",
    image: "/evidence/context-audit/06-populated-project-document-search.png",
    alt: "Linear command menu showing a project and its related document for the query Command Menu",
  },
  {
    eyebrow: "Mixed search",
    title: "Commands before entities",
    detail:
      "The query search matches commands first, then issue and project results. The footer changes from Open to Select for the focused command.",
    image: "/evidence/context-audit/07-populated-command-and-entity-search.png",
    alt: "Linear command menu mixing search commands with matching issue and project results",
  },
  {
    eyebrow: "Issue context",
    title: "Actions for PGD-28",
    detail:
      "The empty query is anchored to the current issue and prioritizes assignment, status, priority, project, labels, and cycle actions.",
    image: "/evidence/context-audit/10-populated-issue-context.png",
    alt: "Linear command menu scoped to issue PGD-28",
  },
  {
    eyebrow: "Project context",
    title: "Actions for Command Menu Polish",
    detail:
      "The same surface becomes a project editor: status, priority, initiatives, labels, dates, dependencies, and rename replace issue actions.",
    image: "/evidence/context-audit/11-populated-project-context.png",
    alt: "Linear command menu scoped to the Command Menu Polish project",
  },
  {
    eyebrow: "Project search",
    title: "Scoped chrome, global results",
    detail:
      "Typing from a project context preserves the project breadcrumb while returning workspace-wide commands and entities.",
    image: "/evidence/context-audit/12-populated-project-context-search.png",
    alt: "Linear command menu showing search results while opened from a project",
  },
  {
    eyebrow: "Search boundary",
    title: "Labels are not direct results",
    detail:
      "Searching the exact cmdk-benchmark label returns no quick result. Linear hands the query to advanced search instead.",
    image: "/evidence/context-audit/08-label-name-no-results.png",
    alt: "Linear command menu showing no result for an exact label name",
  },
];

function CommandMenuAudit() {
  const findings = [
    [
      "The hierarchy is the main miss",
      "Linear treats the palette as a command catalog. Pond treats it as a navigation dialog with supporting descriptions. The extra copy competes with the action labels.",
    ],
    [
      "Pond spends space on chrome",
      "The larger input, boxed icons, wider row gaps, and footer make Pond taller even though it exposes fewer commands.",
    ],
    [
      "The command inventory is too shallow",
      "Linear groups creation, filtering, templates, and navigation by task domain. Pond surfaces broad destinations before the actions people are likely to invoke from a command menu.",
    ],
    [
      "The useful Pond idea is search",
      "Searching saved items belongs here. Keep it as a compact quick-results group after matched commands instead of making every default row explain itself.",
    ],
  ];
  return (
    <>
      <div className="detail-heading command-menu-heading">
        <div>
          <div className="eyebrow">Live app extraction</div>
          <h1>Command Menu</h1>
          <p>
            Linear’s current light-theme default and filtered states, compared
            with Pond’s current palette.
          </p>
        </div>
        <span className="status">203 nodes · 148 matched rules</span>
      </div>
      <p className="comparison-note comparison-scope">
        Linear was captured from the native app on September 2, 2026. The
        extraction includes resolved CSS, pseudo-elements, bounds, SVG
        attributes, and matching authored rules. URLs and input values were
        excluded.
      </p>
      <div className="command-menu-compare">
        <figure>
          <figcaption>
            <strong>Linear</strong>
            <span>720 × 450 px</span>
          </figcaption>
          <div className="command-menu-image command-menu-image-linear">
            <img
              src="/evidence/linear-command-menu-crop-current.png"
              alt="Linear command menu with compact grouped actions"
            />
          </div>
        </figure>
        <figure>
          <figcaption>
            <strong>Pond</strong>
            <span>620 × 514 px</span>
          </figcaption>
          <div className="command-menu-image command-menu-image-pond">
            <img
              src="/evidence/pond-command-menu-crop-current.png"
              alt="Pond command menu with navigation rows and descriptions"
            />
          </div>
        </figure>
      </div>
      <section className="command-menu-section command-menu-filtered">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Filtered state</div>
            <h2>Query: settings</h2>
          </div>
        </div>
        <div className="command-menu-compare">
          <figure>
            <figcaption>
              <strong>Linear</strong>
              <span>2 commands · advanced search handoff</span>
            </figcaption>
            <div className="command-menu-image command-menu-image-linear-search">
              <img
                src="/evidence/linear-command-menu-search-crop-current.png"
                alt="Linear command menu filtered for settings"
              />
            </div>
          </figure>
          <figure>
            <figcaption>
              <strong>Pond</strong>
              <span>1 search action · 1 command</span>
            </figcaption>
            <div className="command-menu-image command-menu-image-pond-search">
              <img
                src="/evidence/pond-command-menu-search-crop-current.png"
                alt="Pond command menu filtered for settings"
              />
            </div>
          </figure>
        </div>
      </section>
      <section className="command-menu-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Populated context study</div>
            <h2>The menu changes with the object in focus</h2>
          </div>
          <span>2 projects · 10 issues · 1 document · 1 label</span>
        </div>
        <p className="comparison-note command-menu-context-note">
          These states were captured after adding a contained benchmark dataset
          to Linear’s Playground team. One project was marked canceled to retain
          it as a historical search case.
        </p>
        <div className="command-menu-context-grid">
          {commandMenuContexts.map((context) => (
            <figure key={context.title}>
              <figcaption>
                <span className="eyebrow">{context.eyebrow}</span>
                <strong>{context.title}</strong>
                <span>{context.detail}</span>
              </figcaption>
              <div className="command-menu-context-image">
                <img src={context.image} alt={context.alt} />
              </div>
            </figure>
          ))}
        </div>
      </section>
      <div className="command-menu-actions">
        <a href="/evidence/linear-command-menu-current.json" download>
          Download full Linear extraction
        </a>
        <a href="/evidence/linear-command-menu-current.png" download>
          Download Linear screenshot
        </a>
        <a href="/evidence/linear-command-menu-search-current.png" download>
          Download filtered-state screenshot
        </a>
        <a href="/evidence/pond-command-menu-current.png" download>
          Download Pond screenshot
        </a>
        <a href="/evidence/pond-command-menu-search-current.png" download>
          Download Pond filtered state
        </a>
        <a href="/evidence/context-audit/README.md" download>
          Download context study notes
        </a>
      </div>
      <section className="command-menu-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Geometry & type</div>
            <h2>Measured style comparison</h2>
          </div>
        </div>
        <table className="metrics-table command-menu-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Linear</th>
              <th>Pond</th>
              <th>Read</th>
            </tr>
          </thead>
          <tbody>
            {commandMenuMetrics.map(([part, linear, pond, read]) => (
              <tr key={part}>
                <th>{part}</th>
                <td>{linear}</td>
                <td>{pond}</td>
                <td>{read}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="command-menu-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Information design</div>
            <h2>Content comparison</h2>
          </div>
        </div>
        <table className="metrics-table command-menu-table">
          <thead>
            <tr>
              <th>Decision</th>
              <th>Linear</th>
              <th>Pond</th>
            </tr>
          </thead>
          <tbody>
            {commandMenuContent.map(([decision, linear, pond]) => (
              <tr key={decision}>
                <th>{decision}</th>
                <td>{linear}</td>
                <td>{pond}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="command-menu-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Verdict</div>
            <h2>Why Pond feels off</h2>
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
      </section>
      <p className="filter-evidence-limit">
        Evidence limits: the CSS export covers the current Linear light-theme
        default state. Filtered and object-context states were captured
        visually. Linear does not expose manual project archiving, so the
        historical benchmark project is canceled; the existing archived project
        result remains captured separately. Hover, disabled, dark-theme,
        reduced-motion, and assistive-technology behavior still need separate
        checks.
      </p>
    </>
  );
}

type FilterAuditItem = {
  pond: string;
  eagle?: string;
  slug: string;
  health: "Healthy" | "Mixed" | "Needs work";
  finding: string;
  action: string;
};

const matchedFilters: FilterAuditItem[] = [
  {
    pond: "Color",
    eagle: "Color",
    slug: "color",
    health: "Mixed",
    finding:
      "Pond adds useful tolerance control, but its fixed-width panel is substantially larger than Eagle’s compact palette.",
    action: "Keep tolerance, but move it behind a compact disclosure.",
  },
  {
    pond: "Shape",
    eagle: "Shape",
    slug: "shape",
    health: "Needs work",
    finding:
      "Six common choices do not need search, a selection-mode row, and a permanent count disclaimer.",
    action: "Render the choices directly in a compact list.",
  },
  {
    pond: "Duration",
    eagle: "Duration",
    slug: "duration",
    health: "Needs work",
    finding:
      "Pond combines presets, two bounds, units, helper copy, and Apply in one tall form. Eagle keeps the range on one line.",
    action: "Put minimum, maximum, and unit on one compact row.",
  },
  {
    pond: "Files",
    eagle: "Size · closest only",
    slug: "files",
    health: "Needs work",
    finding:
      "There is no exact Eagle equivalent. Pond’s presets plus a full min/max form are visually heavy for a file-count rule.",
    action: "Use presets first and reveal custom bounds only when requested.",
  },
  {
    pond: "Note",
    eagle: "Note",
    slug: "note",
    health: "Mixed",
    finding:
      "Pond’s existence and text-match options are more capable; Eagle’s Yes/No panel is faster to scan.",
    action: "Keep both capabilities while reducing the form treatment.",
  },
  {
    pond: "Date Saved",
    eagle: "Date Imported",
    slug: "date-saved",
    health: "Mixed",
    finding:
      "The relative-date presets align well. Pond is cleaner for common periods while Eagle exposes more historic buckets.",
    action:
      "Keep the short preset list and make Custom Range a secondary step.",
  },
  {
    pond: "Date Modified",
    eagle: "Date Modified",
    slug: "date-modified",
    health: "Mixed",
    finding:
      "Pond stays compact for presets, but its custom range inherits the same large form as other numeric filters.",
    action: "Use the same compact range pattern as Duration.",
  },
  {
    pond: "Tags",
    eagle: "Tags",
    slug: "tags",
    health: "Needs work",
    finding:
      "Pond makes Include/Exclude and Any/All explicit. Eagle’s two-pane picker handles groups, long lists, and counts more efficiently.",
    action:
      "Adopt the two-pane browser while preserving Pond’s explicit match controls.",
  },
  {
    pond: "Folders",
    eagle: "Folder",
    slug: "folders",
    health: "Mixed",
    finding:
      "Pond’s semantics are clearer, while Eagle removes setup chrome and gets users to the hierarchy faster.",
    action:
      "Show the hierarchy first; move selection rules into a compact control.",
  },
  {
    pond: "Type",
    eagle: "Types",
    slug: "type",
    health: "Mixed",
    finding:
      "Pond groups broad media families while Eagle lists exact extensions. Both levels are useful and should remain distinct.",
    action: "Offer media families first with an optional extension drill-down.",
  },
  {
    pond: "Aspect",
    eagle: "Dimensions · partial match",
    slug: "aspect",
    health: "Needs work",
    finding:
      "Pond offers common ratios; Eagle offers numeric width and height bounds. These are related, not equivalent.",
    action:
      "Keep Aspect compact and treat future Dimensions as a separate filter.",
  },
];

const pondOnlyFilters: FilterAuditItem[] = [
  {
    pond: "Source",
    slug: "source",
    health: "Mixed",
    finding: "Useful metadata filter that inherits the oversized choice shell.",
    action: "Use the compact choice pattern.",
  },
  {
    pond: "List",
    slug: "list",
    health: "Mixed",
    finding:
      "A short option set does not justify search and persistent controls.",
    action: "Render the list directly.",
  },
  {
    pond: "Date Published",
    slug: "date-published",
    health: "Healthy",
    finding:
      "Consistent with Pond’s other date filters and has no Eagle match.",
    action: "Share the compact date-range pattern.",
  },
  {
    pond: "Creator",
    slug: "creator",
    health: "Mixed",
    finding:
      "Search and counts help here, but repeated mode and helper rows add noise.",
    action: "Keep search; condense secondary controls.",
  },
  {
    pond: "Account",
    slug: "account",
    health: "Mixed",
    finding: "A valid long-list case with the same repeated chrome as Creator.",
    action: "Use the searchable-browser pattern.",
  },
  {
    pond: "Caption",
    slug: "caption",
    health: "Mixed",
    finding:
      "Powerful existence-plus-text filtering presented as a large form.",
    action: "Compress the text action and helper copy.",
  },
  {
    pond: "Transcript",
    slug: "transcript",
    health: "Mixed",
    finding: "The same capable pattern as Caption with the same density cost.",
    action: "Share the compact content-filter shell.",
  },
];

function FilterAudit() {
  const recommendations = [
    "Replace the universal 300px popup with compact, searchable, range, and visual-picker shells.",
    "Remove search from short static sets such as Shape, Aspect, and List.",
    "Put numeric bounds and units on one row, with custom controls revealed progressively.",
    "Rebuild Tags as a two-pane browser without losing Include/Exclude or Any/All.",
    "Move the repeated counts disclaimer out of every menu body.",
    "Keep Pond’s named controls and explicit states instead of copying Eagle’s hidden right-click behavior.",
  ];
  return (
    <>
      <div className="detail-heading filter-audit-heading">
        <div>
          <div className="eyebrow">Live app comparison · 2026-09-01</div>
          <h1>Pond × Eagle filters</h1>
          <p>
            Every Pond library filter captured against the closest honest Eagle
            equivalent. Pond-only metadata filters are reviewed separately.
          </p>
        </div>
        <span className="status measured">18 Pond filters audited</span>
      </div>
      <div className="filter-verdict">
        <strong>Copy Eagle’s density, not its hidden semantics.</strong>
        <p>
          Eagle sizes each popover to the task and keeps the library visible.
          Pond has the stronger explicit model: named selection modes, Any/All,
          counts, and clearer accessibility labels.
        </p>
      </div>
      <div className="filter-audit-summary">
        <div>
          <strong>18</strong>
          <span>Pond filters</span>
        </div>
        <div>
          <strong>11</strong>
          <span>Paired comparisons</span>
        </div>
        <div>
          <strong>7</strong>
          <span>Pond-only filters</span>
        </div>
      </div>
      <section className="filter-audit-section">
        <div className="filter-section-heading">
          <div>
            <div className="eyebrow">Matched controls</div>
            <h2>Side by side</h2>
          </div>
          <div className="filter-side-key">
            <span>Pond · left</span>
            <span>Eagle · right</span>
          </div>
        </div>
        <div className="filter-pair-list">
          {matchedFilters.map((item, index) => (
            <article
              className="filter-pair-card"
              key={item.slug}
              id={item.slug}
            >
              <div className="filter-card-heading">
                <span className="finding-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>
                    {item.pond} <span>↔</span> {item.eagle}
                  </h3>
                  <p>{item.finding}</p>
                </div>
                <span
                  className="filter-health"
                  data-health={item.health.toLowerCase().replace(" ", "-")}
                >
                  {item.health}
                </span>
              </div>
              <div className="filter-shot">
                <img
                  src={`/evidence/filter-audit/pair-${item.slug}.jpg`}
                  alt={`${item.pond} in Pond on the left and ${item.eagle} in Eagle on the right`}
                  loading="lazy"
                />
              </div>
              <p className="filter-action">
                <span>Recommended</span> {item.action}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="filter-audit-section">
        <div className="filter-section-heading">
          <div>
            <div className="eyebrow">No direct Eagle equivalent</div>
            <h2>Pond-only metadata</h2>
          </div>
        </div>
        <div className="pond-only-grid">
          {pondOnlyFilters.map((item) => (
            <article
              className="pond-only-card"
              key={item.slug}
              id={`pond-${item.slug}`}
            >
              <div className="filter-card-heading compact">
                <div>
                  <h3>{item.pond}</h3>
                  <p>{item.finding}</p>
                </div>
                <span
                  className="filter-health"
                  data-health={item.health.toLowerCase().replace(" ", "-")}
                >
                  {item.health}
                </span>
              </div>
              <img
                src={`/evidence/filter-audit/pond-${item.slug}-top.jpg`}
                alt={`${item.pond} filter open in Pond`}
                loading="lazy"
              />
              <p className="filter-action">
                <span>Recommended</span> {item.action}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="filter-audit-section filter-recommendations">
        <div className="filter-section-heading">
          <div>
            <div className="eyebrow">System changes</div>
            <h2>Highest-impact work</h2>
          </div>
        </div>
        <div className="findings">
          {recommendations.map((recommendation, index) => (
            <article className="finding" key={recommendation}>
              <span className="finding-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p>{recommendation}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <p className="filter-evidence-limit">
        Evidence: matched live screenshots and accessibility-tree inspection.
        This does not establish complete keyboard order, screen-reader
        announcements, contrast compliance, zoom behavior, or reduced-motion
        behavior.
      </p>
    </>
  );
}

function FilterAuditIndex() {
  return (
    <nav className="component-nav filter-index-nav" aria-label="Filter audit">
      <div className="component-group">
        <h2>Matched</h2>
        {matchedFilters.map((item) => (
          <a href={`#${item.slug}`} key={item.slug}>
            <span>{item.pond}</span>
            <span className="filter-index-source">{item.eagle}</span>
          </a>
        ))}
      </div>
      <div className="component-group">
        <h2>Pond only</h2>
        {pondOnlyFilters.map((item) => (
          <a href={`#pond-${item.slug}`} key={item.slug}>
            <span>{item.pond}</span>
          </a>
        ))}
      </div>
    </nav>
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
  const [page, setPage] = useState(() => {
    const requested = new URLSearchParams(location.search).get("page");
    return [
      "components",
      "command-menu",
      "audit",
      "filters",
      "evidence",
    ].includes(requested ?? "")
      ? String(requested)
      : "components";
  });
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
    const url = new URL(location.href);
    if (next === "components") url.searchParams.delete("page");
    else url.searchParams.set("page", next);
    history.replaceState(null, "", url);
    content.current?.scrollTo({ top: 0 });
  }
  function select(next: Entry | undefined) {
    if (!next) return;
    setEntry(next);
    setPage("components");
    setRevision((value) => value + 1);
    const url = new URL(location.href);
    url.searchParams.set("component", next.id);
    url.searchParams.delete("page");
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
              Pond <span>×</span> {page === "filters" ? "Eagle" : "Linear"}
            </strong>
            <span className="local-label">LOCAL</span>
          </a>
          <div className="audit-nav">
            {[
              ["components", "Components", catalog.length],
              ["command-menu", "Command menu", 2],
              ["audit", "Audit notes", 6],
              ["filters", "Eagle filters", 18],
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
          {page === "filters" ? (
            <FilterAuditIndex />
          ) : (
            <>
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
                  const items = filtered.filter(
                    (item) => item.group === category,
                  );
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
            </>
          )}
          <div className="sidebar-foot">
            {page === "filters"
              ? `${matchedFilters.length} matched · ${pondOnlyFilters.length} Pond only`
              : `${available} comparisons · ${catalog.length} components`}
          </div>
        </aside>
        <div className="workspace">
          <header className="audit-topbar">
            <div className="breadcrumb">
              Comparison<span>/</span>
              {page === "components"
                ? entry.id
                : page === "command-menu"
                  ? "Command menu"
                  : page === "audit"
                    ? "Audit notes"
                    : page === "filters"
                      ? "Eagle filters"
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
            ) : page === "command-menu" ? (
              <CommandMenuAudit />
            ) : page === "audit" ? (
              <Audit />
            ) : page === "filters" ? (
              <FilterAudit />
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
