import {
  IconMagnifierFill18 as Magnifier,
  IconPlusFill18 as Plus,
} from "@pond/icons/fill/18";
import { Button, Input, Toolbar as PondToolbar, Tooltip } from "@pond/ui";
import { LibrarySwitcher } from "@/components/library-switcher";
import { ViewMenu } from "@/components/library-view-menu";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { usePlatform } from "@/lib/platform";
import { SEARCH_INPUT_ID } from "./constants";
import styles from "./styles.module.css";

export function Toolbar() {
  const platform = usePlatform();
  const trafficLightInset = platform === "mac" ? 72 : 0;

  const [value, setValue] = useDebouncedSearch(200);

  return (
    <PondToolbar.Root style={{ paddingInlineStart: trafficLightInset }}>
      <PondToolbar.Row>
        <PondToolbar.Group fill={true}></PondToolbar.Group>

        <PondToolbar.Group className={styles.center}>
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

          <ViewMenu />
        </PondToolbar.Group>

        <PondToolbar.Group fill={true} align="end">
          <Tooltip label="New" side="bottom">
            <Button icon variant="primary">
              <Plus />
            </Button>
          </Tooltip>
          <LibrarySwitcher />
        </PondToolbar.Group>
      </PondToolbar.Row>
    </PondToolbar.Root>
  );
}
