import {
  IconXmarkOutline18 as Clear,
  IconMagnifierOutline18 as Search,
} from "@pond/icons/outline/18";
import { useInstantSearch } from "@/hooks/use-instant-search";
import styles from "./styles.module.css";

// Always-visible, local-only Search field in the dock. Filtering is live (no
// submit) and never touches the network or an LLM — that's the Ask AI surface.
export function DockSearch() {
  const { text, setText, clear } = useInstantSearch();

  return (
    <div className={styles.wrap} data-filled={text ? "true" : undefined}>
      <Search className={styles.icon} width={16} height={16} aria-hidden />
      <input
        type="text"
        className={styles.input}
        placeholder="Search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        autoComplete="off"
        aria-label="Search library"
      />
      {text ? (
        <button
          type="button"
          className={styles.clear}
          aria-label="Clear search"
          onClick={clear}
        >
          <Clear width={12} height={12} />
        </button>
      ) : null}
    </div>
  );
}
