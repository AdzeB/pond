import { Palette } from "../_fragments/palette";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" {...props}>
      <title>Search</title>
      <circle
        cx="7"
        cy="7"
        r="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="m10.6 10.6 3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" {...props}>
      <title>Tag</title>
      <path
        d="M2.5 7.5V3a.5.5 0 0 1 .5-.5h4.5L13 8l-5.5 5.5L2.5 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="5.25" cy="5.25" r="0.75" fill="currentColor" />
    </svg>
  );
}

function FolderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" {...props}>
      <title>Folder</title>
      <path
        d="M2 4.5a1 1 0 0 1 1-1h3.2l1.4 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" {...props}>
      <title>Hash</title>
      <path
        d="M6 2.5 4.5 13.5M11.5 2.5 10 13.5M2.5 6h11M2 10h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const GROUPS = [
  {
    label: "Search",
    rows: [
      {
        id: "search-kitchen-tile",
        icon: <SearchIcon width={14} height={14} />,
        label: 'Search "kitchen tile"',
        hint: "in articles, titles, tags",
        keys: ["⏎"],
        selected: true,
      },
      {
        id: "filter-color",
        icon: <HashIcon width={14} height={14} />,
        label: 'Filter by tag "color"',
        hint: "42 saves",
      },
    ],
  },
  {
    label: "Library",
    rows: [
      {
        id: "open-library",
        icon: <FolderIcon width={14} height={14} />,
        label: "Open library folder",
        keys: ["⌘", "⇧", "L"],
      },
      {
        id: "manage-tags",
        icon: <TagIcon width={14} height={14} />,
        label: "Manage tags & groups",
        keys: ["⌘", "T"],
      },
    ],
  },
];

export function Search() {
  return (
    <Section.Root id="search">
      <Section.Header>
        <Section.Eyebrow>Search</Section.Eyebrow>
        <Section.Title>Open the palette. Find anything.</Section.Title>
        <Section.Lead>
          Every action has a key. Search is the canonical fast path.
        </Section.Lead>
      </Section.Header>
      <Section.Grid>
        <Section.Card span={7} spanMd={6} padded={false}>
          <div className={styles.fragment}>
            <Palette query={"kitchen tile"} groups={GROUPS} />
          </div>
          <div className={styles.body}>
            <h3 className={styles.title}>One palette, every action.</h3>
            <p className={styles.description}>
              Press ⌘K to open. Type to filter. Hit ⏎ to act.
            </p>
          </div>
        </Section.Card>
        <div className={styles["sub-column"]}>
          <Section.Card
            span={5}
            spanMd={6}
            title="Full-text search"
            description="Search the body of saved articles, not only the title or URL."
          />
          <Section.Card
            span={5}
            spanMd={6}
            title="Tags & filters"
            description="Combine tags, sources, and kinds. The palette knows your vocabulary."
          />
          <Section.Card
            span={5}
            spanMd={6}
            title="Recents"
            description="Recent saves and recent filters sit at the top by default."
          />
          <Section.Card
            span={5}
            spanMd={6}
            title="Keyboard-first"
            description="Every menu, button, and view has a key. The GUI is the speed cap, not the goal."
          />
        </div>
      </Section.Grid>
    </Section.Root>
  );
}
