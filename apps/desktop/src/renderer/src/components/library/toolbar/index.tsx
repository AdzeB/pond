import { Button, Input, Menu, Toolbar as PondToolbar, Tooltip } from "@pond/ui";
import { Eye, ListFilter, Search as SearchIcon } from "lucide-react";
import { useRef, useState } from "react";
import { AddFilterMenu } from "@/components/library/filter-bar/registry";
import { useAddCommitApi } from "@/components/library/filter-bar/use-add-commit-api";
import { ViewPicker } from "@/components/library/menus/layout";
import { usePlatform } from "@/lib/platform";
import { useDebouncedSearchParam } from "@/lib/use-debounced-search-param";
import { useFilterHotkey, useSearchHotkey } from "@/lib/use-hotkeys";
import { useSidebar } from "@/lib/use-sidebar";
import styles from "./styles.module.css";

function Root() {
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
      <PondToolbar.Group data-align="end" className={styles.right}>
        <ViewOptionsButton />
        <AddFilterButton />
      </PondToolbar.Group>
    </PondToolbar.Root>
  );
}

export const HeaderToolbar = { Root };

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

function ViewOptionsButton() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <ViewPicker.Root
            trigger={
              <Button icon aria-label="View options">
                <Eye style={{ width: "100%", height: "100%" }} />
              </Button>
            }
          />
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner side="bottom">
          <Tooltip.Popup>View options</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function AddFilterButton() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const api = useAddCommitApi();

  useFilterHotkey(() => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  });

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Menu.Trigger
              render={
                <Button icon aria-label="Add filter">
                  <ListFilter style={{ width: "100%", height: "100%" }} />
                </Button>
              }
            />
          }
        />
        <Tooltip.Portal>
          <Tooltip.Positioner side="bottom">
            <Tooltip.Popup>Add filter</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
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
