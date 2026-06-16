import { IconMagnifierFill18 as Magnifier } from "@pond/icons/fill/18";
import { Input, Toolbar as PondToolbar } from "@pond/ui";
import { FilterSubmenu } from "@/components/library-filter-panel";
import { PondSwitcher } from "@/components/library-pond-switcher";
import { DisplaySection } from "@/components/library-view-menu/sections/display";
import { LayoutSection } from "@/components/library-view-menu/sections/layout";
import { SortSection } from "@/components/library-view-menu/sections/sort";
import { ZoomSection } from "@/components/library-view-menu/sections/zoom";
import { Glass } from "@/components/liquid-glass";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { usePlatform } from "@/lib/platform";
import { SEARCH_INPUT_ID } from "./constants";
import { NavCluster } from "./nav-cluster";
import styles from "./styles.module.css";

export function Toolbar() {
  const platform = usePlatform();

  const trafficLightInset = platform === "mac" ? 72 : 0;

  return (
    <PondToolbar.Root style={{ paddingInlineStart: trafficLightInset }}>
      <PondToolbar.Row className={styles.row}>
        <PondToolbar.Group fill={true} className={styles.sideStart}>
          <PondSwitcher compact className={styles.switcher} />
          <NavCluster />
        </PondToolbar.Group>

        <PondToolbar.Group className={styles.center}>
          <Search />
        </PondToolbar.Group>

        <PondToolbar.Group fill={true} className={styles.sideEnd}>
          <Glass className={styles.glassCluster}>
            <FilterSubmenu standalone />
            <SortSection standalone />
            <LayoutSection standalone />
            <DisplaySection standalone />
            <ZoomSection standalone />
          </Glass>
        </PondToolbar.Group>
      </PondToolbar.Row>
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
        id={SEARCH_INPUT_ID}
        className={styles.field}
        type="search"
        placeholder="Search..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search saves"
      />
    </Input.Root>
  );
}
