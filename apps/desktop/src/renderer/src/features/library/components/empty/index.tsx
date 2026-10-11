import {
  IconAlbum2Fill18,
  IconArrowDiagonalInFill18,
  IconBookmarkSlashFill18,
  IconFolderBanFill18,
  IconFolderOpenFill18,
  IconTrashXmarkFill18,
} from "@pond/icons/fill/18";
import {
  IconClockPlusOutline18,
  IconClockRotateClockwiseOutline18,
} from "@pond/icons/outline/18";
import { Button, Empty } from "@pond/ui";
import { libraryChrome } from "@/features/library/state/library-chrome";
import type { SaveListMode } from "@/features/saves";
import { getAppRouter } from "@/shared/lib/app-router";
import { openHarvester } from "@/shared/lib/open-harvester";
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
        : mode === "recentlyAdded"
          ? {
              icon: <IconClockPlusOutline18 />,
              title: "No new saves",
              description: "Saves from the last 7 days appear here.",
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
