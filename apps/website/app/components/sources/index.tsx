import {
  IconBrandArena,
  IconBrandCosmos,
  IconInstagram,
  IconPinterest,
  IconTikTok,
  IconXTwitter,
  IconYoutube,
} from "@pond/icons/social-media";
import { SourcePill } from "../_fragments/source-pill";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

const SOURCES = [
  {
    name: "X",
    icon: IconXTwitter,
    description: "Tweets and threads.",
    hex: "#0f0f0f",
  },
  {
    name: "Instagram",
    icon: IconInstagram,
    description: "Posts and reels.",
    hex: "#262626",
  },
  {
    name: "Pinterest",
    icon: IconPinterest,
    description: "Pins and boards.",
    hex: "#e60023",
  },
  {
    name: "Are.na",
    icon: IconBrandArena,
    description: "Blocks and channels.",
    hex: "#171717",
  },
  {
    name: "Cosmos",
    icon: IconBrandCosmos,
    description: "Clusters and tiles.",
    hex: "#1b1b1b",
  },
  {
    name: "TikTok",
    icon: IconTikTok,
    description: "Favorites and likes.",
    hex: "#0f0f0f",
  },
  {
    name: "YouTube",
    icon: IconYoutube,
    description: "Watch later.",
    hex: "#ff0033",
  },
] as const;

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" {...props}>
      <title>Web article</title>
      <circle
        cx="9"
        cy="9"
        r="6.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M9 2.75c2.2 2.2 2.2 10.3 0 12.5M9 2.75c-2.2 2.2-2.2 10.3 0 12.5M2.75 9h12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function Sources() {
  return (
    <Section.Root id="sources">
      <Section.Header>
        <Section.Eyebrow>Sources</Section.Eyebrow>
        <Section.Title>Wherever you save, Pond keeps it.</Section.Title>
        <Section.Lead>
          One library across the apps you actually use.
        </Section.Lead>
      </Section.Header>
      <div className={styles.grid}>
        {SOURCES.map((source) => (
          <SourcePill key={source.name} {...source} />
        ))}
        <SourcePill
          name="Articles"
          icon={GlobeIcon}
          description="Any web article."
          hex="#2b2b2b"
        />
      </div>
    </Section.Root>
  );
}
