import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

function FolderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" {...props}>
      <title>Library folder</title>
      <path
        d="M2.5 5a1 1 0 0 1 1-1h3l1.5 1.5h6.5a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" {...props}>
      <title>SQLite index</title>
      <ellipse
        cx="9"
        cy="4.5"
        rx="5.5"
        ry="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.5 4.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.5 9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ExtensionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" {...props}>
      <title>Browser extension</title>
      <path
        d="M3.5 6h11v7.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 6V4.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="6.25" cy="4.75" r="0.6" fill="currentColor" />
      <circle cx="8.5" cy="4.75" r="0.6" fill="currentColor" />
    </svg>
  );
}

function ServerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" {...props}>
      <title>Local server</title>
      <rect
        x="2.75"
        y="3.5"
        width="12.5"
        height="4.5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="2.75"
        y="10"
        width="12.5"
        height="4.5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="5.5" cy="5.75" r="0.6" fill="currentColor" />
      <circle cx="5.5" cy="12.25" r="0.6" fill="currentColor" />
    </svg>
  );
}

function RebuildIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" {...props}>
      <title>Rebuildable</title>
      <path
        d="M14.5 9a5.5 5.5 0 1 1-1.7-4M14.5 4v3.5H11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BLOCKS = [
  {
    icon: FolderIcon,
    title: "Library folder",
    body: (
      <>
        Your saves live in <code>~/Pond/My Pond.pond</code>, owned by you.
      </>
    ),
  },
  {
    icon: DatabaseIcon,
    title: "SQLite index",
    body: <>A fast local index for browsing, filtering, and search.</>,
  },
  {
    icon: ExtensionIcon,
    title: "Browser extension",
    body: <>One keystroke to save the current tab.</>,
  },
  {
    icon: ServerIcon,
    title: "Local server",
    body: (
      <>
        The extension talks to <code>127.0.0.1:41610</code>. Nothing leaves the
        machine.
      </>
    ),
  },
  {
    icon: RebuildIcon,
    title: "Rebuildable",
    body: (
      <>
        If the index is gone, Pond rebuilds it from the library on next launch.
      </>
    ),
  },
] as const;

export function LocalFirst() {
  return (
    <Section.Root id="local-first">
      <Section.Header>
        <Section.Eyebrow>Architecture</Section.Eyebrow>
        <Section.Title>Local is the source of truth.</Section.Title>
        <Section.Lead>
          Pond runs on your Mac. Nothing leaves the machine unless you ask it
          to.
        </Section.Lead>
      </Section.Header>
      <div className={styles.grid}>
        {BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <article key={block.title} className={styles.block}>
              <div className={styles["block-icon"]}>
                <Icon width={18} height={18} fill="none" />
              </div>
              <h3 className={styles["block-title"]}>{block.title}</h3>
              <p className={styles["block-body"]}>{block.body}</p>
            </article>
          );
        })}
      </div>
    </Section.Root>
  );
}
