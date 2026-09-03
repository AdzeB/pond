import {
  IconArchiveContent2Fill18,
  IconDownloadFill18,
  IconGlobeFill18,
  IconTagFill18,
  IconTrash2ContentFill18,
} from "@pond/icons/fill/18";
import {
  IconClockRotateClockwiseOutline18,
  IconMagnifierOutline18,
} from "@pond/icons/outline/18";
import { Button, Empty } from "@pond/ui";
import type { SaveListMode } from "@/lib/save/list";
import { getAppRouter } from "@/lib/ui/app-router";
import { sourceFlow } from "@/stores/source-flow";
import styles from "./styles.module.css";

export function LibraryEmpty() {
  return (
    <Empty.Root>
      <Empty.Media>
        <IconArchiveContent2Fill18 />
      </Empty.Media>
      <Empty.Title>No saves yet</Empty.Title>
      <Empty.Description>
        Connect your first source to start building your library.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => sourceFlow.open("source-new")}
        >
          Add Source
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function SourcesEmpty() {
  return (
    <Empty.Root>
      <Empty.Media>
        <IconGlobeFill18 />
      </Empty.Media>
      <Empty.Title>No sources yet</Empty.Title>
      <Empty.Description>
        Connect an account or watch a public one to keep Pond in sync.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => sourceFlow.open("source-new")}
        >
          Add Source
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function DownloadsEmpty() {
  return (
    <Empty.Root>
      <Empty.Media>
        <IconDownloadFill18 />
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
        <IconTrash2ContentFill18 />
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

type LibrarySection = Exclude<SaveListMode, "library" | "trash">;

export function LibrarySectionEmpty({ mode }: { mode: LibrarySection }) {
  const content =
    mode === "untagged"
      ? {
          icon: <IconTagFill18 />,
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
            icon: <IconGlobeFill18 />,
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
