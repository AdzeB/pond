import { IconCircleInfo, IconPlus, IconSliders, IconXmark } from "@pond/icons";
import { Button, Pane, PickerPanel, Tabs } from "@pond/ui";
import { mediaEmbeddingVersion } from "@shared/embeddings";
import { useEffect, useMemo, useState } from "react";
import { FolderMenu } from "@/features/saves/components/detail/folder-menu";
import { SaveInfoSections } from "@/features/saves/components/detail/info-sections";
import { KebabMenu } from "@/features/saves/components/detail/kebab";
import { RatingStars } from "@/features/saves/components/detail/rating";
import { RelatedSaves } from "@/features/saves/components/detail/related-saves";
import { useSaves } from "@/features/saves/hooks/use-saves";
import { ensureSaves, reloadSaves } from "@/features/saves/lib/ensure-saves";
import {
  type SaveInspectorTab,
  saveLibraryBridge,
} from "@/features/saves/lib/library-bridge";
import {
  deriveTypeLabel,
  pickPrimaryFile,
} from "@/features/saves/lib/media/units";
import { bulkMutation, mutateSave } from "@/features/saves/lib/mutate";
import { pool } from "@/features/saves/state/pool";
import { useSaveViewerFileIndex } from "@/features/saves/state/save-viewer";
import { TagMenu } from "@/features/tags";
import { Section } from "@/shared/components/inspector-section";
import { PropertyList } from "@/shared/components/property-list";
import { useStableStrings } from "@/shared/hooks/use-stable-array";
import { errorCopy } from "@/shared/lib/error-copy";
import type { FolderIconId } from "@/shared/lib/folder-icons";
import { formatBytes } from "@/shared/lib/format";
import { usePrefs } from "@/shared/state/prefs";
import { AssignmentChip } from "./chip";
import { SavePreviews } from "./previews";
import styles from "./styles.module.css";
import { type InspectorDrafts, InspectorTextField } from "./text-field";

const INSPECTOR_TABS = [
  { id: "organize", label: "Organize", Icon: IconSliders },
  { id: "info", label: "Properties", Icon: IconCircleInfo },
] as const;

export interface SaveInspectorProps {
  saveId: string;
  saveIds?: readonly string[];
  folders?: readonly {
    id: string;
    name: string;
    parentId?: string | null;
    count: number;
    icon?: FolderIconId;
    color?: string | null;
  }[];
  tab?: SaveInspectorTab;
}

type InspectorFolder = NonNullable<SaveInspectorProps["folders"]>[number];
const EMPTY_INSPECTOR_FOLDERS: readonly InspectorFolder[] = [];

interface FolderOption extends InspectorFolder {
  path: string;
}

function folderOptions(folders: readonly InspectorFolder[]): FolderOption[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path = (folder: InspectorFolder) => {
    const parts: string[] = [];
    const seen = new Set<string>();
    let current: InspectorFolder | undefined = folder;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      parts.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return parts.join(" / ");
  };
  return folders.map((folder) => ({ ...folder, path: path(folder) }));
}

export function SaveInspector({
  saveId,
  saveIds,
  folders = EMPTY_INSPECTOR_FOLDERS,
  tab = "organize",
}: SaveInspectorProps) {
  const ids = useStableStrings(saveIds?.length ? saveIds : [saveId]);
  const targetKey = JSON.stringify(ids);
  const available = useSaves();
  const [drafts] = useState<InspectorDrafts>(() => new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [activeTab, setActiveTab] = useState<SaveInspectorTab>(tab);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagPickerPreferences] = usePrefs("tagPicker");
  const [failure, setFailure] = useState<{
    message: string;
    retry(): Promise<void>;
  } | null>(null);
  const fileIndex = useSaveViewerFileIndex();
  const byId = new Map(available.map((save) => [save.id, save]));
  const saves = ids.flatMap((id) => {
    const save = byId.get(id);
    return save ? [save] : [];
  });
  const complete = saves.length === ids.length;
  const single = ids.length === 1 ? saves[0] : undefined;
  const folderEntries = useMemo(() => folderOptions(folders), [folders]);

  useEffect(() => setActiveTab(tab), [tab]);

  useEffect(() => {
    void attempt;
    let active = true;
    setLoadError(null);
    const targets = ids;
    void ensureSaves(targets)
      .then(() => {
        if (targets.some((id) => !pool.get(id)))
          throw new Error("A selected Save is no longer available.");
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      });
    return () => {
      active = false;
    };
  }, [ids, attempt]);

  async function run(action: () => Promise<void>) {
    setFailure(null);
    try {
      await action();
    } catch (error) {
      setFailure({
        message: errorCopy(error, "Couldn't update the selection."),
        retry: action,
      });
    }
  }
  const notes = saves.every((save) => save.notes === saves[0]?.notes)
    ? (saves[0]?.notes ?? "")
    : null;
  const sourceUrls = saves.map((save) =>
    /^https?:\/\//.test(save.url ?? "") ? save.url : "",
  );
  const url = sourceUrls.every((url) => url === sourceUrls[0])
    ? (sourceUrls[0] ?? "")
    : null;
  const rating = saves.every((save) => save.rating === saves[0]?.rating)
    ? (saves[0]?.rating ?? 0)
    : null;
  const tagCounts = new Map<string, { name: string; count: number }>();
  for (const save of saves)
    for (const name of new Set(save.tags)) {
      const key = name.toLowerCase();
      const previous = tagCounts.get(key);
      tagCounts.set(key, {
        name: previous?.name ?? name,
        count: (previous?.count ?? 0) + 1,
      });
    }
  const applied = new Set(
    [...tagCounts]
      .filter(([, tag]) => tag.count === ids.length)
      .map(([key]) => key),
  );
  async function changeTag(name: string, remove = false) {
    const targets = [...ids];
    await bulkMutation(targets, {
      kind: "tags",
      tags: [name],
      mode: remove || applied.has(name.toLowerCase()) ? "remove" : "add",
    });
    await reloadSaves(targets);
  }

  async function assignFolder(folderId: string, add: boolean) {
    await window.pond.query("folders.assign", {
      saveIds: [...ids],
      addIds: add ? [folderId] : [],
      removeIds: add ? [] : [folderId],
    });
    if (add) saveLibraryBridge.rememberFolderDestinations([folderId]);
    await saveLibraryBridge.refreshFolders();
  }

  function createFolder(rawName: string) {
    const name = rawName.trim();
    let createdId: string | null = null;
    void run(async () => {
      if (!createdId)
        createdId = (await window.pond.query("folders.create", { name })).id;
      await assignFolder(createdId, true);
    });
  }

  function toggleFolder(option: InspectorFolder) {
    void run(() => assignFolder(option.id, option.count !== ids.length));
  }

  return (
    <Tabs.Root
      className={styles.root}
      data-save-inspector={saveId}
      value={activeTab}
      onValueChange={(value) => {
        if (value !== "organize" && value !== "info") return;
        setActiveTab(value);
        saveLibraryBridge.setInspectorTab(value);
      }}
    >
      <Pane.Header
        title={
          <Tabs.List
            aria-label="Save details"
            activateOnFocus
            className={styles.tabs}
          >
            {INSPECTOR_TABS.map(({ id, label, Icon }) => (
              <Tabs.Tab
                aria-label={label}
                className={styles.tab}
                key={id}
                title={label}
                value={id}
              >
                <Icon aria-hidden="true" className={styles.icon} />
                <span className={styles.label}>{label}</span>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        }
      >
        {single ? <KebabMenu save={single} fileIndex={fileIndex} /> : null}
        <Button
          type="button"
          icon
          size="sm"
          variant="ghost"
          aria-label="Close Details"
          onClick={saveLibraryBridge.closeRightPane}
        >
          <IconXmark />
        </Button>
      </Pane.Header>
      <Pane.Body className={styles.scroll}>
        {loadError ? (
          <div role="alert">
            {loadError}
            <Button onClick={() => setAttempt((value) => value + 1)}>
              Try Again
            </Button>
          </div>
        ) : !complete ? (
          <p role="status">Loading save details</p>
        ) : null}
        {failure ? (
          <div role="alert">
            {failure.message}
            <Button onClick={() => void run(failure.retry)}>Try Again</Button>
          </div>
        ) : null}
        {complete ? (
          <>
            <Tabs.Panel value="organize">
              <Section title="Title" key={targetKey} divider={false}>
                <InspectorTextField
                  drafts={drafts}
                  cacheKey={`${targetKey}:title`}
                  label="Title"
                  value={single ? (single.title ?? "") : null}
                  multiline
                  disabled={!single}
                  variant="primary"
                  placeholder="Add a title"
                  mixedPlaceholder="Multiple titles"
                  commit={async (value) => {
                    if (!single) return;
                    await mutateSave(
                      single.id,
                      { title: value.trim() || null },
                      { actorReason: "user:rename", throwOnError: true },
                    );
                  }}
                />
              </Section>
              <Section title="Description">
                <InspectorTextField
                  drafts={drafts}
                  cacheKey={`${targetKey}:description`}
                  label="Description"
                  value={single ? (single.description ?? "") : null}
                  multiline
                  disabled={!single}
                  variant="primary"
                  placeholder="Add a description"
                  mixedPlaceholder="Multiple descriptions"
                  commit={async (value) => {
                    if (!single) return;
                    await mutateSave(
                      single.id,
                      { description: value.trim() || null },
                      {
                        actorReason: "user:edit-description",
                        throwOnError: true,
                      },
                    );
                  }}
                />
              </Section>
              <PickerPanel.Root
                open={tagPickerOpen}
                onOpenChange={(open, details) => {
                  if (
                    !open &&
                    tagPickerPreferences.pinned &&
                    (details.reason === "outside-press" ||
                      details.reason === "focus-out")
                  ) {
                    details.cancel();
                    return;
                  }
                  setTagPickerOpen(open);
                }}
              >
                <Section
                  title="Tags"
                  empty={tagCounts.size === 0}
                  action={
                    <PickerPanel.Trigger
                      render={
                        <Button
                          type="button"
                          icon
                          variant="ghost"
                          size="xs"
                          aria-label="Add Tag"
                          data-tag-add=""
                        />
                      }
                    >
                      <IconPlus />
                    </PickerPanel.Trigger>
                  }
                >
                  <AssignmentChip.List>
                    {[...tagCounts].map(([key, tag]) => (
                      <AssignmentChip.Item
                        key={key}
                        label={tag.name}
                        count={tag.count}
                        total={ids.length}
                        removeLabel={`Remove tag ${tag.name}`}
                        onRemove={() =>
                          void run(() => changeTag(tag.name, true))
                        }
                      />
                    ))}
                  </AssignmentChip.List>
                </Section>
                <PickerPanel.Portal>
                  <PickerPanel.Positioner side="left" align="start">
                    <PickerPanel.Popup>
                      <TagMenu
                        appliedKeys={applied}
                        mixedKeys={
                          new Set(
                            [...tagCounts]
                              .filter(([, tag]) => tag.count !== ids.length)
                              .map(([key]) => key),
                          )
                        }
                        onToggle={(name) => run(() => changeTag(name))}
                        recommendedNames={single?.suggestedTags ?? []}
                        allowCreate
                        showCounts={false}
                        layout={tagPickerPreferences.layout}
                        gridSize={tagPickerPreferences.gridSize}
                        showStarred={tagPickerPreferences.showStarred}
                        showRecently={tagPickerPreferences.showRecently}
                        showRecommended={tagPickerPreferences.showRecommended}
                        pinned={tagPickerPreferences.pinned}
                      />
                    </PickerPanel.Popup>
                  </PickerPanel.Positioner>
                </PickerPanel.Portal>
              </PickerPanel.Root>
              <PickerPanel.Root>
                <Section
                  title="Folders"
                  empty={!folders.some((folder) => folder.count > 0)}
                  action={
                    <PickerPanel.Trigger
                      render={
                        <Button
                          type="button"
                          icon
                          variant="ghost"
                          size="xs"
                          aria-label="Add Folder"
                        />
                      }
                    >
                      <IconPlus />
                    </PickerPanel.Trigger>
                  }
                >
                  <AssignmentChip.List>
                    {folderEntries
                      .filter((folder) => folder.count > 0)
                      .map((folder) => (
                        <AssignmentChip.Item
                          key={folder.id}
                          label={folder.path}
                          count={folder.count}
                          total={ids.length}
                          removeLabel={`Remove folder ${folder.path}`}
                          onRemove={() =>
                            void run(() => assignFolder(folder.id, false))
                          }
                        />
                      ))}
                  </AssignmentChip.List>
                </Section>
                <PickerPanel.Portal>
                  <PickerPanel.Positioner side="left" align="start">
                    <PickerPanel.Popup>
                      <FolderMenu
                        folders={folders}
                        selectionSize={ids.length}
                        onToggle={toggleFolder}
                        onCreate={createFolder}
                      />
                    </PickerPanel.Popup>
                  </PickerPanel.Positioner>
                </PickerPanel.Portal>
              </PickerPanel.Root>
              <Section title="Notes">
                <InspectorTextField
                  drafts={drafts}
                  cacheKey={`${targetKey}:notes`}
                  label="Notes"
                  value={notes}
                  multiline
                  variant="primary"
                  placeholder="Add notes"
                  commit={async (value) => {
                    await bulkMutation([...ids], {
                      kind: "notes",
                      notes: value || null,
                    });
                  }}
                />
              </Section>
            </Tabs.Panel>
            <Tabs.Panel value="info">
              <SavePreviews saves={saves} />
              {!single ? (
                <p className={styles.count}>
                  <strong>{ids.length}</strong> items selected
                </p>
              ) : null}
              {single ? (
                <SaveInfoSections
                  save={single}
                  hideCoreProperties
                  mergeFileAndDatesIntoProperties
                  sourceLead={
                    <PropertyList.Row>
                      <PropertyList.Label>URL</PropertyList.Label>
                      <InspectorTextField
                        className={styles["source-url-editor"]}
                        drafts={drafts}
                        cacheKey={`${targetKey}:url`}
                        label="Source URL"
                        value={url ?? ""}
                        placeholder="No source URL"
                        maxLength={8192}
                        variant="borderless"
                        commit={async (value) => {
                          await mutateSave(
                            single.id,
                            { url: value.trim() },
                            {
                              actorReason: "user:edit-source-url",
                              throwOnError: true,
                            },
                          );
                        }}
                      />
                    </PropertyList.Row>
                  }
                  propertiesLead={
                    <PropertyList.Root>
                      {single.width && single.height ? (
                        <PropertyList.Row>
                          <PropertyList.Label>Dimensions</PropertyList.Label>
                          <PropertyList.Value>
                            {single.width} × {single.height}
                          </PropertyList.Value>
                        </PropertyList.Row>
                      ) : null}
                      <PropertyList.Row>
                        <PropertyList.Label>Size</PropertyList.Label>
                        <PropertyList.Value>
                          {formatBytes(
                            single.fileSize ??
                              single.files.reduce(
                                (sum, file) => sum + file.size,
                                0,
                              ),
                          )}
                        </PropertyList.Value>
                      </PropertyList.Row>
                      <PropertyList.Row>
                        <PropertyList.Label>Type</PropertyList.Label>
                        <PropertyList.Value>
                          {deriveTypeLabel(pickPrimaryFile(single), single) ??
                            "File"}
                        </PropertyList.Value>
                      </PropertyList.Row>
                      <PropertyList.Row>
                        <PropertyList.Label>Rating</PropertyList.Label>
                        <div className={styles.rating}>
                          <RatingStars
                            value={rating}
                            onChange={(next) =>
                              void run(async () => {
                                await bulkMutation([...ids], {
                                  kind: "rating",
                                  rating: next,
                                });
                              })
                            }
                          />
                        </div>
                      </PropertyList.Row>
                    </PropertyList.Root>
                  }
                />
              ) : (
                <Section title="Properties">
                  <PropertyList.Root>
                    <PropertyList.Row>
                      <PropertyList.Label>Size</PropertyList.Label>
                      <PropertyList.Value>
                        {formatBytes(
                          saves.reduce(
                            (total, save) =>
                              total +
                              (save.fileSize ??
                                save.files.reduce(
                                  (sum, file) => sum + file.size,
                                  0,
                                )),
                            0,
                          ),
                        )}
                      </PropertyList.Value>
                    </PropertyList.Row>
                    <PropertyList.Row>
                      <PropertyList.Label>Rating</PropertyList.Label>
                      <div className={styles.rating}>
                        <RatingStars
                          value={rating}
                          onChange={(next) =>
                            void run(async () => {
                              await bulkMutation([...ids], {
                                kind: "rating",
                                rating: next,
                              });
                            })
                          }
                        />
                        {rating === null ? (
                          <span className={styles.muted}>Multiple ratings</span>
                        ) : null}
                      </div>
                    </PropertyList.Row>
                  </PropertyList.Root>
                </Section>
              )}
              {single?.clipModel === mediaEmbeddingVersion() ? (
                <Section title="Related" defaultOpen={false}>
                  <RelatedSaves saveId={single.id} />
                </Section>
              ) : null}
            </Tabs.Panel>
          </>
        ) : null}
      </Pane.Body>
    </Tabs.Root>
  );
}
