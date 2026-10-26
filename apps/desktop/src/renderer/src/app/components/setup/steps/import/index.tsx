import {
  IconArchiveDownload,
  IconDownload,
  IconFile,
  IconFolderImport,
  IconFolderOpen,
  IconGlobe,
} from "@pond/icons";
import { ContentRow, Loader } from "@pond/ui";
import { type ReactNode, useState } from "react";
import {
  importBookmarks,
  importEagle,
  importEaglePackage,
  importLegacyLibrary,
  importMymind,
  importPaths,
  importPondPackage,
  runNewAction,
} from "@/features/library/components/new-menu/actions";
import styles from "./styles.module.css";

interface ImportSource {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  run: () => Promise<void>;
}

const SOURCES: readonly ImportSource[] = [
  {
    id: "eagle",
    title: "Eagle Library",
    description: "Folders, tags, notes, and ratings come along.",
    icon: <IconDownload />,
    run: importEagle,
  },
  {
    id: "mymind",
    title: "mymind",
    description: "Import your mymind export with its tags and notes.",
    icon: <IconFolderImport />,
    run: importMymind,
  },
  {
    id: "bookmarks",
    title: "Bookmarks",
    description:
      "Import an HTML export from your browser. Folders stay intact.",
    icon: <IconGlobe />,
    run: importBookmarks,
  },
  {
    id: "eagle-package",
    title: "Eagle Package",
    description: "Import a package someone shared from Eagle.",
    icon: <IconArchiveDownload />,
    run: importEaglePackage,
  },
  {
    id: "pond-package",
    title: "Pond Package",
    description: "Import a package someone shared from Pond.",
    icon: <IconArchiveDownload />,
    run: importPondPackage,
  },
  {
    id: "files",
    title: "Files",
    description: "Add images, videos, PDFs, and any other files.",
    icon: <IconFile />,
    run: () => importPaths("files"),
  },
  {
    id: "folders",
    title: "Folders",
    description: "Add a folder and everything inside it.",
    icon: <IconFolderOpen />,
    run: () => importPaths("folders"),
  },
  ...(["ArtStation", "Huaban", "Pixave", "Inboard"] as const).map((source) => ({
    id: source.toLowerCase(),
    title: source,
    description: `Import the files from your ${source} export.`,
    icon: <IconFolderImport />,
    run: () => importLegacyLibrary(source),
  })),
];

export function Imports() {
  const [running, setRunning] = useState<ReadonlySet<string>>(new Set());

  const start = async ({ id, run }: ImportSource) => {
    if (running.has(id)) return;
    setRunning((current) => new Set(current).add(id));
    await runNewAction(run);
    setRunning((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className={styles.grid}>
      {SOURCES.map((source) => {
        const busy = running.has(source.id);
        return (
          <ContentRow.Root
            key={source.id}
            hover="row"
            className={styles.row}
            aria-busy={busy || undefined}
          >
            <ContentRow.Trigger
              aria-label={`Import ${source.title}`}
              disabled={busy}
              onClick={() => void start(source)}
            >
              <ContentRow.Media className={styles.icon}>
                {source.icon}
              </ContentRow.Media>
              <ContentRow.Content>
                <ContentRow.Title>{source.title}</ContentRow.Title>
                <ContentRow.Description>
                  {source.description}
                </ContentRow.Description>
              </ContentRow.Content>
            </ContentRow.Trigger>
            {busy ? <Loader.Spinner className={styles.spinner} /> : null}
          </ContentRow.Root>
        );
      })}
    </div>
  );
}
