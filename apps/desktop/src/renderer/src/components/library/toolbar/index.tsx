import { IconMagnifierOutline18 as SearchIcon } from "@pond/icons/outline/18";
import { Input, Toolbar } from "@pond/ui";
import { FilterBar } from "@/components/library/filter-bar";
import { View } from "@/components/library/view-menu";
import { usePlatform } from "@/lib/hooks/platform";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search";
import { useSidebar } from "@/lib/stores/shell-state";
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
  const [value, setValue] = useDebouncedSearch(SEARCH_DEBOUNCE_MS);

  return (
    <Input.Root className={styles.search}>
      <Input.Icon>
        <SearchIcon />
      </Input.Icon>
      <Input.Field
        className={styles.field}
        type="search"
        placeholder="Search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search saves"
      />
    </Input.Root>
  );
}
