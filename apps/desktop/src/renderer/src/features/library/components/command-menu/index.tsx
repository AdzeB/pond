import { Dialog } from "@pond/ui";
import {
  type KeyboardEvent,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  commandMenu,
  useCommandMenuOpen,
} from "@/features/library/state/command-menu";
import { openSave } from "@/features/saves/navigation";
import { useSearchResults } from "@/features/search";
import { usePrefs } from "@/shared/state/prefs";
import { ResultsList } from "./results-list";
import { SearchField } from "./search-field";
import styles from "./styles.module.css";
import { useMenuEntries } from "./use-menu-entries";

function runAfterClose(run: () => void): void {
  commandMenu.close();
  requestAnimationFrame(run);
}

export function CommandMenuHost({
  useResults = useSearchResults,
  onOpenSave = openSave,
}: {
  useResults?: typeof useSearchResults;
  onOpenSave?: typeof openSave;
} = {}) {
  const open = useCommandMenuOpen();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query.trim());
  const [ai] = usePrefs("ai");
  const indexed = Boolean(ai.semanticSearch || ai.enableClip);
  const search = useResults(open ? deferredQuery : "", {
    retrieve: indexed,
  });
  const { entries, groups } = useMenuEntries({
    query,
    deferredQuery,
    searchResults: search.results,
    onOpenSave,
  });

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return;
    }

    setQuery("");
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= entries.length) setActiveIndex(0);
  }, [activeIndex, entries.length]);

  function execute(index: number): void {
    const entry = entries[index];
    if (entry) runAfterClose(entry.run);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
      return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(entries.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) =>
          (index - 1 + Math.max(entries.length, 1)) %
          Math.max(entries.length, 1),
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(entries.length - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      execute(activeIndex);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) commandMenu.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup} aria-label="Search Pond">
          <Dialog.Title className={styles["sr-only"]}>Search Pond</Dialog.Title>
          <SearchField
            inputRef={inputRef}
            value={query}
            activeDescendant={entries[activeIndex]?.id}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
          />
          <ResultsList
            open={open}
            groups={groups}
            entries={entries}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onExecute={execute}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
