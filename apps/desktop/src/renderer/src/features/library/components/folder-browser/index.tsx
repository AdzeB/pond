import type { Folder } from "@pond/schema/db";
import { Button } from "@pond/ui";
import type { FolderSummary } from "@shared/folder-contracts";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FolderCustomizeDialog } from "@/features/library/components/folder-customize-dialog";
import {
  FOLDER_ICONS,
  FOLDER_SWATCHES,
  FolderIcon,
  type FolderIconId,
} from "@/features/library/components/folder-sidebar/folder-icons";
import { folderCoverUrl } from "@/features/library/lib/folder-cover";
import {
  enterFolder,
  enterFolders,
} from "@/features/library/operations/enter-folder";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import { folders, useFolders } from "@/features/library/state/folders";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { usePrefs } from "@/features/settings/state/prefs";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { useOrganizationTree } from "../../hooks/use-organization-tree";
import { openOrganizationRenameDialog } from "../../state/organization-rename-dialog";
import { type FolderTool, FolderToolsDialog } from "../folder-tools";
import styles from "./styles.module.css";

function countLabel(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function FolderCard({
  folder,
  summary,
  customCoverSaveId,
  presentation,
  organization,
}: {
  organization: ReturnType<typeof useOrganizationTree>;
  folder: Folder;
  summary: FolderSummary | undefined;
  customCoverSaveId: string | null;
  presentation: {
    icon?: FolderIconId;
    sortKey: string;
    sortDir: "asc" | "desc";
    quickAccess?: boolean;
  };
}) {
  const [customizing, setCustomizing] = useState(false);
  const previewIds = [
    customCoverSaveId,
    ...(summary?.previewSaveIds ?? []),
  ].filter(
    (id, index, ids): id is string => id !== null && ids.indexOf(id) === index,
  );
  const customCover = useSave(customCoverSaveId);
  const previewOffset = customCoverSaveId ? 1 : 0;
  const previewOne = useSave(previewIds[previewOffset]);
  const previewTwo = useSave(previewIds[previewOffset + 1]);
  const previewThree = useSave(previewIds[previewOffset + 2]);
  const previews = [customCover, previewOne, previewTwo, previewThree]
    .flatMap((save) => {
      if (!save) return [];
      const src = folderCoverUrl(save, 360);
      return src ? [{ id: save.id, src }] : [];
    })
    .slice(0, 3);
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
      <SpecContextMenu
        buildItems={() => [
          {
            label: "Open Folder",
            onClick: () => void enterFolder(folder.id),
          },
          {
            type: "checkbox",
            label: "Quick Access",
            checked: presentation.quickAccess ?? false,
            onCheckedChange: (quickAccess) =>
              void saveFolderPresentation(folder.id, { quickAccess }),
          },
          {
            type: "submenu",
            label: "Icon",
            items: FOLDER_ICONS.map((option) => ({
              type: "checkbox",
              label: option.label,
              checked: (presentation.icon ?? "folder") === option.id,
              onCheckedChange: () =>
                void saveFolderPresentation(folder.id, { icon: option.id }),
            })),
          },
          {
            type: "submenu",
            label: "Color",
            items: FOLDER_SWATCHES.map((option) => ({
              type: "checkbox",
              label: option.label,
              checked: folder.color === option.id,
              onCheckedChange: () =>
                void window.pond
                  .query("folders.setColor", {
                    id: folder.id,
                    color: option.id,
                  })
                  .then(() => folders.refresh()),
            })),
          },
          {
            type: "submenu",
            label: "Sort By",
            items: [
              ["savedAt", "Date Saved"],
              ["createdAt", "Date Added"],
              ["title", "Title"],
              ["type", "Type"],
              ["random", "Random"],
            ].map(([sortKey, label]) => ({
              type: "checkbox",
              label,
              checked: presentation.sortKey === sortKey,
              onCheckedChange: () =>
                void saveFolderPresentation(folder.id, { sortKey }),
            })),
          },
          {
            label: "Customize Folder",
            onClick: () => setCustomizing(true),
          },
        ]}
      >
        <Button
          width="full"
          size="lg"
          variant="ghost"
          className={styles.card}
          {...organization.rowProps(folder.id, 0)}
          aria-label={`Open ${folder.name}, ${metadata}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.stopPropagation();
              void enterFolder(folder.id);
            } else organization.rowProps(folder.id, 0).onKeyDown(event);
          }}
          onClick={(event) => {
            if (event.shiftKey || event.metaKey || event.ctrlKey)
              organization.select(folder.id, event);
            else void enterFolder(folder.id);
          }}
          onDoubleClick={() => void enterFolder(folder.id)}
        >
          <span className={styles.cover}>
            {previews.length > 0 ? (
              previews.map((preview, index) => (
                <span
                  className={styles.preview}
                  data-depth={index}
                  key={preview.id}
                >
                  <img src={preview.src} alt="" />
                </span>
              ))
            ) : (
              <span className={styles.fallback}>
                <FolderIcon name={presentation.icon} />
              </span>
            )}
          </span>
          <span className={styles.name}>{folder.name}</span>
          <span className={styles.metadata}>{metadata}</span>
        </Button>
      </SpecContextMenu>
      {customizing ? (
        <FolderCustomizeDialog
          folder={folder}
          folderIcon={presentation.icon}
          onClose={() => setCustomizing(false)}
        />
      ) : null}
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
  const [folderTool, setFolderTool] = useState<FolderTool | null>(null);
  const organization = useOrganizationTree(children, () => {});
  const [summaries, setSummaries] = useState<FolderSummary[]>([]);
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
          const previews = summaryById.get(folder.id)?.previewSaveIds ?? [];
          return [custom, ...previews].flatMap((id) =>
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
      {folderTool ? (
        <FolderToolsDialog
          tool={folderTool}
          onClose={() => setFolderTool(null)}
        />
      ) : null}
      {children.length > 0 ? (
        <section className={styles.section} aria-labelledby="subfolders-title">
          <div className={styles.header}>
            <h2 id="subfolders-title">Subfolders ({children.length})</h2>
            {loading ? <span role="status">Loading subfolders</span> : null}
            {error ? (
              <span role="alert">Couldn&apos;t load folder details.</span>
            ) : null}
          </div>
          {organization.selected.length ? (
            <fieldset
              className={styles.selection}
              aria-label="Selected folders"
            >
              <span>{organization.selected.length} folders selected</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => enterFolders(organization.selected, true)}
              >
                Open Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setFolderTool({
                    kind: "move",
                    id: organization.selected[0] ?? "",
                    ids: organization.selected,
                    name: "Selected Folders",
                  })
                }
              >
                Move
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  openOrganizationRenameDialog("folders", organization.selected)
                }
              >
                Rename
              </Button>
            </fieldset>
          ) : null}
          <div
            ref={organization.root}
            role="tree"
            aria-label="Subfolders"
            aria-multiselectable
          >
            <ul className={styles.grid}>
              {children.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  organization={organization}
                  summary={summaryById.get(folder.id)}
                  customCoverSaveId={
                    folderViews[folder.id]?.coverSaveId ?? null
                  }
                  presentation={{
                    icon: folderViews[folder.id]?.icon,
                    sortKey: folderViews[folder.id]?.sortKey ?? "savedAt",
                    sortDir: folderViews[folder.id]?.sortDir ?? "desc",
                    quickAccess: folderViews[folder.id]?.quickAccess,
                  }}
                />
              ))}
            </ul>
          </div>
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
    </div>
  );
}
