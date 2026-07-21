import Image from "next/image";
import { FinderStatic } from "../_mocks/finder-static";
import { LibraryStatic } from "../_mocks/library-static";
import { SaveStatic } from "../_mocks/save-static";
import { demoImage } from "../_mocks/saves";
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

function MediaFragment() {
  return (
    <span className={styles.media} aria-hidden>
      <Image src={demoImage(5)} alt="" width={220} height={165} />
      <span className={styles["media-badge"]}>3024 × 4032 · original</span>
    </span>
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
          title="Ten sources"
          description="X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, Reddit, Threads, and any web article."
          fragment={<SourcesRow />}
        />
        <Section.Card
          span={5}
          spanMd={12}
          title="Full-resolution media"
          description="Originals, not platform thumbnails. Metadata written next to the file."
          fragment={<MediaFragment />}
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
          title="Three layouts"
          description="Waterfall, grid, or justified rows. Thumbnails keep their aspect."
          fragment={<LibraryStatic variant="layouts" />}
        />
        <Section.Card
          span={4}
          title="Continuous zoom"
          description="From 80 to 240 pixels, and the columns re-pack as you drag."
          fragment={<LibraryStatic variant="zoom" />}
        />
        <Section.Card
          span={4}
          title="Filters that stack"
          description="Combine source, kind, tag, and date. Pin a filter to keep it one click away."
          fragment={<LibraryStatic variant="filters" />}
        />
        <Section.Card
          span={7}
          spanMd={12}
          title="A folder you own"
          description="Everything lives in ~/Pond/My Pond.pond. Browse it in Finder; the folder is the source of truth."
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
