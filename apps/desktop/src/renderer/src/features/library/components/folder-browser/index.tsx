import type { Folder } from "@pond/schema/db";
import { Button } from "@pond/ui";
import type { FolderSummary } from "@shared/folder-contracts";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FolderIcon } from "@/features/library/components/folder-sidebar/folder-icons";
import { FolderUnlockDialog } from "@/features/library/components/folder-unlock-dialog";
import { folderCoverUrl } from "@/features/library/lib/folder-cover";
import {
  enterFolder,
  type FolderUnlockRequest,
} from "@/features/library/operations/enter-folder";
import { useFolders } from "@/features/library/state/folders";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { usePrefs } from "@/features/settings/state/prefs";
import styles from "./styles.module.css";

function countLabel(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function FolderCard({
  folder,
  summary,
  customCoverSaveId,
  icon,
  onUnlockRequired,
}: {
  folder: Folder;
  summary: FolderSummary | undefined;
  customCoverSaveId: string | null;
  icon?: string;
  onUnlockRequired: (request: FolderUnlockRequest) => void;
}) {
  const customCover = useSave(customCoverSaveId);
  const automaticCover = useSave(summary?.automaticCoverSaveId);
  const src =
    (customCover ? folderCoverUrl(customCover, 360) : null) ??
    (automaticCover ? folderCoverUrl(automaticCover, 360) : null);
  const directSaveCount = summary?.directSaveCount ?? 0;
  const childFolderCount = summary?.childFolderCount ?? 0;
  const metadata =
    directSaveCount === 0 && childFolderCount === 0
      ? "Empty"
      : [
          directSaveCount > 0
            ? countLabel(directSaveCount, "item", "items")
            : null,
          childFolderCount > 0
            ? countLabel(childFolderCount, "subfolder", "subfolders")
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <li>
      <Button
        width="full"
        size="lg"
        variant="ghost"
        className={styles.card}
        aria-label={`Open ${folder.name}, ${metadata}`}
        onClick={() => void enterFolder(folder.id, onUnlockRequired)}
      >
        <span className={styles.cover}>
          {src ? (
            <img src={src} alt="" />
          ) : (
            <span className={styles.fallback}>
              <FolderIcon name={icon} />
            </span>
          )}
        </span>
        <span className={styles.name}>{folder.name}</span>
        <span className={styles.metadata}>{metadata}</span>
      </Button>
    </li>
  );
}

export function FolderBrowser({
  parentId,
  contentCount,
  children: content,
}: {
  parentId: string;
  contentCount: number;
  children?: ReactNode;
}) {
  const folders = useFolders();
  const [folderViews] = usePrefs("folderViews");
  const children = useMemo(
    () => folders.filter((folder) => folder.parentId === parentId),
    [folders, parentId],
  );
  const [summaries, setSummaries] = useState<FolderSummary[]>([]);
  const [unlock, setUnlock] = useState<
    (FolderUnlockRequest & { name: string }) | null
  >(null);
  const [loading, setLoading] = useState(children.length > 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (children.length === 0) {
      setSummaries([]);
      setLoading(false);
      setError(false);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const next = await window.pond.query("folders.summaries", { parentId });
        if (!active) return;
        setSummaries(next);
        const summaryById = new Map(
          next.map((summary) => [summary.id, summary]),
        );
        const coverIds = children.flatMap((folder) => {
          const custom = folderViews[folder.id]?.coverSaveId;
          const automatic = summaryById.get(folder.id)?.automaticCoverSaveId;
          return [custom, automatic].flatMap((id) =>
            id === null || id === undefined ? [] : [id],
          );
        });
        await ensureSaves(coverIds);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const unsubscribe = window.pond.onSyncAction((event) => {
      if (
        event.modelName === "folder" ||
        event.modelName === "save_folder" ||
        event.modelName === "save"
      ) {
        void load();
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [children, folderViews, parentId]);

  const summaryById = new Map(
    summaries.map((summary) => [summary.id, summary]),
  );

  return (
    <div className={styles.root}>
      {children.length > 0 ? (
        <section className={styles.section} aria-labelledby="subfolders-title">
          <div className={styles.header}>
            <h2 id="subfolders-title">Subfolders ({children.length})</h2>
            {loading ? <span role="status">Loading subfolders</span> : null}
            {error ? (
              <span role="alert">Couldn&apos;t load folder details.</span>
            ) : null}
          </div>
          <ul className={styles.grid}>
            {children.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                summary={summaryById.get(folder.id)}
                customCoverSaveId={folderViews[folder.id]?.coverSaveId ?? null}
                icon={folderViews[folder.id]?.icon}
                onUnlockRequired={(request) =>
                  setUnlock({ ...request, name: folder.name })
                }
              />
            ))}
          </ul>
        </section>
      ) : null}
      {content ? (
        <section className={styles.section} aria-labelledby="contents-title">
          <div className={styles.header}>
            <h2 id="contents-title">
              Contents ({contentCount.toLocaleString()})
            </h2>
          </div>
          {content}
        </section>
      ) : null}
      {unlock ? (
        <FolderUnlockDialog
          folderId={unlock.unlockId}
          folderName={unlock.name}
          hint={unlock.hint}
          onClose={() => setUnlock(null)}
          onUnlocked={() => {
            const targetId = unlock.targetId;
            setUnlock(null);
            void enterFolder(targetId, (request) =>
              setUnlock({ ...request, name: unlock.name }),
            );
          }}
        />
      ) : null}
    </div>
  );
}
