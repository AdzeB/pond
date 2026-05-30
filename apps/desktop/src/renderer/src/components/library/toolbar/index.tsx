import { Input, Toolbar } from "@pond/ui";
import { Search as SearchIcon } from "lucide-react";
import { useRef } from "react";
import { FilterBar } from "@/components/library/filter-bar";
import { View } from "@/components/library/view-menu";
import { usePlatform } from "@/lib/platform";
import { useSidebar } from "@/lib/shell-state";
import { useDebouncedSearch } from "@/lib/use-debounced-search";
import { useSearchHotkey } from "@/lib/use-hotkeys";
import styles from "./styles.module.css";

export function HeaderToolbar() {
  const { open: sidebarOpen } = useSidebar();

  const platform = usePlatform();

  const trafficLightInset = platform === "mac" && !sidebarOpen ? 72 : 0;

  return (
    <Toolbar.Root
      className={styles.toolbar}
      style={{ paddingInlineStart: trafficLightInset }}
    >
      <Toolbar.Row>
        <Toolbar.Group fill={true}>
          <Search />
        </Toolbar.Group>
        <Toolbar.Group>
          <View.Menu />
        </Toolbar.Group>
      </Toolbar.Row>
      <Toolbar.Row>
        <FilterBar />
      </Toolbar.Row>
    </Toolbar.Root>
  );
}

const SEARCH_DEBOUNCE_MS = 150;

function Search() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useDebouncedSearch("q", SEARCH_DEBOUNCE_MS);

  useSearchHotkey(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  });

  return (
    <Input.Root className={styles.search}>
      <Input.Icon>
        <SearchIcon />
      </Input.Icon>
      <Input.Field
        className={styles.field}
        ref={inputRef}
        type="search"
        placeholder="Search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search saves"
      />
    </Input.Root>
  );
}
