import {
  IconFolderOutline18,
  IconHashtagOutline18,
  IconMagnifierOutline18,
  IconTagOutline18,
} from "@pond/icons/outline/18";
import { Palette } from "../_fragments/palette";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

const GROUPS = [
  {
    label: "Search",
    rows: [
      {
        id: "search-kitchen-tile",
        icon: <IconMagnifierOutline18 size={14} />,
        label: 'Search "kitchen tile"',
        hint: "in articles, titles, tags",
        keys: ["⏎"],
        selected: true,
      },
      {
        id: "filter-color",
        icon: <IconHashtagOutline18 size={14} />,
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
        icon: <IconFolderOutline18 size={14} />,
        label: "Open library folder",
        keys: ["⌘", "⇧", "L"],
      },
      {
        id: "manage-tags",
        icon: <IconTagOutline18 size={14} />,
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
