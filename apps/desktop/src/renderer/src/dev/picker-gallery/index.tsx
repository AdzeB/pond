import { useEffect, useMemo, useState } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
  FolderMenu,
  type FolderMenuItem,
} from "@/features/saves/components/detail/folder-menu";
import { TagMenuView } from "@/features/tags/components/menu";
import type { TagGroupRow } from "@/features/tags/state/tag-groups";
import type { TagRow } from "@/features/tags/state/tags";
import "../../styles.css";
import styles from "./styles.module.css";

type Theme = "light" | "dark";

function EagleReferenceFrame({
  picker,
  theme,
  resetKey,
}: {
  picker: "folder" | "tag";
  theme: Theme;
  resetKey: number;
}) {
  return (
    <iframe
      key={`${picker}-${theme}-${resetKey}`}
      className={styles.referenceFrame}
      title={`Extracted Eagle 4 ${picker} picker`}
      src={`/__eagle_reference__/index.html?embed=1&picker=${picker}&theme=${theme}`}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

const INITIAL_FOLDERS: readonly FolderMenuItem[] = [
  { id: "inbox", name: "Inbox", count: 3 },
  { id: "inspiration", name: "Inspiration", count: 1 },
  {
    id: "brand",
    name: "Brand systems and identity references with a deliberately long title",
    parentId: "inspiration",
    count: 0,
  },
  {
    id: "editorial",
    name: "Editorial",
    parentId: "inspiration",
    count: 3,
  },
  {
    id: "magazines",
    name: "Independent magazines",
    parentId: "editorial",
    count: 0,
  },
  { id: "projects", name: "Projects", count: 0 },
  {
    id: "pond",
    name: "Pond desktop",
    parentId: "projects",
    count: 1,
  },
  {
    id: "research",
    name: "Research and competitive analysis",
    parentId: "pond",
    count: 0,
  },
  { id: "archive", name: "Archive", count: 0 },
];

const TAGS: readonly TagRow[] = [
  {
    id: "1",
    name: "Art Direction",
    starred: true,
    description: null,
    lastUsedAt: 12,
    usageCount: 41,
    createdAt: 1,
  },
  {
    id: "2",
    name: "Brand Identity",
    starred: true,
    description: null,
    lastUsedAt: 11,
    usageCount: 32,
    createdAt: 2,
  },
  {
    id: "3",
    name: "Editorial Design",
    starred: false,
    description: null,
    lastUsedAt: 10,
    usageCount: 28,
    createdAt: 3,
  },
  {
    id: "4",
    name: "Interface",
    starred: false,
    description: null,
    lastUsedAt: 9,
    usageCount: 54,
    createdAt: 4,
  },
  {
    id: "5",
    name: "Motion",
    starred: false,
    description: null,
    lastUsedAt: 8,
    usageCount: 18,
    createdAt: 5,
  },
  {
    id: "6",
    name: "Photography",
    starred: false,
    description: null,
    lastUsedAt: 7,
    usageCount: 67,
    createdAt: 6,
  },
  {
    id: "7",
    name: "Typography",
    starred: false,
    description: null,
    lastUsedAt: 6,
    usageCount: 73,
    createdAt: 7,
  },
  {
    id: "8",
    name: "Wayfinding and environmental graphics",
    starred: false,
    description: null,
    lastUsedAt: null,
    usageCount: 12,
    createdAt: 8,
  },
  {
    id: "9",
    name: "Packaging",
    starred: false,
    description: null,
    lastUsedAt: null,
    usageCount: 21,
    createdAt: 9,
  },
  {
    id: "10",
    name: "Product References",
    starred: false,
    description: null,
    lastUsedAt: null,
    usageCount: 36,
    createdAt: 10,
  },
  {
    id: "11",
    name: "Illustration",
    starred: false,
    description: null,
    lastUsedAt: null,
    usageCount: 19,
    createdAt: 11,
  },
  {
    id: "12",
    name: "Architecture",
    starred: false,
    description: null,
    lastUsedAt: null,
    usageCount: 14,
    createdAt: 12,
  },
];

const TAG_GROUPS: readonly TagGroupRow[] = [
  {
    id: "discipline",
    name: "Discipline",
    description: null,
    color: "#7c6fe8",
    sortOrder: 0,
    collapsed: false,
    tagIds: ["1", "2", "3", "4", "5", "7", "11"],
    tagNames: [
      "Art Direction",
      "Brand Identity",
      "Editorial Design",
      "Interface",
      "Motion",
      "Typography",
      "Illustration",
    ],
  },
  {
    id: "medium",
    name: "Medium",
    description: null,
    color: "#dc7d45",
    sortOrder: 1,
    collapsed: false,
    tagIds: ["6", "8", "9", "12"],
    tagNames: [
      "Photography",
      "Wayfinding and environmental graphics",
      "Packaging",
      "Architecture",
    ],
  },
  {
    id: "workflow",
    name: "Workflow",
    description: null,
    color: "#4fa47a",
    sortOrder: 2,
    collapsed: false,
    tagIds: ["10"],
    tagNames: ["Product References"],
  },
];

const INITIAL_APPLIED = new Set(["art direction", "interface"]);
const INITIAL_MIXED = new Set(["typography", "photography"]);

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange(value: T): void;
}) {
  return (
    <fieldset className={styles.control}>
      <legend>{label}</legend>
      <div className={styles.segments}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function PickerGallery() {
  const [theme, setTheme] = useState<Theme>("light");
  const [referenceResetKey, setReferenceResetKey] = useState(0);
  const [folders, setFolders] = useState(() =>
    INITIAL_FOLDERS.map((folder) => ({ ...folder })),
  );
  const [applied, setApplied] = useState<ReadonlySet<string>>(
    () => new Set(INITIAL_APPLIED),
  );
  const [mixed, setMixed] = useState<ReadonlySet<string>>(
    () => new Set(INITIAL_MIXED),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const folderSummary = useMemo(
    () => folders.filter((folder) => folder.count > 0).length,
    [folders],
  );

  function toggleFolder(id: string) {
    setFolders((current) =>
      current.map((folder) =>
        folder.id === id
          ? { ...folder, count: folder.count === 3 ? 0 : 3 }
          : folder,
      ),
    );
  }

  function toggleTag(name: string) {
    const key = name.toLowerCase();
    setMixed((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setApplied((current) => {
      const next = new Set(current);
      if (mixed.has(key) || !next.has(key)) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function reset() {
    setFolders(INITIAL_FOLDERS.map((folder) => ({ ...folder })));
    setApplied(new Set(INITIAL_APPLIED));
    setMixed(new Set(INITIAL_MIXED));
    setReferenceResetKey((current) => current + 1);
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Pond design system</span>
          <h1>Assignment picker lab</h1>
          <p>
            Folder hierarchy and the tag grid share one search-focused panel
            system while retaining their own selection models.
          </p>
        </div>
        <div className={styles.controls}>
          <SegmentedControl<Theme>
            label="Theme"
            value={theme}
            options={["light", "dark"] as const}
            onChange={setTheme}
          />
          <button type="button" className={styles.reset} onClick={reset}>
            Reset state
          </button>
        </div>
      </header>

      <section className={styles.comparison} aria-label="Picker comparison">
        <section className={styles.comparisonSet}>
          <header className={styles.comparisonHeader}>
            <div>
              <span className={styles.kicker}>Hierarchy</span>
              <h2>Folders</h2>
            </div>
            <span className={styles.status}>{folderSummary} assigned</span>
          </header>
          <p className={styles.description}>
            Compare density, hierarchy, scope controls, and truncation. The
            reference runs Eagle's original picker code against local fixture
            data.
          </p>
          <div className={styles.versionGrid}>
            <article className={styles.specimen}>
              <header>
                <div>
                  <span className={styles.version}>Reference</span>
                  <h3>Eagle 4</h3>
                </div>
                <span className={styles.badge}>Extracted behavior</span>
              </header>
              <div className={`${styles.panelFrame} ${styles.folderFrame}`}>
                <EagleReferenceFrame
                  picker="folder"
                  theme={theme}
                  resetKey={referenceResetKey}
                />
              </div>
            </article>

            <article className={styles.specimen}>
              <header>
                <div>
                  <span className={styles.version}>Implementation</span>
                  <h3>Pond</h3>
                </div>
                <span className={styles.badge}>Current proposal</span>
              </header>
              <div className={`${styles.panelFrame} ${styles.folderFrame}`}>
                <FolderMenu
                  folders={folders}
                  selectionSize={3}
                  onToggle={(folder) => toggleFolder(folder.id)}
                  onCreate={(name) =>
                    setFolders((current) => [
                      ...current,
                      { id: `new-${current.length}`, name, count: 3 },
                    ])
                  }
                />
              </div>
            </article>
          </div>
        </section>

        <section className={styles.comparisonSet}>
          <header className={styles.comparisonHeader}>
            <div>
              <span className={styles.kicker}>Classification</span>
              <h2>Tags</h2>
            </div>
            <span className={styles.status}>
              {applied.size} selected · {mixed.size} mixed
            </span>
          </header>
          <p className={styles.description}>
            Compare the grouped tag grid and ellipsis behavior. Pond keeps the
            assignment surface focused on search and selection without a
            secondary navigation rail.
          </p>
          <div className={styles.versionGrid}>
            <article className={styles.specimen}>
              <header>
                <div>
                  <span className={styles.version}>Reference</span>
                  <h3>Eagle 4</h3>
                </div>
                <span className={styles.badge}>Extracted behavior</span>
              </header>
              <div className={`${styles.panelFrame} ${styles.tagFrame}`}>
                <EagleReferenceFrame
                  picker="tag"
                  theme={theme}
                  resetKey={referenceResetKey}
                />
              </div>
            </article>

            <article className={styles.specimen}>
              <header>
                <div>
                  <span className={styles.version}>Implementation</span>
                  <h3>Pond</h3>
                </div>
                <span className={styles.badge}>Current proposal</span>
              </header>
              <div className={`${styles.panelFrame} ${styles.tagFrame}`}>
                <TagMenuView
                  tags={TAGS}
                  groups={TAG_GROUPS}
                  appliedKeys={applied}
                  mixedKeys={mixed}
                  recommendedNames={["Editorial Design", "Product References"]}
                  onToggle={toggleTag}
                  gridSize="md"
                  showCounts
                />
              </div>
            </article>
          </div>
        </section>
      </section>

      <footer className={styles.footer}>
        Search remains focused · active rows use aria-activedescendant · long
        names truncate in both pickers
      </footer>
    </main>
  );
}

declare global {
  interface Window {
    __pondPickerGalleryRoot?: Root;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element missing");
window.__pondPickerGalleryRoot ??= createRoot(rootElement);
window.__pondPickerGalleryRoot.render(<PickerGallery />);
