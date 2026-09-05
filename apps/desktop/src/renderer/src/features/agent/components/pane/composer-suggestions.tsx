import { Keyboard, Popover } from "@pond/ui";
import { type RefObject, useEffect, useRef } from "react";
import styles from "./composer-suggestions.module.css";
import type { useComposerSuggestions } from "./use-composer-suggestions";

export function ComposerSuggestions({
  suggestions,
  anchorRef,
}: {
  suggestions: ReturnType<typeof useComposerSuggestions>;
  anchorRef: RefObject<HTMLDivElement | null>;
}) {
  const list = useRef<HTMLDivElement>(null);
  const { open, kind, activeIndex, listId } = suggestions;
  useEffect(() => {
    if (open && activeIndex >= 0)
      list.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) suggestions.dismiss();
      }}
      modal={false}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchorRef}
          side="top"
          align="start"
          sideOffset={8}
          className={styles.positioner}
        >
          <Popover.Popup
            className={styles.panel}
            initialFocus={false}
            finalFocus={false}
          >
            <Popover.Title className={styles.heading}>
              {kind === "@" ? "Saves" : "Actions"}
            </Popover.Title>
            <div
              ref={list}
              id={listId}
              role="listbox"
              aria-label={kind === "@" ? "Saves" : "Actions"}
              aria-busy={suggestions.loading}
              className={styles.list}
            >
              {suggestions.options.map((option, index) => (
                <div
                  role="option"
                  tabIndex={-1}
                  id={suggestions.optionId(index)}
                  aria-selected={activeIndex === index}
                  key={option.id}
                  className={styles.option}
                  onPointerMove={() => suggestions.highlight(option.id)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => suggestions.choose(option.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") suggestions.choose(option.id);
                  }}
                >
                  <option.icon aria-hidden="true" />
                  <span className={styles.title}>{option.title}</span>
                  <span className={styles.detail}>{option.detail}</span>
                </div>
              ))}
            </div>
            {!suggestions.options.length ? (
              <p className={styles.empty} role="status">
                {suggestions.loading
                  ? "Searching your library"
                  : suggestions.empty}
              </p>
            ) : null}
            <div className={styles.footer} aria-hidden="true">
              <span>
                <Keyboard.Cluster keys={["↑", "↓"]} />
                Navigate
              </span>
              <span>
                <Keyboard.Key>↵</Keyboard.Key>
                {kind === "@" ? "Attach" : "Insert"}
              </span>
              <span>
                <Keyboard.Key>esc</Keyboard.Key>
                Close
              </span>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
