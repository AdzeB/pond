import {
  IconBrandArena,
  IconBrandCosmos,
  IconInstagram,
  IconPinterest,
  IconTikTok,
  IconXTwitter,
  IconYoutube,
} from "@pond/icons/social-media";
import Image from "next/image";
import { SaveStatic } from "../_mocks/save-static";
import { demoImage } from "../_mocks/saves";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

const SOURCES = [
  { label: "X", Icon: IconXTwitter },
  { label: "Instagram", Icon: IconInstagram },
  { label: "Pinterest", Icon: IconPinterest },
  { label: "Are.na", Icon: IconBrandArena },
  { label: "Cosmos", Icon: IconBrandCosmos },
  { label: "TikTok", Icon: IconTikTok },
  { label: "YouTube", Icon: IconYoutube },
];

function SourcesRow() {
  return (
    <div className={styles.sources} aria-hidden>
      {SOURCES.map(({ label, Icon }) => (
        <span key={label} className={styles.source} title={label}>
          <Icon width={16} height={16} />
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

export function Save() {
  return (
    <Section.Root id="save">
      <Section.Header>
        <Section.Eyebrow>Save</Section.Eyebrow>
        <Section.Title>Save from anywhere you already are.</Section.Title>
        <Section.Lead>
          One keystroke in the browser sends the current page to your library,
          full media and metadata included.
        </Section.Lead>
      </Section.Header>
      <Section.Grid>
        <Section.Card span={12} fragment={<SaveStatic />} />
        <Section.Card
          span={4}
          title="Eight sources"
          description="X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, and any web article."
          fragment={<SourcesRow />}
        />
        <Section.Card
          span={4}
          title="Full-resolution media"
          description="Originals, not platform thumbnails. Metadata written next to the file."
          fragment={<MediaFragment />}
        />
        <Section.Card
          span={4}
          title="Local hand-off"
          description="The extension talks to 127.0.0.1:41610. Saves never touch a remote server."
          fragment={<HandoffFragment />}
        />
      </Section.Grid>
    </Section.Root>
  );
}
