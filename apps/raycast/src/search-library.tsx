import { pathToFileURL } from "node:url";
import { SOURCES, sourceLabel } from "@pond/schema/source-ids";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  copySaveFile,
  itemLink,
  type PondCursor,
  type PondSave,
  searchLibrary,
} from "./pond-api";
import {
  hostname,
  saveCaption,
  savedDate,
  savedSection,
  saveSourceLabel,
  saveTitle,
} from "./save-display";
import { useThumbnails } from "./use-thumbnails";

const ALL_SOURCES = "all";

export default function SearchLibrary() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState(ALL_SOURCES);
  const [saves, setSaves] = useState<PondSave[]>([]);
  const [libraryId, setLibraryId] = useState("");
  const [cursor, setCursor] = useState<PondCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const requestId = useRef(0);
  const scope = source === ALL_SOURCES ? null : source;
  const ids = useMemo(() => saves.map((save) => save.id), [saves]);
  const thumbnails = useThumbnails(ids);
  const sections = groupBySavedDay(saves, new Date());

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setFailure(null);
      void searchLibrary(query, null, scope)
        .then((page) => {
          if (requestId.current !== id) return;
          setSaves(page.saves);
          setCursor(page.nextCursor);
          setLibraryId(page.libraryId);
        })
        .catch((error) => {
          if (requestId.current !== id) return;
          setSaves([]);
          setCursor(null);
          setFailure(
            error instanceof Error
              ? error.message
              : "Try again with Pond open.",
          );
        })
        .finally(() => {
          if (requestId.current === id) setLoading(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, scope]);

  async function loadMore() {
    if (!cursor || loading) return;
    const id = requestId.current;
    setLoading(true);
    try {
      const page = await searchLibrary(query, cursor, scope);
      if (requestId.current !== id) return;
      setSaves((current) => [...current, ...page.saves]);
      setCursor(page.nextCursor);
      setLibraryId(page.libraryId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Try again with Pond open.";
      setFailure(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Load More Saves",
        message,
      });
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }

  return (
    <List
      isLoading={loading}
      isShowingDetail={saves.length > 0}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Saves…"
      searchBarAccessory={
        <List.Dropdown tooltip="Source" storeValue onChange={setSource}>
          <List.Dropdown.Item title="All Sources" value={ALL_SOURCES} />
          <List.Dropdown.Section>
            {SOURCES.map((id) => (
              <List.Dropdown.Item key={id} title={sourceLabel(id)} value={id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      throttle
      pagination={{
        hasMore: cursor !== null,
        onLoadMore: loadMore,
        pageSize: 50,
      }}
    >
      {saves.length === 0 ? (
        <List.EmptyView
          icon={failure ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={failure ? "Could Not Reach Pond" : "No Saves Found"}
          description={
            failure ??
            (query || scope
              ? "Try another search."
              : "Your active Library has no Saves.")
          }
        />
      ) : (
        sections.map((section) => (
          <List.Section key={section.title} title={section.title}>
            {section.saves.map((save) => (
              <SaveItem
                key={save.id}
                save={save}
                libraryId={libraryId}
                thumbnail={thumbnails.get(save.id)}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

interface SaveItemProps {
  save: PondSave;
  libraryId: string;
  thumbnail: string | null | undefined;
}

function SaveItem({ save, libraryId, thumbnail }: SaveItemProps) {
  const saved = savedDate(save);
  return (
    <List.Item
      icon={thumbnail ? { source: thumbnail } : Icon.Link}
      title={saveTitle(save)}
      detail={
        <List.Item.Detail
          isLoading={thumbnail === undefined}
          markdown={
            thumbnail
              ? `![](${pathToFileURL(thumbnail).href})`
              : saveCaption(save)
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Source"
                text={saveSourceLabel(save)}
              />
              {save.author ? (
                <List.Item.Detail.Metadata.Label
                  title="Author"
                  text={save.author}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Saved"
                text={saved.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              {save.tags.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {save.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={tag}
                      text={tag}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              <List.Item.Detail.Metadata.Link
                title="Original"
                target={save.url}
                text={hostname(save.url)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Open
            title="Open in Pond"
            icon={Icon.AppWindow}
            target={itemLink(libraryId, save.id)}
          />
          <Action.OpenInBrowser title="Open Original" url={save.url} />
          <Action
            title="Copy File"
            icon={Icon.Document}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => void copyFile(save)}
          />
          <Action.CopyToClipboard title="Copy URL" content={save.url} />
        </ActionPanel>
      }
    />
  );
}

async function copyFile(save: PondSave) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Copying File",
  });
  try {
    await copySaveFile(save.id);
    await toast.hide();
    await showHUD("Copied File");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Copy File";
    toast.message =
      error instanceof Error ? error.message : "Try again with Pond open.";
  }
}

function groupBySavedDay(saves: PondSave[], now: Date) {
  const sections: { title: string; saves: PondSave[] }[] = [];
  for (const save of saves) {
    const title = savedSection(savedDate(save), now);
    const last = sections.at(-1);
    if (last?.title === title) last.saves.push(save);
    else sections.push({ title, saves: [save] });
  }
  return sections;
}
