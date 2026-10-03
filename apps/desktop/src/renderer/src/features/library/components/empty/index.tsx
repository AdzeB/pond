import {
  IconAlbum2Fill18,
  IconArrowDiagonalInFill18,
  IconBookmarkSlashFill18,
  IconFolderBanFill18,
  IconFolderOpenFill18,
  IconTrashXmarkFill18,
  IconWindowDownloadFill18,
} from "@pond/icons/fill/18";
import {
  IconClockRotateClockwiseOutline18,
  IconMagnifierOutline18,
} from "@pond/icons/outline/18";
import { Button, Empty } from "@pond/ui";
import { openHarvester } from "@/features/library/lib/open-harvester";
import { libraryChrome } from "@/features/library/state/library-chrome";
import type { SaveListMode } from "@/features/saves/lib/list";
import { sourceNewMenu } from "@/features/sources/state/source-new-menu";
import { getAppRouter } from "@/shared/lib/app-router";
import styles from "./styles.module.css";

export function LibraryEmpty() {
  return (
    <Empty.Root>
      <Empty.Media>
        <IconAlbum2Fill18 />
      </Empty.Media>
      <Empty.Title>No saves yet</Empty.Title>
      <Empty.Description>
        Connect your first source to start building your library.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            openHarvester({
              section: "sources",
              intent: { type: "new-source" },
            })
          }
        >
          New Source
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function SourcesEmpty({ scope }: { scope?: "account" | "watch" }) {
  const title =
    scope === "account"
      ? "No accounts yet"
      : scope === "watch"
        ? "No watches yet"
        : "No sources yet";
  const description =
    scope === "account"
      ? "Connect an account to keep Pond in sync."
      : scope === "watch"
        ? "Watch a public page to keep Pond in sync."
        : "Connect an account or watch a public one to keep Pond in sync.";
  return (
    <Empty.Root>
      <Empty.Media>
        <IconArrowDiagonalInFill18 />
      </Empty.Media>
      <Empty.Title>{title}</Empty.Title>
      <Empty.Description>{description}</Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => sourceNewMenu.open()}
        >
          New Source
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function DownloadsEmpty() {
  return (
    <Empty.Root>
      <Empty.Media>
        <IconWindowDownloadFill18 />
      </Empty.Media>
      <Empty.Title>No downloads yet</Empty.Title>
      <Empty.Description>
        Files appear here while Pond downloads them for your library.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => getAppRouter()?.history.push("/")}
        >
          Open Library
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function TrashEmpty() {
  return (
    <Empty.Root>
      <Empty.Media>
        <IconTrashXmarkFill18 />
      </Empty.Media>
      <Empty.Title>Trash is empty</Empty.Title>
      <Empty.Description>
        Deleted saves appear here until they are removed permanently.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => getAppRouter()?.history.push("/")}
        >
          Open Library
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function LibraryLoading() {
  return (
    <Empty.Root role="status" aria-live="polite">
      <Empty.Media>
        <div className={styles.spinner} aria-hidden="true" />
      </Empty.Media>
      <Empty.Title>Loading library</Empty.Title>
      <Empty.Description>Getting your saves ready.</Empty.Description>
    </Empty.Root>
  );
}

export function UncategorizedEmpty() {
  return (
    <Empty.Root role="status" aria-live="polite">
      <Empty.Media>
        <IconFolderBanFill18 />
      </Empty.Media>
      <Empty.Title>No uncategorized saves</Empty.Title>
      <Empty.Description>
        Saves that aren't in a folder appear here.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            libraryChrome.setNav({ kind: "all" });
            getAppRouter()?.history.push("/");
          }}
        >
          Open Library
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function FolderEmpty() {
  return (
    <Empty.Root role="status" aria-live="polite">
      <Empty.Media>
        <IconFolderOpenFill18 />
      </Empty.Media>
      <Empty.Title>This folder is empty</Empty.Title>
      <Empty.Description>
        Drag and drop onto this window to add.
      </Empty.Description>
    </Empty.Root>
  );
}

type LibrarySection = Exclude<SaveListMode, "library" | "trash">;

export function LibrarySectionEmpty({ mode }: { mode: LibrarySection }) {
  const content =
    mode === "untagged"
      ? {
          icon: <IconBookmarkSlashFill18 />,
          title: "No untagged saves",
          description: "Saves without tags appear here.",
        }
      : mode === "recents"
        ? {
            icon: <IconClockRotateClockwiseOutline18 />,
            title: "No recent saves",
            description: "Recently opened saves appear here.",
          }
        : {
            icon: <IconArrowDiagonalInFill18 />,
            title: "No saves from this source",
            description: "Saves synced from this source appear here.",
          };

  return (
    <Empty.Root role="status" aria-live="polite">
      <Empty.Media>{content.icon}</Empty.Media>
      <Empty.Title>{content.title}</Empty.Title>
      <Empty.Description>{content.description}</Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => getAppRouter()?.history.push("/")}
        >
          Open Library
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

interface MatchesEmptyProps {
  actionLabel?: string;
  description?: string;
  onReset?: () => void;
}

export function MatchesEmpty({
  actionLabel = "Clear Search and Filters",
  description = "Try a different search or clear the filters.",
  onReset,
}: MatchesEmptyProps = {}) {
  return (
    <Empty.Root role="status" aria-live="polite">
      <Empty.Media>
        <IconMagnifierOutline18 />
      </Empty.Media>
      <Empty.Title>No results found</Empty.Title>
      <Empty.Description>{description}</Empty.Description>
      {onReset ? (
        <Empty.Action>
          <Button variant="primary" size="sm" onClick={onReset}>
            {actionLabel}
          </Button>
        </Empty.Action>
      ) : null}
    </Empty.Root>
  );
}
