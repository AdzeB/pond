import { Button, Input, Toolbar as PondToolbar, Tooltip } from "@pond/ui";
import { Eye, Search as SearchIcon } from "lucide-react";
import { useRef } from "react";
import { QuickViews } from "@/components/library/quick-views";
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
    <PondToolbar.Root
      aria-label="Library toolbar"
      className={styles.toolbar}
      style={{ paddingInlineStart: trafficLightInset }}
    >
      <QuickViews />
      <div className={styles["right-group"]}>
        <Search />
        <ViewPicker />
      </div>
    </PondToolbar.Root>
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

function ViewPicker() {
  return (
    <Tooltip label="View options" side="bottom">
      <View.Picker
        trigger={
          <Button icon aria-label="View options">
            <Eye style={{ width: "100%", height: "100%" }} />
          </Button>
        }
      />
    </Tooltip>
  );
}
