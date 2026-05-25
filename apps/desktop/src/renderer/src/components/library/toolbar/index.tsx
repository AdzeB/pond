import { Button, Input, Menu, Toolbar as PondToolbar, Tooltip } from "@pond/ui";
import { Eye, ListFilter, Search as SearchIcon } from "lucide-react";
import { useRef, useState } from "react";
import { AddFilterMenu } from "@/components/library/menus/filter";
import { useAddCommitApi } from "@/components/library/menus/filter/use-add-commit-api";
import { ViewPicker } from "@/components/library/menus/view";
import { usePlatform } from "@/lib/platform";
import { useDebouncedSearchParam } from "@/lib/use-debounced-search-param";
import { useFilterHotkey, useSearchHotkey } from "@/lib/use-hotkeys";
import { useSidebar } from "@/lib/use-sidebar";
import styles from "./styles.module.css";

export function HeaderToolbar() {
  const { open: sidebarOpen } = useSidebar();
  const platform = usePlatform();
  const trafficLightInset = platform === "mac" && !sidebarOpen ? 72 : 0;

  return (
    <PondToolbar.Root
      aria-label="Library toolbar"
      className={styles.toolbar}
      style={{ paddingInlineStart: trafficLightInset }}
    >
      <Search />
      <ViewOptions />
      <Filter />
    </PondToolbar.Root>
  );
}

const SEARCH_DEBOUNCE_MS = 150;

function Search() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useDebouncedSearchParam("q", SEARCH_DEBOUNCE_MS);

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

function ViewOptions() {
  return (
    <Tooltip label="View options" side="bottom">
      <ViewPicker
        trigger={
          <Button icon aria-label="View options">
            <Eye style={{ width: "100%", height: "100%" }} />
          </Button>
        }
      />
    </Tooltip>
  );
}

function Filter() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const api = useAddCommitApi();

  useFilterHotkey(() => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  });

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Tooltip label="Add filter" side="bottom">
        <Menu.Trigger className={styles.trigger}>
          <ListFilter style={{ width: "100%", height: "100%" }} />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6}>
          <Menu.Popup>
            <AddFilterMenu api={api} inputRef={inputRef} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
