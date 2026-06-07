import {
  IconBarsFilterOutline18 as Filter,
  IconMagnifierOutline18 as SearchIcon,
} from "@pond/icons/outline/18";
import { Button, Input, Toolbar } from "@pond/ui";
import { useEffect, useState } from "react";
import { FilterBar } from "@/components/library/filter-bar";
import { SavedViews } from "@/components/library/saved-views";
import { AddFilterMenu } from "@/components/menus/add-filter";
import { View } from "@/components/menus/view";
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
          <SavedViews />
        </Toolbar.Group>
        <Toolbar.Group>
          <Search />
          <FilterButton />
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
        placeholder="Explore…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search saves"
      />
    </Input.Root>
  );
}

// The funnel button mirrors the filter-bar's "+": it opens the same
// nested field picker. Pressing "F" (outside a text field) opens it too.
function FilterButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AddFilterMenu open={open} onOpenChange={setOpen}>
      <Button icon size="sm" variant="ghost" aria-label="Filter">
        <Filter width={16} height={16} />
      </Button>
    </AddFilterMenu>
  );
}
