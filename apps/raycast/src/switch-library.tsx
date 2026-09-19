import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  listRecentLibraries,
  type PondLibrary,
  switchLibrary,
} from "./pond-api";

export default function SwitchLibrary() {
  const [libraries, setLibraries] = useState<PondLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    void listRecentLibraries()
      .then(setLibraries)
      .catch((error) =>
        setFailure(
          error instanceof Error ? error.message : "Try again with Pond open.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function openLibrary(library: PondLibrary) {
    if (library.active) {
      await open("pond://library");
      await closeMainWindow();
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Switching Library",
      message: library.name,
    });
    try {
      await switchLibrary(library.path);
      toast.style = Toast.Style.Success;
      toast.title = "Library Switched";
      await closeMainWindow();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Switch Library";
      toast.message =
        error instanceof Error ? error.message : "Try again with Pond open.";
    }
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search Libraries…">
      {libraries.length === 0 ? (
        <List.EmptyView
          icon={failure ? Icon.ExclamationMark : Icon.Folder}
          title={failure ? "Could Not Reach Pond" : "No Recent Libraries"}
          description={failure ?? "Open another Library in Pond first."}
        />
      ) : (
        libraries.map((library) => (
          <List.Item
            key={library.path}
            icon={library.icon ?? Icon.Folder}
            title={library.name}
            subtitle={library.path}
            keywords={[library.path]}
            accessories={
              library.active
                ? [
                    {
                      tag: {
                        value: "Open",
                        color: library.accent ?? undefined,
                      },
                    },
                  ]
                : library.available
                  ? []
                  : [{ tag: "Missing" }]
            }
            actions={
              <ActionPanel>
                {library.available ? (
                  <>
                    <Action
                      title={library.active ? "Show Pond" : "Switch Library"}
                      icon={library.active ? Icon.AppWindow : Icon.ArrowRight}
                      onAction={() => void openLibrary(library)}
                    />
                    <Action.ShowInFinder path={library.path} />
                  </>
                ) : null}
                <Action.CopyToClipboard
                  title="Copy Library Path"
                  content={library.path}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
