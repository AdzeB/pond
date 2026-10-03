import { Button } from "@pond/ui";
import { RunStatus } from "@pond/ui/run-status";
import type { AssistantMetadata, AssistantSource } from "@shared/assistant";
import { type ReactNode, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AssistantResponse } from "@/features/agent/components/pane/assistant-response";
import { ConsultedSaves } from "@/features/agent/components/pane/consulted-saves";
import { ResponseError } from "@/features/agent/components/pane/response-error";
import {
  SourceThumbnail,
  sourceDomain,
} from "@/features/agent/components/pane/save-preview";
import { WorkSummary } from "@/features/agent/components/pane/work-summary";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import "../../styles.css";
import editorialPosterUrl from "./media/editorial-poster.svg";
import interfaceStudyUrl from "./media/interface-study.svg";
import printStudioUrl from "./media/print-studio.svg";
import transitMapUrl from "./media/transit-map.svg";
import styles from "./styles.module.css";

type Theme = "light" | "dark";
type PreviewWidth = "pane" | "page";
type DataSet = "sample" | "stress";

interface GallerySource extends AssistantSource {
  source: Save["source"];
  mediaType: Save["mediaType"];
  files: Save["files"];
}

const SOURCE_FIXTURES = {
  screenshot: {
    id: "agent-gallery-screenshot",
    title: "Screenshot 2026-09-28 07:57:20",
    url: "pond:local/agent-gallery-screenshot",
    source: "local",
    description: "A saved screenshot used to inspect thumbnail proportions.",
    mediaType: "image",
    files: [
      {
        kind: "image",
        path: "Screenshot 2026-09-28 07.57.20.png",
        mimeType: "image/png",
        sha256: "d393d2bb",
        size: 2_481_290,
        width: 1728,
        height: 1117,
      },
    ],
  },
  report: {
    id: "agent-gallery-document",
    title: "2026 Brand Guidelines.pdf",
    url: "pond:local/agent-gallery-document",
    source: "local",
    description: "A 48-page identity guide with typography and color usage.",
    mediaType: "file",
    files: [
      {
        kind: "file",
        path: "2026 Brand Guidelines.pdf",
        mimeType: "application/pdf",
        sha256: "f15d6e45",
        size: 18_943_120,
      },
    ],
  },
  arena: {
    id: "agent-gallery-note",
    title: "Wayfinding systems and public information design",
    url: "https://www.are.na/block/32484921",
    source: "arena",
    notes:
      "A reference set focused on legibility, repeated structures, and spatial hierarchy.",
    mediaType: "image",
    files: [],
  },
  cosmos: {
    id: "agent-gallery-long-title",
    title:
      "Editorial layouts with oversized type, narrow columns, and marginal annotations",
    url: "https://www.cosmos.so/e/15298133",
    source: "cosmos",
    description:
      "A deliberately long title for checking wrapping inside a narrow Agent pane.",
    mediaType: "image",
    files: [],
  },
  youtube: {
    id: "agent-gallery-video",
    title: "Inside a Letterpress Studio: Type, Ink, and Paper",
    url: "https://www.youtube.com/watch?v=gallery-fixture",
    source: "youtube",
    description:
      "A 24-minute studio visit covering composition and print production.",
    mediaType: "video",
    files: [],
  },
  instagram: {
    id: "agent-gallery-instagram",
    title: "Transit map studies from this week",
    url: "https://www.instagram.com/p/gallery-fixture/",
    source: "instagram",
    description: "Six map iterations photographed on a studio wall.",
    mediaType: "image",
    files: [],
  },
  reddit: {
    id: "agent-gallery-reddit",
    title: "Restored 1974 wayfinding manual scans",
    url: "https://www.reddit.com/r/graphic_design/comments/gallery_fixture/",
    source: "reddit",
    description: "A discussion with links to a high-resolution scan archive.",
    mediaType: "link",
    files: [],
  },
  pinterest: {
    id: "agent-gallery-pinterest",
    title: "Museum signage reference",
    url: "https://www.pinterest.com/pin/123456789/",
    source: "pinterest",
    description: "Quiet directional signage using one type size and two weights.",
    mediaType: "image",
    files: [],
  },
  twitter: {
    id: "agent-gallery-twitter",
    title: "A useful thread on optical alignment in interface icons",
    url: "https://twitter.com/example/status/123456789",
    source: "twitter",
    description: "Practical examples of visual centering at small sizes.",
    mediaType: "link",
    files: [],
  },
  notes: {
    id: "agent-gallery-notes",
    title: "Agent pane review notes",
    url: "pond:local/agent-gallery-notes",
    source: "local",
    notes:
      "Check row density, thumbnail ratios, source alignment, long-title wrapping, dark mode, and reduced motion.",
    mediaType: "text",
    files: [],
  },
} satisfies Record<string, GallerySource>;

const SOURCES = Object.values(SOURCE_FIXTURES);
const PREVIEW_URLS: Readonly<Record<string, string>> = {
  [SOURCE_FIXTURES.screenshot.id]: interfaceStudyUrl,
  [SOURCE_FIXTURES.arena.id]: transitMapUrl,
  [SOURCE_FIXTURES.cosmos.id]: editorialPosterUrl,
  [SOURCE_FIXTURES.youtube.id]: printStudioUrl,
  [SOURCE_FIXTURES.instagram.id]: transitMapUrl,
  [SOURCE_FIXTURES.pinterest.id]: editorialPosterUrl,
};

function fixtureSave(source: GallerySource): Save {
  return {
    id: source.id,
    source: source.source,
    sourceId: source.id,
    url: source.url,
    title: source.title,
    description: source.description ?? null,
    author: null,
    notes: source.notes ?? null,
    mediaUrl: null,
    mediaType: source.mediaType,
    files: source.files,
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
}

pool.bulkUpsert(SOURCES.map(fixtureSave));

const WORK_METADATA = {
  elapsedMs: 42_300,
  steps: [
    {
      id: "search",
      label: "Searched the library",
      detail: "Found ten relevant Saves across eight sources.",
      status: "complete",
      elapsedMs: 1_800,
    },
    {
      id: "compare",
      label: "Compared the references",
      status: "complete",
      elapsedMs: 8_600,
    },
    {
      id: "write",
      label: "Prepared the response",
      status: "running",
    },
  ],
} satisfies AssistantMetadata;

function Specimen({
  title,
  description,
  children,
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={styles.specimen} data-wide={wide || undefined}>
      <header className={styles["specimen-header"]}>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className={styles.surface}>{children}</div>
    </section>
  );
}

function AgentGallery() {
  const [theme, setTheme] = useState<Theme>("light");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("pane");
  const [dataSet, setDataSet] = useState<DataSet>("stress");
  const [attachedIds, setAttachedIds] = useState<string[]>([]);
  const [event, setEvent] = useState("No interaction yet.");
  const visibleSources =
    dataSet === "stress" ? SOURCES : SOURCES.slice(0, 4);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function openSave(id: string) {
    const source = SOURCES.find((item) => item.id === id);
    setEvent(`Opened ${source?.title ?? id}.`);
  }

  function attach(sources: AssistantSource[]) {
    setAttachedIds((current) => [
      ...new Set([...current, ...sources.map((source) => source.id)]),
    ]);
    setEvent(`Added ${sources[0]?.title ?? "Save"} to the message.`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pond design system</span>
          <h1>Agent component lab</h1>
          <p>
            Style Agent surfaces against stable fixtures without starting a
            conversation.
          </p>
        </div>
        <div className={styles.controls}>
          <div className={styles.control}>
            <span>Theme</span>
            <div>
              {(["light", "dark"] as const).map((value) => (
                <Button
                  key={value}
                  size="xs"
                  variant={theme === value ? "secondary" : "ghost"}
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                >
                  {value === "light" ? "Light" : "Dark"}
                </Button>
              ))}
            </div>
          </div>
          <div className={styles.control}>
            <span>Preview Width</span>
            <div>
              {(["pane", "page"] as const).map((value) => (
                <Button
                  key={value}
                  size="xs"
                  variant={previewWidth === value ? "secondary" : "ghost"}
                  aria-pressed={previewWidth === value}
                  onClick={() => setPreviewWidth(value)}
                >
                  {value === "pane" ? "Pane" : "Page"}
                </Button>
              ))}
            </div>
          </div>
          <div className={styles.control}>
            <span>Data</span>
            <div>
              {(["sample", "stress"] as const).map((value) => (
                <Button
                  key={value}
                  size="xs"
                  variant={dataSet === value ? "secondary" : "ghost"}
                  aria-pressed={dataSet === value}
                  onClick={() => setDataSet(value)}
                >
                  {value === "sample" ? "Sample" : "Stress"}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <p className={styles.event} role="status">
        {event}
      </p>

      <div className={styles.gallery}>
        <Specimen
          title="Consulted Saves"
          description="Rows, thumbnails, long titles, expansion, and attachment state."
          wide
        >
          <div className={styles.frame} data-width={previewWidth}>
            <ConsultedSaves
              sources={visibleSources}
              attachedIds={attachedIds}
              onOpenSave={openSave}
              onAttach={attach}
              renderMedia={(source) => (
                <SourceThumbnail
                  id={source.id}
                  previewUrl={PREVIEW_URLS[source.id]}
                  source={source}
                  size="compact"
                />
              )}
            />
          </div>
        </Specimen>

        <Specimen
          title="Source Thumbnails"
          description="Default, compact, and text-forward fallback treatments."
        >
          <div className={styles.thumbnails}>
            <div>
              <SourceThumbnail
                id={SOURCE_FIXTURES.screenshot.id}
                previewUrl={PREVIEW_URLS[SOURCE_FIXTURES.screenshot.id]}
                source={SOURCE_FIXTURES.screenshot}
              />
              <span>Default</span>
            </div>
            <div>
              <SourceThumbnail
                id={SOURCE_FIXTURES.report.id}
                previewUrl={PREVIEW_URLS[SOURCE_FIXTURES.report.id]}
                source={SOURCE_FIXTURES.report}
                size="compact"
              />
              <span>Compact</span>
            </div>
            <div className={styles.visual}>
              <SourceThumbnail
                id={SOURCE_FIXTURES.arena.id}
                previewUrl={PREVIEW_URLS[SOURCE_FIXTURES.arena.id]}
                source={SOURCE_FIXTURES.arena}
                visual
              />
              <span>Visual</span>
            </div>
          </div>
        </Specimen>

        <Specimen
          title="Run Status"
          description="Working, completed, and stopped response states."
        >
          <div className={styles.stack}>
            <RunStatus>Searching your library</RunStatus>
            <RunStatus state="complete">Finished searching</RunStatus>
            <RunStatus state="stopped">Stopped by you</RunStatus>
          </div>
        </Specimen>

        <Specimen
          title="Citations"
          description="Inline citations with direct Save actions."
          wide
        >
          <div className={styles.frame} data-width={previewWidth}>
            <AssistantResponse
              content="Compare [the screenshot](#save-1) with [the design review](#save-3). The references show how compact rows behave beside longer prose."
              sources={SOURCES}
              onOpenSave={openSave}
            />
          </div>
        </Specimen>

        <Specimen
          title="Work Summary"
          description="Completed activity with mixed step states and durations."
        >
          <WorkSummary metadata={WORK_METADATA} />
        </Specimen>

        <Specimen
          title="Response Errors"
          description="Provider errors with actionable recovery guidance."
        >
          <div className={styles.stack}>
            <ResponseError error="Rate limit exceeded. Too many requests." />
            <ResponseError error="Authentication failed. Invalid API key." />
          </div>
        </Specimen>

        <Specimen
          title="Source Labels"
          description="Hostname extraction and local-source fallbacks."
        >
          <dl className={styles.labels}>
            {SOURCES.map((source) => (
              <div key={source.id}>
                <dt>{source.title}</dt>
                <dd>{sourceDomain(source)}</dd>
              </div>
            ))}
          </dl>
        </Specimen>
      </div>
    </main>
  );
}

declare global {
  interface Window {
    __pondAgentGalleryRoot?: Root;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element missing");
window.__pondAgentGalleryRoot ??= createRoot(rootElement);
window.__pondAgentGalleryRoot.render(<AgentGallery />);
