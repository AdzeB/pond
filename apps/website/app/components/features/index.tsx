import Image from "next/image";
import { FinderStatic } from "../_mocks/finder-static";
import { LibraryStatic } from "../_mocks/library-static";
import { SaveStatic } from "../_mocks/save-static";
import { SearchStatic } from "../_mocks/search-static";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

/** Same PNG brand logos the desktop app renders from its sources registry. */
const SOURCES = [
  { label: "X", logo: "/demo/logos/twitter.png" },
  { label: "Instagram", logo: "/demo/logos/instagram.png" },
  { label: "Pinterest", logo: "/demo/logos/pinterest.png" },
  { label: "Are.na", logo: "/demo/logos/arena.png" },
  { label: "Cosmos", logo: "/demo/logos/cosmos.png" },
  { label: "TikTok", logo: "/demo/logos/tiktok.png" },
  { label: "YouTube", logo: "/demo/logos/youtube.png" },
  { label: "Reddit", logo: "/demo/logos/reddit.png" },
  { label: "Threads", logo: "/demo/logos/threads.png" },
];

function SourcesRow() {
  return (
    <div className={styles.sources} aria-hidden>
      {SOURCES.map(({ label, logo }) => (
        <span key={label} className={styles.source} title={label}>
          <Image src={logo} alt="" width={16} height={16} />
        </span>
      ))}
    </div>
  );
}

function HandoffFragment() {
  return (
    <span className={styles.handoff} aria-hidden>
      <span className={styles["handoff-line"]}>
        <span className={styles["handoff-verb"]}>POST</span>
        127.0.0.1:41610/save
      </span>
      <span className={styles["handoff-line"]} data-ok>
        <span className={styles["handoff-verb"]}>201</span>
        written to My Pond.pond
      </span>
    </span>
  );
}

function DepthChip({ label }: { label: string }) {
  return (
    <span className={styles.chip} aria-hidden>
      {label}
    </span>
  );
}

export function Features() {
  return (
    <Section.Root id="features">
      <Section.Header>
        <Section.Eyebrow>Features</Section.Eyebrow>
        <Section.Title>Save it once. Keep it forever.</Section.Title>
      </Section.Header>
      <Section.Grid>
        <Section.Card
          span={7}
          spanMd={12}
          title="Save from anywhere"
          description="One keystroke in the browser sends the page to your library, full media and metadata included."
          fragment={<SaveStatic />}
        />
        <Section.Card
          span={5}
          spanMd={12}
          title="Nine platforms, plus the web"
          description="Connect an account and Pond syncs new saves in the background. Drop any web article beside them."
          fragment={<SourcesRow />}
        />
        <Section.Card
          span={5}
          spanMd={12}
          title="Watch feeds and boards"
          description="Follow a public account, playlist, or board. Pond pulls new posts into your library on a schedule."
          fragment={<DepthChip label="Sources → Watch" />}
        />
        <Section.Card
          span={7}
          spanMd={12}
          title="Find anything"
          description="Full-text search, stacking filter tokens, and plain-language questions through AI providers you configure."
          fragment={<SearchStatic />}
        />
        <Section.Card
          span={4}
          title="On-device enrichment"
          description="Captions, OCR, transcripts, and visual search run locally. Nothing leaves your Mac unless you ask."
          fragment={<DepthChip label="Florence · Whisper · CLIP" />}
        />
        <Section.Card
          span={4}
          title="Skills"
          description="Reusable slash prompts in Ask. Type / and run the searches you use most."
          fragment={<DepthChip label="/find · /tag" />}
        />
        <Section.Card
          span={4}
          title="Funnel"
          description="See every save in flight: in progress, failed, and landed. Nothing disappears silently."
          fragment={<DepthChip label="Queue" />}
        />
        <Section.Card
          span={4}
          title="Filters that stack"
          description="Combine source, type, tag, and date with stacking filter tokens."
          fragment={<LibraryStatic variant="filters" />}
        />
        <Section.Card
          span={4}
          title="Three layouts"
          description="Waterfall, grid, or justified rows. Thumbnails keep their aspect."
          fragment={<LibraryStatic variant="layouts" />}
        />
        <Section.Card
          span={7}
          spanMd={12}
          title="A folder you own"
          description="Everything lives in ~/Pond/My Pond.pond. Back it up, move it, or browse it in Finder. The folder is the source of truth."
          fragment={<FinderStatic />}
        />
        <Section.Card
          span={5}
          spanMd={12}
          title="Never touches a server"
          description="The extension talks to a local port only your Mac can reach. Saves stay with you."
          fragment={<HandoffFragment />}
        />
      </Section.Grid>
    </Section.Root>
  );
}
