import {
  IconBarsFilterFill18 as Funnel,
  IconMagnifierFill18 as Magnifier,
  IconSliders2VerticalFill18 as Sliders,
} from "@pond/icons/fill/18";
import { Button, Input, Menu, Toolbar as PondToolbar } from "@pond/ui";
import { FilterBar } from "@/components/library/filter-bar";
import { SavedViews } from "@/components/library/saved-views";
import { AddFilterMenu } from "@/components/primitives/menus/add-filter";
import { DisplaySection } from "@/components/primitives/menus/view/sections/display";
import { LayoutSection } from "@/components/primitives/menus/view/sections/layout";
import { SortSection } from "@/components/primitives/menus/view/sections/sort";
import { ZoomSection } from "@/components/primitives/menus/view/sections/zoom";
import { usePlatform } from "@/lib/hooks/platform";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search";
import { useSidebar } from "@/lib/stores/shell-state";
import styles from "./styles.module.css";

export function Toolbar() {
  const { open: sidebarOpen } = useSidebar();
  const platform = usePlatform();
  const trafficLightInset = platform === "mac" && !sidebarOpen ? 72 : 0;

  return (
    <PondToolbar.Root
      className={styles.toolbar}
      style={{ paddingInlineStart: trafficLightInset }}
    >
      <PondToolbar.Row className={styles.row}>
        <PondToolbar.Group fill={true} className={styles.group}>
          <SavedViews />
        </PondToolbar.Group>
        <PondToolbar.Group className={styles.group}>
          <Search />
          <Filter />
          <Options />
        </PondToolbar.Group>
      </PondToolbar.Row>
      <FilterBar />
    </PondToolbar.Root>
  );
}

function Search() {
  const [value, setValue] = useDebouncedSearch(200);
  return (
    <Input.Root className={styles.search}>
      <Input.Icon>
        <Magnifier />
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

function Filter() {
  return (
    <AddFilterMenu align="end">
      <Button className={styles.button} icon aria-label="Filter">
        <Funnel />
      </Button>
    </AddFilterMenu>
  );
}

function Options() {
  return (
    <Menu.Root>
      <Menu.Trigger className={styles.button} icon aria-label="View options">
        <Sliders />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6}>
          <Menu.Popup style={{ width: "256px" }}>
            <LayoutSection />
            <Menu.Separator />
            <SortSection />
            <Menu.Separator />
            <DisplaySection />
            <Menu.Separator />
            <ZoomSection />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
