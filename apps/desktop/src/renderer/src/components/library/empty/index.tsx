import {
  IconArchiveContent2Fill18,
  IconGlobeFill18,
  IconTrash2ContentFill18,
} from "@pond/icons/fill/18";
import { Button, Empty, Keyboard } from "@pond/ui";
import { getAppRouter } from "@/lib/ui/app-router";
import { dockMode } from "@/stores/dock-mode";
import styles from "./styles.module.css";

export function LibraryEmpty() {
  return (
    <Empty.Root align="start">
      <Empty.Media>
        <IconArchiveContent2Fill18 />
      </Empty.Media>
      <Empty.Title>Library</Empty.Title>
      <Empty.Description>
        Drop a link, image, or file anywhere in the window, or paste a URL with{" "}
        <Keyboard.Cluster keys={["⌘", "V"]} />.
      </Empty.Description>
      <Empty.Description>
        Connect a source to sync the bookmarks you already have, or watch an
        account to sync their feed with your library.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="md"
          onClick={() => dockMode.open("connect-source")}
        >
          New Source
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => dockMode.open("watch-source")}
        >
          Watch Account
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function SourcesEmpty() {
  return (
    <Empty.Root align="start">
      <Empty.Media>
        <IconGlobeFill18 />
      </Empty.Media>
      <Empty.Title>Sources</Empty.Title>
      <Empty.Description>
        Connect an account you own, or watch a public one.
      </Empty.Description>
      <Empty.Description>
        Pond keeps your library filling up in the background.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="md"
          onClick={() => dockMode.open("connect-source")}
        >
          New Source
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => dockMode.open("watch-source")}
        >
          Watch Account
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

export function TrashEmpty() {
  return (
    <Empty.Root align="start">
      <Empty.Media>
        <IconTrash2ContentFill18 />
      </Empty.Media>
      <Empty.Title>Trash</Empty.Title>
      <Empty.Description>
        Items you delete land here until they are gone for good.
      </Empty.Description>
      <Empty.Description>
        Restore anything you still need, or empty trash to remove it
        permanently.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="md"
          onClick={() => getAppRouter()?.history.push("/")}
        >
          Open Library
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => dockMode.open("connect-source")}
        >
          New Source
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}

/** Shown while the pool snapshot / first page is still resolving after a cold start. */
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

export function MatchesEmpty() {
  return (
    <Empty.Root role="status" aria-live="polite">
      <Empty.Title>No results found</Empty.Title>
      <Empty.Description>Try another.</Empty.Description>
    </Empty.Root>
  );
}
