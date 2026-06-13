import { IconMagnifierFill18 as Magnifier } from "@pond/icons/fill/18";
import { Input, Toolbar as PondToolbar } from "@pond/ui";
import { PondSwitcher } from "@/components/library-pond-switcher";
import { SavedViews } from "@/components/library-saved-views";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { usePlatform } from "@/lib/platform";
import { SEARCH_INPUT_ID } from "./constants";
import styles from "./styles.module.css";

export function Toolbar() {
  const platform = usePlatform();
  // On macOS the toolbar must clear the traffic-light buttons.
  const trafficLightInset = platform === "mac" ? 72 : 0;

  return (
    <PondToolbar.Root style={{ paddingInlineStart: trafficLightInset }}>
      <PondToolbar.Row className={styles.row}>
        <PondToolbar.Group fill={true} className={styles.side}>
          <PondSwitcher compact className={styles.switcher} />
          <SavedViews />
        </PondToolbar.Group>
        <PondToolbar.Group className={styles.center}>
          <Search />
        </PondToolbar.Group>
        {/* Balances the left group so search stays centred. */}
        <PondToolbar.Group fill={true} className={styles.sideEnd} />
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
