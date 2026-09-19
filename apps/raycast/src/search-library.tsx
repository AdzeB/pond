import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  itemLink,
  type PondCursor,
  type PondSave,
  searchLibrary,
} from "./pond-api";

export default function SearchLibrary() {
  const [query, setQuery] = useState("");
  const [saves, setSaves] = useState<PondSave[]>([]);
  const [libraryId, setLibraryId] = useState("");
  const [cursor, setCursor] = useState<PondCursor | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setFailure(null);
      void searchLibrary(query, null)
        .then((page) => {
          if (requestId.current !== id) return;
          setSaves(page.saves);
          setCursor(page.nextCursor);
          setLibraryId(page.libraryId);
          setTotal(page.total);
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
  }, [query]);

  async function loadMore() {
    if (!cursor || loading) return;
    const id = requestId.current;
    setLoading(true);
    try {
      const page = await searchLibrary(query, cursor);
      if (requestId.current !== id) return;
      setSaves((current) => [...current, ...page.saves]);
      setCursor(page.nextCursor);
      setLibraryId(page.libraryId);
      setTotal(page.total);
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
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Saves…"
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
            (query
              ? "Try another search."
              : "Your active Library has no Saves.")
          }
        />
      ) : (
        <List.Section title={`${total.toLocaleString()} Saves`}>
          {saves.map((save) => (
            <List.Item
              key={save.id}
              icon={Icon.Link}
              title={save.title || save.url}
              subtitle={save.author || hostname(save.url)}
              keywords={[save.url, save.source, ...save.tags]}
              accessories={[
                { tag: save.source },
                { date: new Date(save.savedAt) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Open in Pond"
                    icon={Icon.AppWindow}
                    target={itemLink(libraryId, save.id)}
                  />
                  <Action.OpenInBrowser title="Open Original" url={save.url} />
                  <Action.CopyToClipboard title="Copy URL" content={save.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
